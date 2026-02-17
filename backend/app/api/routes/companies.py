"""
Company API Routes
Handles company creation, team management, and sync
"""
from datetime import datetime
from typing import List, Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.models import User, Company, Project, BetaFeedback, SyncLog, UserRole

router = APIRouter(prefix="/companies", tags=["companies"])


# ============================================
# SCHEMAS
# ============================================

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    code: str
    invite_code: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    max_users: int
    max_projects: int
    storage_limit_gb: float
    storage_used_gb: float
    member_count: int
    project_count: int
    is_beta: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyMember(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "field_worker"
    send_email: bool = True


class JoinCompanyRequest(BaseModel):
    invite_code: str


class SyncRequest(BaseModel):
    entity_type: str  # project, task, delivery, etc.
    action: str  # create, update, delete
    data: dict
    local_id: str
    local_updated_at: str


class SyncResponse(BaseModel):
    success: bool
    server_id: Optional[int] = None
    server_updated_at: Optional[str] = None
    conflict: bool = False
    server_data: Optional[dict] = None


# ============================================
# COMPANY CRUD
# ============================================

@router.post("/", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new company (user becomes owner)"""
    
    # Generate unique codes
    code = company_data.name[:3].upper() + secrets.token_hex(2).upper()
    invite_code = secrets.token_urlsafe(16)
    
    company = Company(
        name=company_data.name,
        code=code,
        invite_code=invite_code,
        address=company_data.address,
        city=company_data.city,
        state=company_data.state,
        zip_code=company_data.zip_code,
        phone=company_data.phone,
        email=company_data.email,
        owner_id=current_user.id,
        is_beta=True
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Add owner as member
    company.members.append(current_user)
    current_user.primary_company_id = company.id
    db.commit()
    
    return CompanyResponse(
        id=company.id,
        name=company.name,
        code=company.code,
        invite_code=company.invite_code,
        address=company.address,
        city=company.city,
        state=company.state,
        phone=company.phone,
        email=company.email,
        max_users=company.max_users,
        max_projects=company.max_projects,
        storage_limit_gb=company.storage_limit_gb,
        storage_used_gb=company.storage_used_gb,
        member_count=len(company.members),
        project_count=len(company.projects),
        is_beta=company.is_beta,
        created_at=company.created_at
    )


@router.get("/my", response_model=CompanyResponse)
async def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's primary company"""
    if not current_user.primary_company_id:
        raise HTTPException(status_code=404, detail="No company found")
    
    company = db.query(Company).filter(Company.id == current_user.primary_company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(
        id=company.id,
        name=company.name,
        code=company.code,
        invite_code=company.invite_code,
        address=company.address,
        city=company.city,
        state=company.state,
        phone=company.phone,
        email=company.email,
        max_users=company.max_users,
        max_projects=company.max_projects,
        storage_limit_gb=company.storage_limit_gb,
        storage_used_gb=company.storage_used_gb,
        member_count=len(company.members),
        project_count=len(company.projects),
        is_beta=company.is_beta,
        created_at=company.created_at
    )


@router.post("/join")
async def join_company(
    request: JoinCompanyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a company using invite code"""
    company = db.query(Company).filter(Company.invite_code == request.invite_code).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    if len(company.members) >= company.max_users:
        raise HTTPException(status_code=400, detail="Company has reached maximum users")
    
    if current_user in company.members:
        raise HTTPException(status_code=400, detail="Already a member of this company")
    
    company.members.append(current_user)
    current_user.primary_company_id = company.id
    db.commit()
    
    return {"message": f"Successfully joined {company.name}", "company_id": company.id}


@router.get("/members", response_model=List[CompanyMember])
async def get_company_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all members of current user's company"""
    if not current_user.primary_company_id:
        raise HTTPException(status_code=404, detail="No company found")
    
    company = db.query(Company).filter(Company.id == current_user.primary_company_id).first()
    
    return [
        CompanyMember(
            id=m.id,
            email=m.email,
            first_name=m.first_name,
            last_name=m.last_name,
            role=m.role.value,
            is_active=m.is_active,
            last_login=m.last_login
        )
        for m in company.members
    ]


@router.post("/invite")
async def invite_member(
    request: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new member to the company"""
    if not current_user.primary_company_id:
        raise HTTPException(status_code=404, detail="No company found")
    
    company = db.query(Company).filter(Company.id == current_user.primary_company_id).first()
    
    # Check if user is owner or admin
    if company.owner_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.DEVELOPER]:
        raise HTTPException(status_code=403, detail="Only company owner or admin can invite members")
    
    # Check user limit
    if len(company.members) >= company.max_users:
        raise HTTPException(status_code=400, detail="Company has reached maximum users")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user and existing_user in company.members:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # TODO: Send invitation email if send_email is True
    
    return {
        "message": f"Invitation sent to {request.email}",
        "invite_code": company.invite_code,
        "invite_link": f"officebridge://join?code={company.invite_code}"
    }


# ============================================
# SYNC ENDPOINTS
# ============================================

@router.post("/sync", response_model=SyncResponse)
async def sync_entity(
    request: SyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync a single entity from mobile to server"""
    if not current_user.primary_company_id:
        raise HTTPException(status_code=400, detail="Must be part of a company to sync")
    
    # Log sync attempt
    sync_log = SyncLog(
        user_id=current_user.id,
        company_id=current_user.primary_company_id,
        action=request.action,
        entity_type=request.entity_type,
        entity_id=request.local_id,
        data_snapshot=request.data
    )
    
    try:
        # Handle different entity types
        if request.entity_type == "project":
            result = await _sync_project(request, current_user, db)
        elif request.entity_type == "task":
            result = await _sync_task(request, current_user, db)
        elif request.entity_type == "delivery":
            result = await _sync_delivery(request, current_user, db)
        elif request.entity_type == "daily_report":
            result = await _sync_daily_report(request, current_user, db)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown entity type: {request.entity_type}")
        
        sync_log.status = "success"
        db.add(sync_log)
        db.commit()
        
        return result
        
    except Exception as e:
        sync_log.status = "failed"
        sync_log.error_message = str(e)
        db.add(sync_log)
        db.commit()
        raise


@router.get("/sync/pull")
async def pull_updates(
    since: Optional[str] = None,
    entity_types: Optional[str] = None,  # comma-separated
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pull all updates from server since a given timestamp"""
    if not current_user.primary_company_id:
        raise HTTPException(status_code=400, detail="Must be part of a company to sync")
    
    company_id = current_user.primary_company_id
    
    # Parse since timestamp
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except:
            since_dt = None
    
    updates = {}
    
    # Get projects
    if not entity_types or "project" in entity_types:
        projects_query = db.query(Project).filter(Project.company_id == company_id)
        if since_dt:
            projects_query = projects_query.filter(Project.updated_at > since_dt)
        updates["projects"] = [_project_to_dict(p) for p in projects_query.all()]
    
    # TODO: Add other entity types (tasks, deliveries, etc.)
    
    # Update user's last sync time
    current_user.last_sync_at = datetime.utcnow()
    db.commit()
    
    return {
        "updates": updates,
        "server_time": datetime.utcnow().isoformat()
    }


# ============================================
# HELPER FUNCTIONS
# ============================================

async def _sync_project(request: SyncRequest, user: User, db: Session) -> SyncResponse:
    """Sync a project entity"""
    from app.models.models import Project
    
    data = request.data
    
    if request.action == "create":
        project = Project(
            name=data.get("name"),
            number=data.get("number"),
            description=data.get("description"),
            status=data.get("status", "planning"),
            company_id=user.primary_company_id,
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            zip_code=data.get("zip_code"),
            client_name=data.get("client_name"),
            created_at=datetime.utcnow()
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        return SyncResponse(
            success=True,
            server_id=project.id,
            server_updated_at=project.updated_at.isoformat()
        )
    
    elif request.action == "update":
        project = db.query(Project).filter(
            Project.id == int(request.local_id),
            Project.company_id == user.primary_company_id
        ).first()
        
        if not project:
            return SyncResponse(success=False, conflict=True)
        
        # Check for conflicts
        local_updated = datetime.fromisoformat(request.local_updated_at.replace('Z', '+00:00'))
        if project.updated_at > local_updated:
            # Server has newer data - return it
            return SyncResponse(
                success=False,
                conflict=True,
                server_data=_project_to_dict(project),
                server_updated_at=project.updated_at.isoformat()
            )
        
        # Update project
        for key, value in data.items():
            if hasattr(project, key):
                setattr(project, key, value)
        
        project.updated_at = datetime.utcnow()
        db.commit()
        
        return SyncResponse(
            success=True,
            server_id=project.id,
            server_updated_at=project.updated_at.isoformat()
        )
    
    elif request.action == "delete":
        project = db.query(Project).filter(
            Project.id == int(request.local_id),
            Project.company_id == user.primary_company_id
        ).first()
        
        if project:
            db.delete(project)
            db.commit()
        
        return SyncResponse(success=True)
    
    return SyncResponse(success=False)


async def _sync_task(request: SyncRequest, user: User, db: Session) -> SyncResponse:
    # TODO: Implement task sync
    return SyncResponse(success=True)


async def _sync_delivery(request: SyncRequest, user: User, db: Session) -> SyncResponse:
    # TODO: Implement delivery sync
    return SyncResponse(success=True)


async def _sync_daily_report(request: SyncRequest, user: User, db: Session) -> SyncResponse:
    # TODO: Implement daily report sync
    return SyncResponse(success=True)


def _project_to_dict(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "number": project.number,
        "description": project.description,
        "status": project.status.value if project.status else None,
        "address": project.address,
        "city": project.city,
        "state": project.state,
        "zip_code": project.zip_code,
        "client_name": project.client_name,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }
