"""
File Upload Routes - Supports local storage or S3/DigitalOcean Spaces
Set USE_S3=true in .env to use cloud storage
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, RedirectResponse
from typing import Optional
import os
import uuid
from datetime import datetime
import shutil

from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import User

router = APIRouter(prefix="/files", tags=["files"])

# Check if using S3
USE_S3 = os.getenv("USE_S3", "false").lower() == "true"

# S3 client (only initialize if needed)
s3_client = None
S3_BUCKET = None
S3_CDN_URL = None

if USE_S3:
    try:
        import boto3
        from botocore.config import Config
        
        s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv("S3_ENDPOINT"),  # For DigitalOcean Spaces
            aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
            region_name=os.getenv("S3_REGION", "us-east-1"),
            config=Config(signature_version='s3v4')
        )
        S3_BUCKET = os.getenv("S3_BUCKET")
        S3_CDN_URL = os.getenv("S3_CDN_URL", "")  # Optional CDN URL
        print(f"✅ S3 configured: {S3_BUCKET}")
    except Exception as e:
        print(f"⚠️ S3 configuration failed: {e}")
        USE_S3 = False

# Local upload directory
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename)[1].lower() if filename else ""


def generate_filename(original_filename: str, user_id: int, file_type: str) -> str:
    """Generate unique filename with path"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{file_type}/u{user_id}_{timestamp}_{unique_id}{ext}"


def get_content_type(ext: str) -> str:
    """Get content type from extension"""
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    return content_types.get(ext, "application/octet-stream")


async def upload_to_s3(file_content: bytes, key: str, ext: str) -> str:
    """Upload file to S3/Spaces and return URL"""
    content_type = get_content_type(ext)
    
    # Upload to S3
    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=file_content,
        ContentType=content_type,
        ACL='public-read',  # Make publicly accessible
    )
    
    # Return URL
    if S3_CDN_URL:
        return f"{S3_CDN_URL}/{key}"
    else:
        return f"https://{S3_BUCKET}.s3.amazonaws.com/{key}"


async def upload_to_local(file_content: bytes, key: str) -> str:
    """Upload file to local storage and return path"""
    file_path = os.path.join(UPLOAD_DIR, key)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    return f"/api/files/{key}"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = "photo",  # photo, document, packing_slip
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file to storage (S3 or local).
    Returns the URL to access the file.
    """
    # Validate file type
    allowed_extensions = {
        "photo": [".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"],
        "document": [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
        "packing_slip": [".jpg", ".jpeg", ".png", ".pdf"],
    }
    
    ext = get_file_extension(file.filename or "")
    if ext not in allowed_extensions.get(type, []):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {allowed_extensions.get(type, [])}"
        )
    
    # Check file size (max 10MB for photos, 25MB for documents)
    max_size = 10 * 1024 * 1024 if type == "photo" else 25 * 1024 * 1024
    
    # Read file content
    content = await file.read()
    size = len(content)
    
    if size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {max_size // (1024*1024)}MB"
        )
    
    # Generate unique filename
    key = generate_filename(file.filename or "upload", current_user.id, type)
    
    # Upload to appropriate storage
    if USE_S3:
        url = await upload_to_s3(content, key, ext)
    else:
        url = await upload_to_local(content, key)
    
    return {
        "success": True,
        "filename": os.path.basename(key),
        "key": key,
        "url": url,
        "type": type,
        "size": size,
        "storage": "s3" if USE_S3 else "local",
    }


@router.get("/{file_type}/{filename}")
async def get_file(
    file_type: str,
    filename: str,
):
    """
    Get/download a file.
    For S3, redirects to the S3 URL.
    For local, serves the file directly.
    """
    key = f"{file_type}/{filename}"
    
    if USE_S3:
        # Generate presigned URL or redirect to public URL
        if S3_CDN_URL:
            return RedirectResponse(f"{S3_CDN_URL}/{key}")
        else:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': key},
                ExpiresIn=3600  # 1 hour
            )
            return RedirectResponse(url)
    else:
        file_path = os.path.join(UPLOAD_DIR, key)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(file_path)


@router.delete("/{file_type}/{filename}")
async def delete_file(
    file_type: str,
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a file.
    Only the owner or admin can delete.
    """
    key = f"{file_type}/{filename}"
    
    # Check ownership (filename contains user ID)
    if f"u{current_user.id}_" not in filename and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    if USE_S3:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")
    else:
        file_path = os.path.join(UPLOAD_DIR, key)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        os.remove(file_path)
    
    return {"success": True, "message": "File deleted"}


@router.post("/upload-batch")
async def upload_batch(
    files: list[UploadFile] = File(...),
    type: str = "photo",
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload multiple files at once.
    """
    results = []
    
    for file in files:
        try:
            # Read file content
            content = await file.read()
            ext = get_file_extension(file.filename or "")
            
            # Validate
            allowed_extensions = {
                "photo": [".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"],
                "document": [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
                "packing_slip": [".jpg", ".jpeg", ".png", ".pdf"],
            }
            
            if ext not in allowed_extensions.get(type, []):
                results.append({
                    "success": False,
                    "filename": file.filename,
                    "error": f"Invalid file type: {ext}",
                })
                continue
            
            # Check size
            max_size = 10 * 1024 * 1024 if type == "photo" else 25 * 1024 * 1024
            if len(content) > max_size:
                results.append({
                    "success": False,
                    "filename": file.filename,
                    "error": "File too large",
                })
                continue
            
            # Generate key and upload
            key = generate_filename(file.filename or "upload", current_user.id, type)
            
            if USE_S3:
                url = await upload_to_s3(content, key, ext)
            else:
                url = await upload_to_local(content, key)
            
            results.append({
                "success": True,
                "filename": os.path.basename(key),
                "key": key,
                "url": url,
                "type": type,
                "size": len(content),
            })
            
        except Exception as e:
            results.append({
                "success": False,
                "filename": file.filename,
                "error": str(e),
            })
    
    return {
        "success": all(r.get("success") for r in results),
        "files": results,
        "uploaded": sum(1 for r in results if r.get("success")),
        "failed": sum(1 for r in results if not r.get("success")),
    }


@router.get("/storage-info")
async def storage_info(current_user: User = Depends(get_current_user)):
    """Get storage configuration info (for debugging)"""
    return {
        "storage_type": "s3" if USE_S3 else "local",
        "bucket": S3_BUCKET if USE_S3 else None,
        "upload_dir": UPLOAD_DIR if not USE_S3 else None,
    }
