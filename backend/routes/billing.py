from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

from database.mongodb import get_database
from database.postgres import get_db, SessionLocal
from models.user import User
from schemas.billing import (
    UsageRecord, UserUsageSummary, AgentUsageSummary, 
    BillingOverview, MODEL_PRICING, calculate_cost
)
from auth.security import get_current_user, get_current_admin_user
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/billing", tags=["Billing"])


def serialize_usage(record: dict) -> dict:
    """Convert MongoDB usage record to response format."""
    record['id'] = str(record['_id'])
    del record['_id']
    return record


@router.get("/my-usage", response_model=List[UsageRecord])
async def get_my_usage(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get current user's token usage history."""
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    records = await db.token_usage.find({
        "user_id": current_user.id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", -1).to_list(1000)
    
    return [serialize_usage(r) for r in records]


@router.get("/my-summary")
async def get_my_usage_summary(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get current user's usage summary with costs."""
    db = get_database()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {
            "$match": {
                "user_id": current_user.id,
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_prompt_tokens": {"$sum": "$prompt_tokens"},
                "total_completion_tokens": {"$sum": "$completion_tokens"},
                "total_tokens": {"$sum": "$total_tokens"},
                "total_cost_usd": {"$sum": "$cost_usd"},
                "request_count": {"$sum": 1}
            }
        }
    ]
    
    result = await db.token_usage.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0,
            "request_count": 0,
            "usage_by_model": {},
            "usage_by_agent": [],
            "period_days": days
        }
    
    summary = result[0]
    del summary['_id']
    
    # Get usage by model
    model_pipeline = [
        {
            "$match": {
                "user_id": current_user.id,
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": "$model",
                "total_tokens": {"$sum": "$total_tokens"},
                "total_cost_usd": {"$sum": "$cost_usd"},
                "request_count": {"$sum": 1}
            }
        }
    ]
    
    model_results = await db.token_usage.aggregate(model_pipeline).to_list(100)
    summary['usage_by_model'] = {
        r['_id']: {
            "tokens": r['total_tokens'],
            "cost_usd": round(r['total_cost_usd'], 4),
            "requests": r['request_count']
        }
        for r in model_results
    }
    
    # Get usage by agent
    agent_pipeline = [
        {
            "$match": {
                "user_id": current_user.id,
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {"agent_id": "$agent_id", "agent_name": "$agent_name", "agent_role": "$agent_role"},
                "model": {"$first": "$model"},
                "total_tokens": {"$sum": "$total_tokens"},
                "total_cost_usd": {"$sum": "$cost_usd"},
                "request_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_cost_usd": -1}}
    ]
    
    agent_results = await db.token_usage.aggregate(agent_pipeline).to_list(100)
    summary['usage_by_agent'] = [
        {
            "agent_id": r['_id']['agent_id'],
            "agent_name": r['_id']['agent_name'],
            "agent_role": r['_id']['agent_role'],
            "model": r['model'],
            "total_tokens": r['total_tokens'],
            "total_cost_usd": round(r['total_cost_usd'], 4),
            "request_count": r['request_count']
        }
        for r in agent_results
    ]
    
    summary['period_days'] = days
    summary['total_cost_usd'] = round(summary['total_cost_usd'], 4)
    
    return summary


# Admin billing endpoints
@router.get("/admin/overview")
async def get_billing_overview(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_admin_user)
):
    """Get overall billing overview for all users (admin only)."""
    db = get_database()
    pg_session = SessionLocal()
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Overall totals
        total_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": None,
                    "total_prompt_tokens": {"$sum": "$prompt_tokens"},
                    "total_completion_tokens": {"$sum": "$completion_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            }
        ]
        
        total_result = await db.token_usage.aggregate(total_pipeline).to_list(1)
        
        overview = {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0,
            "request_count": 0,
            "period_days": days,
            "period_start": start_date.isoformat(),
            "period_end": datetime.utcnow().isoformat()
        }
        
        if total_result:
            overview.update({
                "total_prompt_tokens": total_result[0]['total_prompt_tokens'],
                "total_completion_tokens": total_result[0]['total_completion_tokens'],
                "total_tokens": total_result[0]['total_tokens'],
                "total_cost_usd": round(total_result[0]['total_cost_usd'], 4),
                "request_count": total_result[0]['request_count']
            })
        
        # Usage by model
        model_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": "$model",
                    "prompt_tokens": {"$sum": "$prompt_tokens"},
                    "completion_tokens": {"$sum": "$completion_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"total_cost_usd": -1}}
        ]
        
        model_results = await db.token_usage.aggregate(model_pipeline).to_list(100)
        overview['usage_by_model'] = [
            {
                "model": r['_id'],
                "prompt_tokens": r['prompt_tokens'],
                "completion_tokens": r['completion_tokens'],
                "total_tokens": r['total_tokens'],
                "total_cost_usd": round(r['total_cost_usd'], 4),
                "request_count": r['request_count']
            }
            for r in model_results
        ]
        
        # Usage by user
        user_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": "$user_id",
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"total_cost_usd": -1}},
            {"$limit": 50}
        ]
        
        user_results = await db.token_usage.aggregate(user_pipeline).to_list(50)
        
        # Get usernames from PostgreSQL
        user_ids = [r['_id'] for r in user_results]
        users = pg_session.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: u.username for u in users}
        
        overview['usage_by_user'] = [
            {
                "user_id": r['_id'],
                "username": user_map.get(r['_id'], 'Unknown'),
                "total_tokens": r['total_tokens'],
                "total_cost_usd": round(r['total_cost_usd'], 4),
                "request_count": r['request_count']
            }
            for r in user_results
        ]
        
        # Usage by agent
        agent_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": {"agent_id": "$agent_id", "agent_name": "$agent_name", "agent_role": "$agent_role"},
                    "model": {"$first": "$model"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"total_cost_usd": -1}}
        ]
        
        agent_results = await db.token_usage.aggregate(agent_pipeline).to_list(100)
        overview['usage_by_agent'] = [
            {
                "agent_id": r['_id']['agent_id'],
                "agent_name": r['_id']['agent_name'],
                "agent_role": r['_id']['agent_role'],
                "model": r['model'],
                "total_tokens": r['total_tokens'],
                "total_cost_usd": round(r['total_cost_usd'], 4),
                "request_count": r['request_count']
            }
            for r in agent_results
        ]
        
        # Model pricing info
        overview['model_pricing'] = MODEL_PRICING
        
        return overview
        
    finally:
        pg_session.close()


