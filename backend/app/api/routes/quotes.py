"""
Quote Requests & PM Queue API Routes
Handles quick quotes from field and PM review dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import QuoteRequest, QuoteStatus, Project, ProjectStatus, User, UserRole

router = APIRouter()


# ============================================
# SCHEMAS
# ============================================

class QuoteRequestCreate(BaseModel):
    title: str
    description: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    photos: Optional[List[str]] = None
    scope_notes: Optional[str] = None
    urgency: Optional[str] = "standard"
    preferred_schedule: Optional[str] = None


class QuoteRequestUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    quoted_amount: Optional[float] = None
    quote_notes: Optional[str] = None
    quote_valid_until: Optional[str] = None


class QuoteRequestResponse(BaseModel):
    id: int
    title: str
    description: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    photos: Optional[List[str]]
    scope_notes: Optional[str]
    urgency: Optional[str]
    status: str
    submitted_by_id: int
    submitted_by_name: Optional[str] = None
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str] = None
    quoted_amount: Optional[float]
    quote_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PMQueueStats(BaseModel):
    draft_projects: int
    pending_quotes: int
    in_review_quotes: int
    total_action_needed: int


class PMQueueItem(BaseModel):
    item_type: str  # "draft_project" or "quote_request"
    id: int
    title: str
    description: Optional[str]
    submitted_by: Optional[str]
    submitted_at: datetime
    urgency: Optional[str]
    status: str
    address: Optional[str]


# ============================================
# QUOTE REQUEST ROUTES
# ============================================

@router.post("/quotes", response_model=QuoteRequestResponse)
def create_quote_request(
    quote: QuoteRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quote request (field submission)"""
    db_quote = QuoteRequest(
        **quote.dict(),
        submitted_by_id=current_user.id,
        status=QuoteStatus.PENDING
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    # Add submitter name
    db_quote.submitted_by_name = f"{current_user.first_name} {current_user.last_name}"
    
    return db_quote


@router.get("/quotes", response_model=List[QuoteRequestResponse])
def list_quote_requests(
    status: Optional[str] = None,
    assigned_to_me: Optional[bool] = None,
    submitted_by_me: Optional[bool] = None,
    urgency: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List quote requests with filters"""
    query = db.query(QuoteRequest)
    
    if status:
        query = query.filter(QuoteRequest.status == status)
    
    if assigned_to_me:
        query = query.filter(QuoteRequest.assigned_to_id == current_user.id)
    
    if submitted_by_me:
        query = query.filter(QuoteRequest.submitted_by_id == current_user.id)
    
    if urgency:
        query = query.filter(QuoteRequest.urgency == urgency)
    
    quotes = query.order_by(QuoteRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with user names
    for quote in quotes:
        if quote.submitted_by:
            quote.submitted_by_name = f"{quote.submitted_by.first_name} {quote.submitted_by.last_name}"
        if quote.assigned_to:
            quote.assigned_to_name = f"{quote.assigned_to.first_name} {quote.assigned_to.last_name}"
    
    return quotes


@router.get("/quotes/{quote_id}", response_model=QuoteRequestResponse)
def get_quote_request(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific quote request"""
    quote = db.query(QuoteRequest).filter(QuoteRequest.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    if quote.submitted_by:
        quote.submitted_by_name = f"{quote.submitted_by.first_name} {quote.submitted_by.last_name}"
    if quote.assigned_to:
        quote.assigned_to_name = f"{quote.assigned_to.first_name} {quote.assigned_to.last_name}"
    
    return quote


@router.patch("/quotes/{quote_id}", response_model=QuoteRequestResponse)
def update_quote_request(
    quote_id: int,
    update: QuoteRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quote request (PM actions)"""
    quote = db.query(QuoteRequest).filter(QuoteRequest.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    update_data = update.dict(exclude_unset=True)
    
    # Handle status transitions
    if 'status' in update_data:
        new_status = update_data['status']
        if new_status == 'quoted' and update_data.get('quoted_amount'):
            quote.quoted_at = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(quote, key, value)
    
    db.commit()
    db.refresh(quote)
    return quote


@router.post("/quotes/{quote_id}/assign")
def assign_quote(
    quote_id: int,
    assignee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a quote to a PM"""
    quote = db.query(QuoteRequest).filter(QuoteRequest.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    quote.assigned_to_id = assignee_id
    if quote.status == QuoteStatus.PENDING:
        quote.status = QuoteStatus.IN_REVIEW
    
    db.commit()
    return {"status": "assigned", "assigned_to_id": assignee_id}


@router.post("/quotes/{quote_id}/convert-to-project")
def convert_quote_to_project(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert an accepted quote to a project"""
    quote = db.query(QuoteRequest).filter(QuoteRequest.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Create project from quote
    project = Project(
        name=quote.title,
        number=f"Q{quote.id}-{datetime.now().strftime('%Y%m%d')}",
        description=quote.description,
        status=ProjectStatus.PLANNING,
        address=quote.address,
        city=quote.city,
        state=quote.state,
        latitude=quote.latitude,
        longitude=quote.longitude,
        client_name=quote.customer_name,
        contract_value=quote.quoted_amount,
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Update quote with project reference
    quote.converted_to_project_id = project.id
    quote.status = QuoteStatus.ACCEPTED
    db.commit()
    
    return {
        "status": "converted",
        "project_id": project.id,
        "project_number": project.number
    }


# ============================================
# PM QUEUE ROUTES
# ============================================

@router.get("/pm-queue/stats", response_model=PMQueueStats)
def get_pm_queue_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get PM queue statistics"""
    # Count draft projects
    draft_projects = db.query(Project).filter(
        Project.status == 'draft'
    ).count()
    
    # Count pending quotes
    pending_quotes = db.query(QuoteRequest).filter(
        QuoteRequest.status == QuoteStatus.PENDING
    ).count()
    
    # Count in-review quotes
    in_review_quotes = db.query(QuoteRequest).filter(
        QuoteRequest.status == QuoteStatus.IN_REVIEW
    ).count()
    
    return PMQueueStats(
        draft_projects=draft_projects,
        pending_quotes=pending_quotes,
        in_review_quotes=in_review_quotes,
        total_action_needed=draft_projects + pending_quotes + in_review_quotes
    )


@router.get("/pm-queue", response_model=List[PMQueueItem])
def get_pm_queue(
    item_type: Optional[str] = None,  # "draft_project", "quote_request", or None for all
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get PM queue items (draft projects + pending quotes)"""
    items = []
    
    # Get draft projects
    if item_type is None or item_type == "draft_project":
        draft_projects = db.query(Project).filter(
            Project.status == 'draft'
        ).order_by(Project.created_at.desc()).all()
        
        for proj in draft_projects:
            items.append(PMQueueItem(
                item_type="draft_project",
                id=proj.id,
                title=proj.name,
                description=proj.description,
                submitted_by=None,  # Could join with creator if tracked
                submitted_at=proj.created_at,
                urgency=None,
                status="draft",
                address=proj.address
            ))
    
    # Get pending/in-review quotes
    if item_type is None or item_type == "quote_request":
        quotes = db.query(QuoteRequest).filter(
            or_(
                QuoteRequest.status == QuoteStatus.PENDING,
                QuoteRequest.status == QuoteStatus.IN_REVIEW
            )
        ).order_by(QuoteRequest.created_at.desc()).all()
        
        for quote in quotes:
            submitter_name = None
            if quote.submitted_by:
                submitter_name = f"{quote.submitted_by.first_name} {quote.submitted_by.last_name}"
            
            items.append(PMQueueItem(
                item_type="quote_request",
                id=quote.id,
                title=quote.title,
                description=quote.description,
                submitted_by=submitter_name,
                submitted_at=quote.created_at,
                urgency=quote.urgency,
                status=quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
                address=quote.address
            ))
    
    # Sort by date (newest first) and apply pagination
    items.sort(key=lambda x: x.submitted_at, reverse=True)
    return items[skip:skip + limit]


@router.get("/pm-queue/my-quotes", response_model=List[QuoteRequestResponse])
def get_my_submitted_quotes(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quotes submitted by current user (for field staff to track their requests)"""
    query = db.query(QuoteRequest).filter(
        QuoteRequest.submitted_by_id == current_user.id
    )
    
    if status:
        query = query.filter(QuoteRequest.status == status)
    
    quotes = query.order_by(QuoteRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    for quote in quotes:
        if quote.submitted_by:
            quote.submitted_by_name = f"{quote.submitted_by.first_name} {quote.submitted_by.last_name}"
        if quote.assigned_to:
            quote.assigned_to_name = f"{quote.assigned_to.first_name} {quote.assigned_to.last_name}"
    
    return quotes
