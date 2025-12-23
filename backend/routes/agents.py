from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId

from database.mongodb import get_database
from models.user import User
from schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from auth.security import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/agents", tags=["Agents"])


def serialize_agent(agent: dict) -> dict:
    """Convert MongoDB agent document to response format."""
    agent['id'] = str(agent['_id'])
    del agent['_id']
    return agent


@router.get("", response_model=List[AgentResponse])
async def get_all_agents(current_user: User = Depends(get_current_user)):
    """Get all available agents (excluding chair)."""
    db = get_database()
    agents = await db.agents.find({
        "is_active": True,
        "is_chair": {"$ne": True}
    }).to_list(100)
    return [serialize_agent(agent) for agent in agents]


@router.get("/all")
async def get_all_agents_including_inactive(current_user: User = Depends(get_current_admin_user)):
    """Get all agents including inactive ones (admin only)."""
    db = get_database()
    agents = await db.agents.find({"is_chair": {"$ne": True}}).to_list(100)
    return [serialize_agent(agent) for agent in agents]


@router.get("/chair")
async def get_chair_agent(current_user: User = Depends(get_current_admin_user)):
    """Get the Chair of the Board agent configuration (admin only)."""
    db = get_database()
    chair = await db.agents.find_one({"is_chair": True})
    
    if not chair:
        # Return default chair configuration
        return {
            "id": "chair",
            "name": "Board Chair",
            "role": "Chair of the Board",
            "system_prompt": """You are the Chair of the Board of Directors. Your role is to synthesize the opinions of all board members and provide a unified recommendation.

You must:
1. Consider all perspectives presented by board members
2. Weigh opinions based on their confidence levels and relevance to their expertise
3. Identify areas of consensus and disagreement
4. Formulate a clear, actionable recommendation""",
            "model": "gpt-4",
            "avatar_color": "#f59e0b",
            "is_active": True,
            "is_chair": True,
            "weights": {
                "finance": 0.2,
                "technology": 0.2,
                "operations": 0.2,
                "people_hr": 0.2,
                "logistics": 0.2
            }
        }
    
    return serialize_agent(chair)


@router.put("/chair")
async def update_chair_agent(
    chair_update: AgentUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update the Chair of the Board agent (admin only)."""
    db = get_database()
    
    # Check if chair exists
    existing_chair = await db.agents.find_one({"is_chair": True})
    
    update_data = chair_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    update_data['is_chair'] = True
    update_data['role'] = "Chair of the Board"  # Always keep this role
    
    if existing_chair:
        # Update existing chair
        await db.agents.update_one(
            {"is_chair": True},
            {"$set": update_data}
        )
        updated_chair = await db.agents.find_one({"is_chair": True})
    else:
        # Create new chair agent
        chair_data = {
            "name": update_data.get("name", "Board Chair"),
            "role": "Chair of the Board",
            "system_prompt": update_data.get("system_prompt", ""),
            "weights": update_data.get("weights", {
                "finance": 0.2,
                "technology": 0.2,
                "operations": 0.2,
                "people_hr": 0.2,
                "logistics": 0.2
            }),
            "model": update_data.get("model", "gpt-4"),
            "avatar_color": update_data.get("avatar_color", "#f59e0b"),
            "is_active": True,
            "is_chair": True,
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.agents.insert_one(chair_data)
        updated_chair = await db.agents.find_one({"_id": result.inserted_id})
    
    return serialize_agent(updated_chair)


@router.get("/my-board", response_model=List[AgentResponse])
async def get_my_board(current_user: User = Depends(get_current_user)):
    """Get agents that the current user has hired for their board."""
    db = get_database()
    hired_ids = current_user.hired_agents or []
    
    if not hired_ids:
        return []
    
    object_ids = [ObjectId(id) for id in hired_ids if ObjectId.is_valid(id)]
    agents = await db.agents.find({
        "_id": {"$in": object_ids},
        "is_active": True,
        "is_chair": {"$ne": True}
    }).to_list(100)
    
    return [serialize_agent(agent) for agent in agents]


@router.post("/hire/{agent_id}")
async def hire_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db_session = Depends(lambda: None)
):
    """Hire an agent to the user's board."""
    from database.postgres import SessionLocal
    
    db = get_database()
    
    # Verify agent exists
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id), 
        "is_active": True,
        "is_chair": {"$ne": True}
    })
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update user's hired agents
    hired = list(current_user.hired_agents or [])
    if agent_id not in hired:
        hired.append(agent_id)
        
        pg_session = SessionLocal()
        try:
            user = pg_session.query(User).filter(User.id == current_user.id).first()
            user.hired_agents = hired
            pg_session.commit()
        finally:
            pg_session.close()
    
    return {"message": f"Agent {agent['name']} hired successfully", "hired_agents": hired}


@router.post("/fire/{agent_id}")
async def fire_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove an agent from the user's board."""
    from database.postgres import SessionLocal
    
    hired = list(current_user.hired_agents or [])
    if agent_id in hired:
        hired.remove(agent_id)
        
        pg_session = SessionLocal()
        try:
            user = pg_session.query(User).filter(User.id == current_user.id).first()
            user.hired_agents = hired
            pg_session.commit()
        finally:
            pg_session.close()
    
    return {"message": "Agent removed from board", "hired_agents": hired}


# Admin routes
@router.post("/admin", response_model=AgentResponse)
async def create_agent(
    agent_data: AgentCreate,
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new agent (admin only)."""
    db = get_database()
    
    agent_dict = agent_data.model_dump()
    agent_dict['created_by'] = current_user.id
    agent_dict['created_at'] = datetime.utcnow()
    agent_dict['updated_at'] = None
    agent_dict['is_chair'] = False  # Regular agents are not chair
    
    result = await db.agents.insert_one(agent_dict)
    agent_dict['id'] = str(result.inserted_id)
    
    return agent_dict


@router.put("/admin/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update an agent (admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    update_data = agent_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    result = await db.agents.update_one(
        {"_id": ObjectId(agent_id), "is_chair": {"$ne": True}},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = await db.agents.find_one({"_id": ObjectId(agent_id)})
    return serialize_agent(agent)


@router.delete("/admin/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Delete an agent (admin only)."""
    db = get_database()
    
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    # Don't allow deleting chair
    agent = await db.agents.find_one({"_id": ObjectId(agent_id)})
    if agent and agent.get('is_chair'):
        raise HTTPException(status_code=400, detail="Cannot delete Chair of the Board")
    
    result = await db.agents.delete_one({"_id": ObjectId(agent_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"message": "Agent deleted successfully"}
