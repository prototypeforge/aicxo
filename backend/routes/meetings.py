from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import asyncio
import uuid

from database.mongodb import get_database
from models.user import User
from schemas.agent import MeetingCreate, MeetingResponse, FollowUpCreate, FollowUpResponse, MeetingFileResponse, OpinionVersion
from auth.security import get_current_user
from services.openai_service import (
    generate_agent_opinion, 
    generate_chair_summary, 
    generate_follow_up_response,
    clear_debug_logs,
    get_debug_logs,
    add_debug_log
)

router = APIRouter(prefix="/api/meetings", tags=["Board Meetings"])


def serialize_meeting(meeting: dict) -> dict:
    """Convert MongoDB meeting document to response format."""
    meeting['id'] = str(meeting['_id'])
    del meeting['_id']
    return meeting


@router.get("", response_model=List[MeetingResponse])
async def get_my_meetings(current_user: User = Depends(get_current_user)):
    """Get all meetings for the current user."""
    db = get_database()
    meetings = await db.meetings.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_meeting(meeting) for meeting in meetings]


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": current_user.id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return serialize_meeting(meeting)


@router.post("", response_model=MeetingResponse)
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new board meeting - all hired agents will deliberate on the question."""
    db = get_database()
    
    # Clear debug logs at the start of meeting creation
    clear_debug_logs()
    add_debug_log("system", "Meeting System", "info", "Starting meeting creation", {
        "user_id": current_user.id,
        "question_length": len(meeting_data.question)
    })
    
    # Get user's hired agents
    hired_ids = current_user.hired_agents or []
    if not hired_ids:
        raise HTTPException(
            status_code=400,
            detail="You haven't hired any board members yet. Go to settings to hire agents."
        )
    
    object_ids = [ObjectId(id) for id in hired_ids if ObjectId.is_valid(id)]
    agents = await db.agents.find({
        "_id": {"$in": object_ids},
        "is_active": True,
        "is_chair": {"$ne": True}  # Exclude chair from regular agents
    }).to_list(100)
    
    if not agents:
        raise HTTPException(
            status_code=400,
            detail="No active agents found in your board."
        )
    
    add_debug_log("system", "Meeting System", "info", f"Found {len(agents)} agents for meeting", {
        "agent_names": [a.get('name') for a in agents],
        "agent_models": [a.get('model') for a in agents]
    })
    
    # Get user's company files for context
    company_files = await db.company_files.find(
        {"user_id": current_user.id}
    ).to_list(20)
    
    add_debug_log("system", "Meeting System", "info", f"Loaded {len(company_files)} company files for context")
    
    # Create the meeting record first to get the ID
    meeting = {
        "user_id": current_user.id,
        "question": meeting_data.question,
        "context": meeting_data.context,
        "opinions": [],
        "chair_summary": "",
        "chair_recommendation": "",
        "status": "in_progress",
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "total_tokens_used": 0,
        "total_cost_usd": 0,
        "current_version": 1,
        "opinion_history": [],
        "follow_ups": [],
        "attached_files": [],
        "debug_logs": []
    }
    
    result = await db.meetings.insert_one(meeting)
    meeting_id = str(result.inserted_id)
    
    add_debug_log("system", "Meeting System", "info", f"Created meeting record", {"meeting_id": meeting_id})
    
    # Generate opinions from all agents concurrently
    opinion_tasks = [
        generate_agent_opinion(
            agent, 
            meeting_data.question, 
            meeting_data.context, 
            company_files,
            current_user.id,
            meeting_id
        )
        for agent in agents
    ]
    
    opinions = await asyncio.gather(*opinion_tasks)
    
    # Check for errors in opinions
    errors_found = sum(1 for op in opinions if op.get('error'))
    empty_opinions = sum(1 for op in opinions if not op.get('opinion') or op.get('opinion', '').startswith('Error'))
    
    add_debug_log("system", "Meeting System", "info", f"All agent opinions generated", {
        "total_agents": len(opinions),
        "errors": errors_found,
        "empty_or_error_opinions": empty_opinions
    })
    
    # Calculate total tokens for agents
    total_agent_tokens = sum(op.get('tokens_used', 0) for op in opinions)
    
    # Store individual opinions in the opinions collection as well
    for opinion in opinions:
        opinion_doc = {
            **opinion,
            "meeting_id": meeting_id,
            "user_id": current_user.id
        }
        await db.opinions.insert_one(opinion_doc)
    
    # Generate chair's summary (pass company files for vision models)
    chair_result = await generate_chair_summary(
        meeting_data.question,
        meeting_data.context,
        opinions,
        current_user.id,
        meeting_id,
        company_files
    )
    
    # Calculate total tokens
    total_tokens = total_agent_tokens + chair_result.get('tokens_used', 0)
    
    # Get total cost from usage records
    usage_records = await db.token_usage.find({"meeting_id": meeting_id}).to_list(100)
    total_cost = sum(r.get('cost_usd', 0) for r in usage_records)
    
    # Collect all debug logs
    debug_logs = get_debug_logs()
    
    add_debug_log("system", "Meeting System", "info", "Meeting generation completed", {
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 6),
        "total_log_entries": len(debug_logs) + 1
    })
    
    # Get final debug logs (including the completion message)
    final_debug_logs = get_debug_logs()
    
    # Update meeting with all opinions and chair's summary
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$set": {
                "opinions": opinions,
                "chair_summary": chair_result['summary'],
                "chair_recommendation": chair_result['recommendation'],
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "total_tokens_used": total_tokens,
                "total_cost_usd": round(total_cost, 6),
                "debug_logs": final_debug_logs
            }
        }
    )
    
    # Fetch the updated meeting
    updated_meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    return serialize_meeting(updated_meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a meeting."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    result = await db.meetings.delete_one({
        "_id": ObjectId(meeting_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Also delete associated opinions
    await db.opinions.delete_many({"meeting_id": meeting_id})
    
    return {"message": "Meeting deleted successfully"}


@router.post("/{meeting_id}/regenerate", response_model=MeetingResponse)
async def regenerate_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    """Regenerate a meeting with current agent configurations (admin only).
    Saves previous version to history and reprocesses all follow-up questions."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can regenerate meetings"
        )
    
    db = get_database()
    
    # Clear debug logs at the start
    clear_debug_logs()
    add_debug_log("system", "Meeting System", "info", "Starting meeting regeneration", {
        "meeting_id": meeting_id,
        "admin_user_id": current_user.id
    })
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    # Get the original meeting
    meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get the meeting owner's hired agents
    from database.postgres import get_db
    
    meeting_user_id = meeting['user_id']
    
    db_session = next(get_db())
    meeting_owner = db_session.query(User).filter(User.id == meeting_user_id).first()
    db_session.close()
    
    if not meeting_owner:
        raise HTTPException(status_code=404, detail="Meeting owner not found")
    
    hired_ids = meeting_owner.hired_agents or []
    if not hired_ids:
        raise HTTPException(
            status_code=400,
            detail="The meeting owner hasn't hired any board members."
        )
    
    object_ids = [ObjectId(id) for id in hired_ids if ObjectId.is_valid(id)]
    agents = await db.agents.find({
        "_id": {"$in": object_ids},
        "is_active": True,
        "is_chair": {"$ne": True}
    }).to_list(100)
    
    if not agents:
        raise HTTPException(
            status_code=400,
            detail="No active agents found in the board."
        )
    
    add_debug_log("system", "Meeting System", "info", f"Found {len(agents)} agents for regeneration", {
        "agent_names": [a.get('name') for a in agents],
        "agent_models": [a.get('model') for a in agents]
    })
    
    # Get company files for context
    company_files = await db.company_files.find(
        {"user_id": meeting_user_id}
    ).to_list(20)
    
    # Save current version to history before regenerating
    current_version = meeting.get('current_version', 1)
    opinion_history = meeting.get('opinion_history', [])
    
    # Create historical version from current state
    if meeting.get('opinions') and meeting.get('status') == 'completed':
        historical_version = {
            "version": current_version,
            "opinions": meeting.get('opinions', []),
            "chair_summary": meeting.get('chair_summary', ''),
            "chair_recommendation": meeting.get('chair_recommendation', ''),
            "follow_ups": meeting.get('follow_ups', []),
            "generated_at": meeting.get('completed_at') or meeting.get('created_at'),
            "generated_by": meeting.get('regenerated_by')
        }
        opinion_history.append(historical_version)
    
    new_version = current_version + 1
    
    add_debug_log("system", "Meeting System", "info", f"Creating version {new_version}", {
        "previous_version": current_version,
        "history_count": len(opinion_history)
    })
    
    # Update meeting status to in_progress
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": {
            "status": "in_progress",
            "opinions": [],
            "opinion_history": opinion_history,
            "current_version": new_version
        }}
    )
    
    # Generate new opinions from all agents concurrently
    opinion_tasks = [
        generate_agent_opinion(
            agent, 
            meeting['question'], 
            meeting.get('context'), 
            company_files,
            meeting_user_id,
            meeting_id
        )
        for agent in agents
    ]
    
    opinions = await asyncio.gather(*opinion_tasks)
    
    # Check for errors in opinions
    errors_found = sum(1 for op in opinions if op.get('error'))
    empty_opinions = sum(1 for op in opinions if not op.get('opinion') or op.get('opinion', '').startswith('Error'))
    
    add_debug_log("system", "Meeting System", "info", f"All agent opinions regenerated", {
        "total_agents": len(opinions),
        "errors": errors_found,
        "empty_or_error_opinions": empty_opinions
    })
    
    # Calculate total tokens for agents
    total_agent_tokens = sum(op.get('tokens_used', 0) for op in opinions)
    
    # Store individual opinions with version
    for opinion in opinions:
        opinion_doc = {
            **opinion,
            "meeting_id": meeting_id,
            "user_id": meeting_user_id,
            "version": new_version
        }
        await db.opinions.insert_one(opinion_doc)
    
    # Generate chair's summary (pass company files for vision models)
    chair_result = await generate_chair_summary(
        meeting['question'],
        meeting.get('context'),
        opinions,
        meeting_user_id,
        meeting_id,
        company_files
    )
    
    # Reprocess all follow-up questions with new opinions
    old_follow_ups = meeting.get('follow_ups', [])
    new_follow_ups = []
    
    for follow_up in old_follow_ups:
        # Generate new Chair response for each follow-up
        new_chair_response = await generate_follow_up_response(
            original_question=meeting['question'],
            original_recommendation=chair_result['recommendation'],
            opinions=opinions,
            follow_up_question=follow_up['question'],
            user_id=meeting_user_id,
            meeting_id=meeting_id
        )
        
        new_follow_ups.append({
            "id": follow_up['id'],
            "question": follow_up['question'],
            "chair_response": new_chair_response,
            "created_at": follow_up['created_at'],
            "version": new_version
        })
    
    # Calculate total tokens
    total_tokens = total_agent_tokens + chair_result.get('tokens_used', 0)
    
    # Get total cost from usage records for this regeneration
    usage_records = await db.token_usage.find({
        "meeting_id": meeting_id,
        "timestamp": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0)}
    }).to_list(100)
    total_cost = sum(r.get('cost_usd', 0) for r in usage_records)
    
    # Collect all debug logs
    final_debug_logs = get_debug_logs()
    
    add_debug_log("system", "Meeting System", "info", "Meeting regeneration completed", {
        "new_version": new_version,
        "total_tokens": total_tokens,
        "total_log_entries": len(final_debug_logs) + 1
    })
    
    # Get final debug logs
    final_debug_logs = get_debug_logs()
    
    # Update meeting with new opinions, chair's summary, and reprocessed follow-ups
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$set": {
                "opinions": opinions,
                "chair_summary": chair_result['summary'],
                "chair_recommendation": chair_result['recommendation'],
                "follow_ups": new_follow_ups,
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "total_tokens_used": meeting.get('total_tokens_used', 0) + total_tokens,
                "total_cost_usd": round(meeting.get('total_cost_usd', 0) + total_cost, 6),
                "regenerated_at": datetime.utcnow(),
                "regenerated_by": current_user.id,
                "debug_logs": final_debug_logs
            }
        }
    )
    
    # Fetch the updated meeting
    updated_meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    return serialize_meeting(updated_meeting)


