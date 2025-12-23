from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from datetime import datetime
from bson import ObjectId

from database.mongodb import get_database
from models.user import User
from schemas.agent import CompanyFileCreate, CompanyFileResponse
from auth.security import get_current_user

router = APIRouter(prefix="/api/files", tags=["Company Files"])


def serialize_file(file: dict) -> dict:
    """Convert MongoDB file document to response format."""
    file['id'] = str(file['_id'])
    del file['_id']
    return file


@router.get("", response_model=List[CompanyFileResponse])
async def get_my_files(current_user: User = Depends(get_current_user)):
    """Get all company files for the current user."""
    db = get_database()
    files = await db.company_files.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_file(f) for f in files]


@router.post("", response_model=CompanyFileResponse)
async def upload_file(
    file_data: CompanyFileCreate,
    current_user: User = Depends(get_current_user)
):
    """Upload a company file (as text content)."""
    db = get_database()
    
    file_doc = {
        "user_id": current_user.id,
        "filename": file_data.filename,
        "file_type": file_data.file_type,
        "content": file_data.content,
        "description": file_data.description,
        "created_at": datetime.utcnow()
    }
    
    result = await db.company_files.insert_one(file_doc)
    file_doc['id'] = str(result.inserted_id)
    
    return file_doc


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a company file."""
    db = get_database()
    
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    result = await db.company_files.delete_one({
        "_id": ObjectId(file_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}

