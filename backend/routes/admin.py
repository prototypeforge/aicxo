from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from database.postgres import get_db
from database.mongodb import get_database
from models.user import User
from schemas.user import UserResponse, UserUpdate
from auth.security import get_current_admin_user, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    users = db.query(User).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    # Also delete user's data from MongoDB
    mongo_db = get_database()
    await mongo_db.meetings.delete_many({"user_id": user_id})
    await mongo_db.opinions.delete_many({"user_id": user_id})
    await mongo_db.company_files.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}


# Settings management
@router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_admin_user)):
    """Get admin settings."""
    db = get_database()
    settings = await db.settings.find().to_list(100)
    
    # Don't expose full API key
    result = {}
    for setting in settings:
        key = setting['key']
        value = setting['value']
        if key == 'openai_api_key' and value:
            result[key] = f"sk-...{value[-4:]}"
        else:
            result[key] = value
    
    return result


@router.put("/settings")
async def update_settings(
    settings_data: dict,
    current_user: User = Depends(get_current_admin_user)
):
    """Update admin settings."""
    db = get_database()
    
    for key, value in settings_data.items():
        await db.settings.update_one(
            {"key": key},
            {"$set": {"key": key, "value": value}},
            upsert=True
        )
    
    return {"message": "Settings updated successfully"}

