"""
Office Bridge - Project Routes
With permission-based access control
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core import (
    get_db, get_current_user,
    Permission, require_permission, get_user_project_ids, is_admin
)
from app.models import Project, ProjectStatus, project_users, User
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_VIEW))
):
    """List projects the user has access to"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    # Get projects user can access
    accessible_ids = await get_user_project_ids(user_id, user_role, db)
    
    query = select(Project)
    
    # Filter by accessible projects (admins see all)
    if not is_admin(user_role) and accessible_ids:
        query = query.where(Project.id.in_(accessible_ids))
    elif not is_admin(user_role):
        # No projects assigned
        return []
    
    if status:
        query = query.where(Project.status == status)
    if search:
        query = query.where(
            Project.name.ilike(f"%{search}%") | 
            Project.number.ilike(f"%{search}%")
        )
    
    query = query.offset(skip).limit(limit).order_by(Project.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_CREATE))
):
    """Create a new project (PM, Super, Admin only)"""
    user_id = int(current_user.get("sub", 0))
    
    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Auto-assign creator to project
    await db.execute(
        project_users.insert().values(project_id=project.id, user_id=user_id)
    )
    await db.commit()
    
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_VIEW))
):
    """Get a specific project"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if not is_admin(user_role):
        accessible_ids = await get_user_project_ids(user_id, user_role, db)
        if project_id not in accessible_ids:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
    
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_UPDATE))
):
    """Update a project"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if not is_admin(user_role):
        accessible_ids = await get_user_project_ids(user_id, user_role, db)
        if project_id not in accessible_ids:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_DELETE))
):
    """Close/archive a project (Admin only)"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.status = ProjectStatus.CLOSED
    await db.commit()


@router.post("/{project_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_MANAGE_MEMBERS))
):
    """Add a user to a project"""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already assigned
    existing = await db.execute(
        select(project_users).where(
            project_users.c.project_id == project_id,
            project_users.c.user_id == user_id
        )
    )
    if existing.first():
        raise HTTPException(status_code=400, detail="User already assigned to project")
    
    await db.execute(
        project_users.insert().values(project_id=project_id, user_id=user_id)
    )
    await db.commit()
    
    return {"message": "User added to project"}


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_MANAGE_MEMBERS))
):
    """Remove a user from a project"""
    await db.execute(
        project_users.delete().where(
            project_users.c.project_id == project_id,
            project_users.c.user_id == user_id
        )
    )
    await db.commit()


@router.get("/{project_id}/members", response_model=List[dict])
async def list_project_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.PROJECT_VIEW))
):
    """List all members of a project"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    # Check access
    if not is_admin(user_role):
        accessible_ids = await get_user_project_ids(user_id, user_role, db)
        if project_id not in accessible_ids:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
    
    result = await db.execute(
        select(User)
        .join(project_users)
        .where(project_users.c.project_id == project_id)
    )
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role
        }
        for u in users
    ]