@router.get("/{meeting_id}/history", response_model=List[OpinionVersion])
async def get_opinion_history(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all historical versions of opinions for a meeting."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": current_user.id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get history and add current version
    history = meeting.get('opinion_history', [])
    
    # Add current version to the list
    if meeting.get('status') == 'completed':
        current = {
            "version": meeting.get('current_version', 1),
            "opinions": meeting.get('opinions', []),
            "chair_summary": meeting.get('chair_summary', ''),
            "chair_recommendation": meeting.get('chair_recommendation', ''),
            "follow_ups": meeting.get('follow_ups', []),
            "generated_at": meeting.get('completed_at') or meeting.get('created_at'),
            "generated_by": meeting.get('regenerated_by')
        }
        history.append(current)
    
    return history


@router.post("/{meeting_id}/restore/{version}")
async def restore_opinion_version(
    meeting_id: str,
    version: int,
    current_user: User = Depends(get_current_user)
):
    """Restore a previous version of opinions (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can restore opinion versions"
        )
    
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Find the requested version in history
    history = meeting.get('opinion_history', [])
    target_version = None
    
    for v in history:
        if v.get('version') == version:
            target_version = v
            break
    
    if not target_version:
        raise HTTPException(status_code=404, detail=f"Version {version} not found in history")
    
    # Save current to history first
    current_version = meeting.get('current_version', 1)
    if meeting.get('opinions') and meeting.get('status') == 'completed':
        current_historical = {
            "version": current_version,
            "opinions": meeting.get('opinions', []),
            "chair_summary": meeting.get('chair_summary', ''),
            "chair_recommendation": meeting.get('chair_recommendation', ''),
            "follow_ups": meeting.get('follow_ups', []),
            "generated_at": meeting.get('completed_at'),
            "generated_by": meeting.get('regenerated_by')
        }
        # Only add if not already in history
        if not any(h.get('version') == current_version for h in history):
            history.append(current_historical)
    
    # Restore the target version
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$set": {
                "opinions": target_version.get('opinions', []),
                "chair_summary": target_version.get('chair_summary', ''),
                "chair_recommendation": target_version.get('chair_recommendation', ''),
                "follow_ups": target_version.get('follow_ups', []),
                "current_version": version,
                "opinion_history": history,
                "restored_at": datetime.utcnow(),
                "restored_by": current_user.id
            }
        }
    )
    
    updated_meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    return serialize_meeting(updated_meeting)


# Follow-up Questions

@router.post("/{meeting_id}/follow-up", response_model=FollowUpResponse)
async def add_follow_up_question(
    meeting_id: str,
    follow_up: FollowUpCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a follow-up question to a meeting and get Chair's response."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": current_user.id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Can only add follow-ups to completed meetings")
    
    # Generate Chair's response to the follow-up
    chair_response = await generate_follow_up_response(
        original_question=meeting['question'],
        original_recommendation=meeting.get('chair_recommendation', ''),
        opinions=meeting.get('opinions', []),
        follow_up_question=follow_up.question,
        user_id=current_user.id,
        meeting_id=meeting_id
    )
    
    follow_up_doc = {
        "id": str(uuid.uuid4()),
        "question": follow_up.question,
        "chair_response": chair_response,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Add to meeting's follow_ups array
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {"$push": {"follow_ups": follow_up_doc}}
    )
    
    return follow_up_doc


# File Attachments

@router.post("/{meeting_id}/files", response_model=MeetingFileResponse)
async def attach_file_to_meeting(
    meeting_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Attach a file to an existing meeting."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": current_user.id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Read file content
    content = await file.read()
    
    # Determine file type
    file_type = file.content_type or "unknown"
    
    file_doc = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "file_type": file_type,
        "content": content.decode('utf-8', errors='ignore')[:50000],  # Store first 50k chars
        "uploaded_at": datetime.utcnow().isoformat()
    }
    
    # Add to meeting's attached_files array
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {"$push": {"attached_files": file_doc}}
    )
    
    # Return without content for response
    return {
        "id": file_doc["id"],
        "filename": file_doc["filename"],
        "file_type": file_doc["file_type"],
        "uploaded_at": file_doc["uploaded_at"]
    }


@router.delete("/{meeting_id}/files/{file_id}")
async def remove_file_from_meeting(
    meeting_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove an attached file from a meeting."""
    db = get_database()
    
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    result = await db.meetings.update_one(
        {
            "_id": ObjectId(meeting_id),
            "user_id": current_user.id
        },
        {"$pull": {"attached_files": {"id": file_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File removed successfully"}
