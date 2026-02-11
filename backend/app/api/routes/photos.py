"""
Office Bridge - Photo Routes
Photo documentation with annotations
"""
import os
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core import get_db, get_current_user
from app.core.config import settings
from app.models import Photo
from app.schemas import PhotoUpdate, PhotoResponse, PhotoListResponse

router = APIRouter(prefix="/photos", tags=["Photos"])


@router.get("", response_model=PhotoListResponse)
async def list_photos(
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    area: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List photos with filters"""
    query = select(Photo)
    
    if project_id:
        query = query.where(Photo.project_id == project_id)
    if category:
        query = query.where(Photo.category == category)
    if area:
        query = query.where(Photo.area == area)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(Photo.created_at.desc())
    result = await db.execute(query)
    photos = result.scalars().all()
    
    return PhotoListResponse(photos=photos, total=total)


@router.post("", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    location: Optional[str] = Form(None),
    area: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload a photo with metadata"""
    # Validate file type
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_IMAGE_TYPES}"
        )
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, "photos", unique_name)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create database record
    photo = Photo(
        project_id=project_id,
        file_name=file.filename or unique_name,
        file_path=file_path,
        location=location,
        area=area,
        caption=caption,
        category=category,
        taken_at=datetime.utcnow(),
        taken_by_id=int(current_user["sub"])
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    
    return photo


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific photo"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return photo


@router.patch("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: int,
    data: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update photo metadata and annotations"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(photo, field, value)
    
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a photo"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file if exists
    if os.path.exists(photo.file_path):
        os.remove(photo.file_path)
    
    await db.delete(photo)
    await db.commit()
