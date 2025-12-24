from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import base64

from database.mongodb import get_database
from models.user import User
from schemas.agent import CompanyFileResponse
from auth.security import get_current_user
from services.file_extraction import extract_content_from_file, get_supported_extensions

router = APIRouter(prefix="/api/files", tags=["Company Files"])

# Maximum file size (100MB)
MAX_FILE_SIZE = 100 * 1024 * 1024

# Image MIME types that should be stored as raw data for vision models
IMAGE_MIME_TYPES = {
    "image/png",
    "image/jpeg", 
    "image/jpg",
    "image/gif",
    "image/webp",
}

# Document MIME types that should be stored as raw data for direct model input
DOCUMENT_MIME_TYPES = {
    "application/pdf",
}


def is_image_file(mime_type: str) -> bool:
    """Check if a MIME type is an image."""
    return mime_type in IMAGE_MIME_TYPES or mime_type.startswith("image/")


def is_direct_input_file(mime_type: str) -> bool:
    """Check if a MIME type can be passed directly to AI models."""
    return is_image_file(mime_type) or mime_type in DOCUMENT_MIME_TYPES


def serialize_file(file: dict, include_raw: bool = False) -> dict:
    """Convert MongoDB file document to response format."""
    content = file.get('content', '')
    result = {
        'id': str(file['_id']),
        'filename': file.get('filename', ''),
        'file_type': file.get('file_type', ''),
        'description': file.get('description', ''),
        'content': content[:500] + '...' if len(content) > 500 else content,
        'original_filename': file.get('original_filename', file.get('filename', '')),
        'file_size': file.get('file_size', 0),
        'mime_type': file.get('mime_type', ''),
        'detected_category': file.get('detected_category', ''),
        'extraction_status': file.get('extraction_status', 'success'),
        'has_raw_data': bool(file.get('raw_data')),
        'created_at': file.get('created_at', datetime.utcnow()).isoformat() if isinstance(file.get('created_at'), datetime) else file.get('created_at', ''),
    }
    return result


def serialize_file_for_ai(file: dict) -> dict:
    """Serialize file for AI processing, including raw data for images."""
    return {
        'filename': file.get('filename', ''),
        'file_type': file.get('file_type', ''),
        'mime_type': file.get('mime_type', ''),
        'content': file.get('content', ''),
        'raw_data': file.get('raw_data'),  # Base64 encoded for images
    }


@router.get("", response_model=List[dict])
async def get_my_files(current_user: User = Depends(get_current_user)):
    """Get all company files for the current user."""
    db = get_database()
    files = await db.company_files.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_file(f) for f in files]


@router.get("/for-ai")
async def get_files_for_ai(current_user: User = Depends(get_current_user)):
    """Get all company files for AI processing (includes raw image data)."""
    db = get_database()
    files = await db.company_files.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_file_for_ai(f) for f in files]


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "extensions": get_supported_extensions(),
        "max_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "categories": {
            "documents": [".pdf", ".docx", ".doc", ".txt", ".md"],
            "spreadsheets": [".xlsx", ".xls", ".csv"],
            "images": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"],
            "presentations": [".pptx", ".ppt"],
            "data": [".json", ".xml", ".html"]
        },
        "direct_input_supported": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"],
        "note": "Images and PDFs are passed directly to capable AI models (GPT-4o, GPT-4o-mini)"
    }


