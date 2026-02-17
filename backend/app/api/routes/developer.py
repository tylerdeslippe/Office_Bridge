"""
Developer/Admin API Routes
Special endpoints for beta testing and administration
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash, verify_password, create_access_token
from app.models.models import User, Company, Project, BetaFeedback, SyncLog, UserRole

router = APIRouter(prefix="/dev", tags=["developer"])


# ============================================
# SCHEMAS
# ============================================

class DevLoginRequest(BaseModel):
    email: str
    password: str


class DevLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    is_developer: bool


class CreateDevAccountRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    dev_secret: str  # Secret key to create dev accounts


class DashboardStats(BaseModel):
    total_users: int
    total_companies: int
    total_projects: int
    active_users_today: int
    active_users_week: int
    total_feedback: int
    pending_feedback: int
    sync_operations_today: int
    storage_used_gb: float


class FeedbackItem(BaseModel):
    id: int
    user_email: str
    company_name: Optional[str]
    type: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    app_version: Optional[str]
    created_at: datetime
    dev_response: Optional[str]


class FeedbackResponse(BaseModel):
    status: str
    dev_notes: Optional[str] = None
    dev_response: Optional[str] = None


class UserOverview(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    company_name: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    app_version: Optional[str]
    created_at: datetime


# ============================================
# DEVELOPER AUTHENTICATION
# ============================================

# Secret key for creating developer accounts (change in production!)
DEV_SECRET = "office-bridge-dev-2024"


@router.post("/create-account", response_model=DevLoginResponse)
async def create_dev_account(
    request: CreateDevAccountRequest,
    db: Session = Depends(get_db)
):
    """Create a developer account (requires dev secret)"""
    if request.dev_secret != DEV_SECRET:
        raise HTTPException(status_code=403, detail="Invalid developer secret")
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role=UserRole.DEVELOPER,
        is_developer=True,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return DevLoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value
        },
        is_developer=True
    )


@router.post("/login", response_model=DevLoginResponse)
async def dev_login(
    request: DevLoginRequest,
    db: Session = Depends(get_db)
):
    """Login as developer (only developers can use this endpoint)"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_developer:
        raise HTTPException(status_code=403, detail="Not a developer account")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    
    return DevLoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value
        },
        is_developer=True
    )


# ============================================
# DASHBOARD & STATS
# ============================================

def require_developer(current_user: User = Depends(get_current_user)):
    """Dependency to require developer access"""
    if not current_user.is_developer:
        raise HTTPException(status_code=403, detail="Developer access required")
    return current_user


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get overview statistics for developer dashboard"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Count queries
    total_users = db.query(User).count()
    total_companies = db.query(Company).count()
    total_projects = db.query(Project).count()
    
    active_today = db.query(User).filter(User.last_login >= today_start).count()
    active_week = db.query(User).filter(User.last_login >= week_start).count()
    
    total_feedback = db.query(BetaFeedback).count()
    pending_feedback = db.query(BetaFeedback).filter(BetaFeedback.status == "submitted").count()
    
    sync_today = db.query(SyncLog).filter(SyncLog.created_at >= today_start).count()
    
    # Calculate total storage
    storage_result = db.query(func.sum(Company.storage_used_gb)).scalar()
    storage_used = storage_result or 0.0
    
    return DashboardStats(
        total_users=total_users,
        total_companies=total_companies,
        total_projects=total_projects,
        active_users_today=active_today,
        active_users_week=active_week,
        total_feedback=total_feedback,
        pending_feedback=pending_feedback,
        sync_operations_today=sync_today,
        storage_used_gb=storage_used
    )


@router.get("/users", response_model=List[UserOverview])
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List all users in the system"""
    users = db.query(User).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        company_name = None
        if user.primary_company_id:
            company = db.query(Company).filter(Company.id == user.primary_company_id).first()
            company_name = company.name if company else None
        
        result.append(UserOverview(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value,
            company_name=company_name,
            is_active=user.is_active,
            last_login=user.last_login,
            app_version=user.app_version,
            created_at=user.created_at
        ))
    
    return result


@router.get("/companies")
async def list_all_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List all companies"""
    companies = db.query(Company).offset(skip).limit(limit).all()
    
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "member_count": len(c.members),
            "project_count": len(c.projects),
            "storage_used_gb": c.storage_used_gb,
            "is_beta": c.is_beta,
            "created_at": c.created_at
        }
        for c in companies
    ]


# ============================================
# FEEDBACK MANAGEMENT
# ============================================

