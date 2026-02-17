"""
Feedback API Routes
Handles beta feedback submission from mobile app
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, BetaFeedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ============================================
# SCHEMAS
# ============================================

class FeedbackSubmit(BaseModel):
    type: str  # feature, bug, general
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    app_version: Optional[str] = None
    device_info: Optional[dict] = None
    screenshots: Optional[List[str]] = None  # base64 or URLs


class FeedbackSubmitResponse(BaseModel):
    id: int
    message: str
    status: str


class MyFeedbackItem(BaseModel):
    id: int
    type: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    created_at: datetime
    dev_response: Optional[str]
    responded_at: Optional[datetime]


# ============================================
# ENDPOINTS
# ============================================

@router.post("/", response_model=FeedbackSubmitResponse)
async def submit_feedback(
    feedback: FeedbackSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit feedback from the mobile app"""
    
    new_feedback = BetaFeedback(
        user_id=current_user.id,
        company_id=current_user.primary_company_id,
        type=feedback.type,
        title=feedback.title,
        description=feedback.description,
        priority=feedback.priority,
        status="submitted",
        app_version=feedback.app_version,
        device_info=feedback.device_info,
        screenshots=feedback.screenshots or []
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return FeedbackSubmitResponse(
        id=new_feedback.id,
        message="Thank you for your feedback! We'll review it soon.",
        status="submitted"
    )


@router.get("/my", response_model=List[MyFeedbackItem])
async def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all feedback submitted by the current user"""
    
    feedback_list = db.query(BetaFeedback).filter(
        BetaFeedback.user_id == current_user.id
    ).order_by(BetaFeedback.created_at.desc()).all()
    
    return [
        MyFeedbackItem(
            id=fb.id,
            type=fb.type,
            title=fb.title,
            description=fb.description,
            priority=fb.priority,
            status=fb.status,
            created_at=fb.created_at,
            dev_response=fb.dev_response,
            responded_at=fb.responded_at
        )
        for fb in feedback_list
    ]


@router.get("/{feedback_id}", response_model=MyFeedbackItem)
async def get_feedback_detail(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific feedback item"""
    
    feedback = db.query(BetaFeedback).filter(
        BetaFeedback.id == feedback_id,
        BetaFeedback.user_id == current_user.id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return MyFeedbackItem(
        id=feedback.id,
        type=feedback.type,
        title=feedback.title,
        description=feedback.description,
        priority=feedback.priority,
        status=feedback.status,
        created_at=feedback.created_at,
        dev_response=feedback.dev_response,
        responded_at=feedback.responded_at
    )


@router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete feedback (only if not yet reviewed)"""
    
    feedback = db.query(BetaFeedback).filter(
        BetaFeedback.id == feedback_id,
        BetaFeedback.user_id == current_user.id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    if feedback.status != "submitted":
        raise HTTPException(status_code=400, detail="Cannot delete feedback that has been reviewed")
    
    db.delete(feedback)
    db.commit()
    
    return {"message": "Feedback deleted"}
