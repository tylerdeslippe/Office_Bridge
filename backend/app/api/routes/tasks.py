"""
Office Bridge - Task Routes
Task management with assignment, acknowledgment, and permissions
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core import (
    get_db, get_current_user,
    Permission, require_permission, verify_project_access,
    is_owner, can_edit_resource, is_manager_level
)
from app.models import Task, TaskStatus, TaskPriority, User
from app.schemas import TaskCreate, TaskUpdate, TaskAcknowledge, TaskResponse

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    my_tasks: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_VIEW))
):
    """List tasks with filters"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    query = select(Task).options(
        selectinload(Task.assignee),
        selectinload(Task.created_by)
    )
    
    # Project access check
    if project_id:
        await verify_project_access(project_id, current_user, db, Permission.TASK_VIEW)
        query = query.where(Task.project_id == project_id)
    
    if my_tasks:
        query = query.where(Task.assignee_id == user_id)
    elif assignee_id:
        query = query.where(Task.assignee_id == assignee_id)
    
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    
    query = query.offset(skip).limit(limit).order_by(Task.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_CREATE))
):
    """Create and assign a task"""
    user_id = int(current_user.get("sub", 0))
    
    # Verify project access
    if data.project_id:
        await verify_project_access(data.project_id, current_user, db, Permission.TASK_CREATE)
    
    # Verify assignee exists
    result = await db.execute(select(User).where(User.id == data.assignee_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Assignee not found")
    
    task = Task(
        **data.model_dump(),
        created_by_id=user_id
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Reload with relationships
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.created_by))
        .where(Task.id == task.id)
    )
    return result.scalar_one()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_VIEW))
):
    """Get a specific task"""
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.created_by))
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify project access
    if task.project_id:
        await verify_project_access(task.project_id, current_user, db, Permission.TASK_VIEW)
    
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_UPDATE))
):
    """Update a task"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user can edit (creator, manager, or admin)
    can_edit = is_manager_level(user_role) or task.created_by_id == user_id
    if not can_edit:
        raise HTTPException(status_code=403, detail="You can only edit tasks you created")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == TaskStatus.COMPLETED and not task.completed_at:
            task.completed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.commit()
    
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.created_by))
        .where(Task.id == task_id)
    )
    return result.scalar_one()


@router.post("/{task_id}/acknowledge", response_model=TaskResponse)
async def acknowledge_task(
    task_id: int,
    data: TaskAcknowledge,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_ACKNOWLEDGE))
):
    """Acknowledge a task assignment (own tasks only)"""
    user_id = int(current_user.get("sub", 0))
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Only assignee can acknowledge
    if task.assignee_id != user_id:
        raise HTTPException(status_code=403, detail="Only the assignee can acknowledge this task")
    
    if data.acknowledged:
        task.status = TaskStatus.ACKNOWLEDGED
        task.acknowledged_at = datetime.utcnow()
    
    await db.commit()
    
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.created_by))
        .where(Task.id == task_id)
    )
    return result.scalar_one()


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_COMPLETE))
):
    """Mark a task as completed (assignee or manager)"""
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Assignee or manager can complete
    can_complete = is_manager_level(user_role) or task.assignee_id == user_id
    if not can_complete:
        raise HTTPException(status_code=403, detail="Only the assignee or a manager can complete this task")
    
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    
    await db.commit()
    
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.created_by))
        .where(Task.id == task_id)
    )
    return result.scalar_one()


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.TASK_DELETE))
):
    """Delete a task (managers only)"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