@router.get("/feedback", response_model=List[FeedbackItem])
async def list_feedback(
    status: Optional[str] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """List beta feedback from users"""
    query = db.query(BetaFeedback)
    
    if status:
        query = query.filter(BetaFeedback.status == status)
    if type:
        query = query.filter(BetaFeedback.type == type)
    
    query = query.order_by(BetaFeedback.created_at.desc())
    feedback_list = query.offset(skip).limit(limit).all()
    
    result = []
    for fb in feedback_list:
        user = db.query(User).filter(User.id == fb.user_id).first()
        company = None
        if fb.company_id:
            company = db.query(Company).filter(Company.id == fb.company_id).first()
        
        result.append(FeedbackItem(
            id=fb.id,
            user_email=user.email if user else "Unknown",
            company_name=company.name if company else None,
            type=fb.type,
            title=fb.title,
            description=fb.description,
            priority=fb.priority,
            status=fb.status,
            app_version=fb.app_version,
            created_at=fb.created_at,
            dev_response=fb.dev_response
        ))
    
    return result


@router.put("/feedback/{feedback_id}")
async def respond_to_feedback(
    feedback_id: int,
    response: FeedbackResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Respond to user feedback"""
    feedback = db.query(BetaFeedback).filter(BetaFeedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    feedback.status = response.status
    if response.dev_notes:
        feedback.dev_notes = response.dev_notes
    if response.dev_response:
        feedback.dev_response = response.dev_response
        feedback.responded_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Feedback updated", "id": feedback_id}


# ============================================
# SYNC LOGS & DEBUGGING
# ============================================

@router.get("/sync-logs")
async def get_sync_logs(
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Get sync operation logs for debugging"""
    query = db.query(SyncLog)
    
    if user_id:
        query = query.filter(SyncLog.user_id == user_id)
    if company_id:
        query = query.filter(SyncLog.company_id == company_id)
    if status:
        query = query.filter(SyncLog.status == status)
    
    logs = query.order_by(SyncLog.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "status": log.status,
            "error_message": log.error_message,
            "created_at": log.created_at
        }
        for log in logs
    ]


# ============================================
# USER MANAGEMENT
# ============================================

@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Activate or deactivate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.put("/users/{user_id}/make-developer")
async def make_developer(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Grant developer access to a user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_developer = True
    user.role = UserRole.DEVELOPER
    db.commit()
    
    return {"message": f"Developer access granted to {user.email}"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Delete a user (use carefully!)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.email} deleted"}


# ============================================
# TEST DATA GENERATION
# ============================================

@router.post("/generate-test-data")
async def generate_test_data(
    num_projects: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Generate test data for development"""
    from app.models.models import Project, ProjectStatus
    import random
    
    if not current_user.primary_company_id:
        raise HTTPException(status_code=400, detail="Developer must be part of a company")
    
    projects_created = []
    
    project_names = [
        "Downtown Office Tower", "Riverside Apartments", "Tech Campus Building A",
        "Medical Center Expansion", "Airport Terminal Renovation", "University Library",
        "Shopping Mall HVAC Retrofit", "Hotel Conference Center", "Data Center Cooling",
        "Manufacturing Plant Upgrade"
    ]
    
    cities = ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"]
    
    for i in range(num_projects):
        project = Project(
            name=random.choice(project_names) + f" #{random.randint(100, 999)}",
            number=f"P-{datetime.now().year}-{random.randint(1000, 9999)}",
            status=random.choice(list(ProjectStatus)),
            company_id=current_user.primary_company_id,
            address=f"{random.randint(100, 9999)} Main Street",
            city=random.choice(cities),
            state="FL",
            zip_code=f"{random.randint(30000, 39999)}",
            client_name=f"Client Corp {random.randint(1, 100)}",
            contract_value=random.randint(50000, 5000000)
        )
        db.add(project)
        projects_created.append(project.name)
    
    db.commit()
    
    return {
        "message": f"Created {num_projects} test projects",
        "projects": projects_created
    }


@router.delete("/clear-test-data")
async def clear_test_data(
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer)
):
    """Clear all test data (requires confirmation)"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Add ?confirm=true to confirm deletion of all test data"
        )
    
    # Only clear data from the developer's company
    if current_user.primary_company_id:
        deleted = db.query(Project).filter(
            Project.company_id == current_user.primary_company_id
        ).delete()
        db.commit()
        return {"message": f"Deleted {deleted} projects"}
    
    return {"message": "No data to delete"}