@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form("report"),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a company file with automatic text extraction.
    
    For images: Raw data is stored and passed directly to vision-capable AI models.
    For documents: Text is extracted and stored for AI analysis.
    
    Supported formats:
    - PDF documents
    - Word documents (.docx, .doc)
    - Excel spreadsheets (.xlsx, .xls, .csv)
    - Images (passed directly to vision models, with OCR fallback)
    - Text files (.txt, .md, .json, .xml, etc.)
    """
    db = get_database()
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )
    
    mime_type = file.content_type or "application/octet-stream"
    
    # Extract text content from the file
    extracted_text, detected_category = extract_content_from_file(
        content, 
        file.filename or "unknown",
        mime_type
    )
    
    # Determine extraction status
    extraction_status = "success"
    if extracted_text.startswith("[") and "not available" in extracted_text.lower():
        extraction_status = "partial"
    elif extracted_text.startswith("[Error"):
        extraction_status = "error"
    
    # For images and PDFs, store raw data as base64 for direct model input
    raw_data = None
    if is_direct_input_file(mime_type):
        raw_data = base64.b64encode(content).decode('utf-8')
        # Update extraction status - files with raw data are always "success" for capable models
        extraction_status = "success"
        if is_image_file(mime_type):
            if not extracted_text or extracted_text.startswith("["):
                extracted_text = f"[Image file: {file.filename}. This image will be analyzed directly by vision-capable AI models (GPT-4o, GPT-4o-mini).]"
        elif mime_type == "application/pdf":
            # Keep extracted text as fallback, but note direct input capability
            extracted_text = f"[PDF file: {file.filename}. This PDF will be passed directly to capable AI models (GPT-4o, GPT-4o-mini).]\n\n--- Extracted text fallback ---\n{extracted_text}"
    
    # Create file document
    file_doc = {
        "user_id": current_user.id,
        "filename": file.filename or "Untitled",
        "original_filename": file.filename,
        "file_type": file_type,
        "mime_type": mime_type,
        "file_size": len(content),
        "content": extracted_text,
        "raw_data": raw_data,  # Base64 encoded for images
        "detected_category": detected_category,
        "description": description or "",
        "extraction_status": extraction_status,
        "created_at": datetime.utcnow()
    }
    
    result = await db.company_files.insert_one(file_doc)
    file_doc['_id'] = result.inserted_id
    
    return serialize_file(file_doc)


@router.post("", response_model=dict)
async def create_file_from_text(
    filename: str = Form(...),
    file_type: str = Form("report"),
    content: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Create a company file from pasted text content (legacy support)."""
    db = get_database()
    
    file_doc = {
        "user_id": current_user.id,
        "filename": filename,
        "original_filename": filename,
        "file_type": file_type,
        "mime_type": "text/plain",
        "file_size": len(content.encode('utf-8')),
        "content": content[:100000],
        "raw_data": None,
        "detected_category": "text",
        "description": description or "",
        "extraction_status": "success",
        "created_at": datetime.utcnow()
    }
    
    result = await db.company_files.insert_one(file_doc)
    file_doc['_id'] = result.inserted_id
    
    return serialize_file(file_doc)


@router.get("/{file_id}", response_model=dict)
async def get_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific company file with full content."""
    db = get_database()
    
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    file = await db.company_files.find_one({
        "_id": ObjectId(file_id),
        "user_id": current_user.id
    })
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    result = {
        'id': str(file['_id']),
        'filename': file.get('filename', ''),
        'file_type': file.get('file_type', ''),
        'description': file.get('description', ''),
        'content': file.get('content', ''),
        'original_filename': file.get('original_filename', file.get('filename', '')),
        'file_size': file.get('file_size', 0),
        'mime_type': file.get('mime_type', ''),
        'detected_category': file.get('detected_category', ''),
        'extraction_status': file.get('extraction_status', 'success'),
        'has_raw_data': bool(file.get('raw_data')),
        'created_at': file.get('created_at', datetime.utcnow()).isoformat() if isinstance(file.get('created_at'), datetime) else file.get('created_at', ''),
    }
    return result


@router.get("/{file_id}/preview")
async def get_file_preview(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get file preview - for images returns base64 data URL."""
    db = get_database()
    
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    file = await db.company_files.find_one({
        "_id": ObjectId(file_id),
        "user_id": current_user.id
    })
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    mime_type = file.get('mime_type', '')
    raw_data = file.get('raw_data')
    
    if raw_data and is_image_file(mime_type):
        return {
            "type": "image",
            "mime_type": mime_type,
            "data_url": f"data:{mime_type};base64,{raw_data}"
        }
    elif raw_data and mime_type == "application/pdf":
        return {
            "type": "pdf",
            "mime_type": mime_type,
            "data_url": f"data:{mime_type};base64,{raw_data}",
            "extracted_text": file.get('content', '')
        }
    else:
        return {
            "type": "text",
            "content": file.get('content', '')
        }


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