@router.get("/admin/user/{user_id}")
async def get_user_billing(
    user_id: int,
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_admin_user)
):
    """Get detailed billing for a specific user (admin only)."""
    db = get_database()
    pg_session = SessionLocal()
    
    try:
        # Get user info
        user = pg_session.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all usage records
        records = await db.token_usage.find({
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1).to_list(1000)
        
        # Calculate totals
        total_tokens = sum(r['total_tokens'] for r in records)
        total_cost = sum(r['cost_usd'] for r in records)
        
        # Group by model
        usage_by_model = {}
        for r in records:
            model = r['model']
            if model not in usage_by_model:
                usage_by_model[model] = {"tokens": 0, "cost_usd": 0, "requests": 0}
            usage_by_model[model]['tokens'] += r['total_tokens']
            usage_by_model[model]['cost_usd'] += r['cost_usd']
            usage_by_model[model]['requests'] += 1
        
        # Group by agent
        usage_by_agent = {}
        for r in records:
            agent_id = r['agent_id']
            if agent_id not in usage_by_agent:
                usage_by_agent[agent_id] = {
                    "agent_id": agent_id,
                    "agent_name": r['agent_name'],
                    "agent_role": r['agent_role'],
                    "model": r['model'],
                    "tokens": 0,
                    "cost_usd": 0,
                    "requests": 0
                }
            usage_by_agent[agent_id]['tokens'] += r['total_tokens']
            usage_by_agent[agent_id]['cost_usd'] += r['cost_usd']
            usage_by_agent[agent_id]['requests'] += 1
        
        return {
            "user_id": user_id,
            "username": user.username,
            "email": user.email,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 4),
            "request_count": len(records),
            "period_days": days,
            "usage_by_model": {k: {**v, "cost_usd": round(v["cost_usd"], 4)} for k, v in usage_by_model.items()},
            "usage_by_agent": [
                {**v, "cost_usd": round(v["cost_usd"], 4)}
                for v in sorted(usage_by_agent.values(), key=lambda x: x['cost_usd'], reverse=True)
            ],
            "recent_usage": [serialize_usage(r) for r in records[:100]]
        }
        
    finally:
        pg_session.close()


@router.get("/pricing")
async def get_model_pricing():
    """Get current model pricing information."""
    return {
        "pricing": MODEL_PRICING,
        "note": "Prices are per 1,000 tokens in USD. Prompt and completion tokens are priced separately.",
        "last_updated": "2024-01-01"
    }

