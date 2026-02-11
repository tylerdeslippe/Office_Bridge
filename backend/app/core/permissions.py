"""
Office Bridge - Permissions System
Role-based access control with project membership
"""
from enum import Enum
from typing import List, Set, Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user


# ============================================
# PERMISSION DEFINITIONS
# ============================================

class Permission(str, Enum):
    """All available permissions in the system"""
    
    # Project permissions
    PROJECT_VIEW = "project:view"
    PROJECT_CREATE = "project:create"
    PROJECT_UPDATE = "project:update"
    PROJECT_DELETE = "project:delete"
    PROJECT_MANAGE_MEMBERS = "project:manage_members"
    
    # Task permissions
    TASK_VIEW = "task:view"
    TASK_CREATE = "task:create"
    TASK_ASSIGN = "task:assign"
    TASK_UPDATE = "task:update"
    TASK_DELETE = "task:delete"
    TASK_ACKNOWLEDGE = "task:acknowledge"
    TASK_COMPLETE = "task:complete"
    
    # Daily Report permissions
    DAILY_REPORT_VIEW = "daily_report:view"
    DAILY_REPORT_CREATE = "daily_report:create"
    DAILY_REPORT_UPDATE = "daily_report:update"
    DAILY_REPORT_DELETE = "daily_report:delete"
    
    # Photo permissions
    PHOTO_VIEW = "photo:view"
    PHOTO_CREATE = "photo:create"
    PHOTO_UPDATE = "photo:update"
    PHOTO_DELETE = "photo:delete"
    
    # Document permissions
    DOCUMENT_VIEW = "document:view"
    DOCUMENT_CREATE = "document:create"
    DOCUMENT_UPDATE = "document:update"
    DOCUMENT_DELETE = "document:delete"
    DOCUMENT_MANAGE_REVISIONS = "document:manage_revisions"
    
    # RFI permissions
    RFI_VIEW = "rfi:view"
    RFI_CREATE = "rfi:create"
    RFI_UPDATE = "rfi:update"
    RFI_ANSWER = "rfi:answer"
    RFI_DELETE = "rfi:delete"
    
    # Change Order permissions
    CHANGE_VIEW = "change:view"
    CHANGE_CREATE = "change:create"
    CHANGE_PRICE = "change:price"
    CHANGE_APPROVE = "change:approve"
    CHANGE_DELETE = "change:delete"
    
    # Punch List permissions
    PUNCH_VIEW = "punch:view"
    PUNCH_CREATE = "punch:create"
    PUNCH_UPDATE = "punch:update"
    PUNCH_VERIFY = "punch:verify"
    PUNCH_DELETE = "punch:delete"
    
    # Delivery permissions
    DELIVERY_VIEW = "delivery:view"
    DELIVERY_CREATE = "delivery:create"
    DELIVERY_UPDATE = "delivery:update"
    DELIVERY_CONFIRM = "delivery:confirm"
    DELIVERY_DELETE = "delivery:delete"
    
    # Constraint permissions
    CONSTRAINT_VIEW = "constraint:view"
    CONSTRAINT_CREATE = "constraint:create"
    CONSTRAINT_UPDATE = "constraint:update"
    CONSTRAINT_RESOLVE = "constraint:resolve"
    CONSTRAINT_DELETE = "constraint:delete"
    
    # Decision Log permissions
    DECISION_VIEW = "decision:view"
    DECISION_CREATE = "decision:create"
    
    # Timecard permissions
    TIMECARD_VIEW_OWN = "timecard:view_own"
    TIMECARD_VIEW_ALL = "timecard:view_all"
    TIMECARD_CREATE = "timecard:create"
    TIMECARD_UPDATE_OWN = "timecard:update_own"
    TIMECARD_APPROVE = "timecard:approve"
    TIMECARD_DELETE = "timecard:delete"
    
    # Cost Code permissions
    COST_CODE_VIEW = "cost_code:view"
    COST_CODE_CREATE = "cost_code:create"
    COST_CODE_UPDATE = "cost_code:update"
    COST_CODE_DELETE = "cost_code:delete"
    
    # Service Call permissions
    SERVICE_VIEW = "service:view"
    SERVICE_CREATE = "service:create"
    SERVICE_ASSIGN = "service:assign"
    SERVICE_UPDATE = "service:update"
    SERVICE_COMPLETE = "service:complete"
    SERVICE_DELETE = "service:delete"
    
    # Admin permissions
    ADMIN_VIEW_ALL_PROJECTS = "admin:view_all_projects"
    ADMIN_MANAGE_USERS = "admin:manage_users"
    ADMIN_SYSTEM_SETTINGS = "admin:system_settings"


# ============================================
# ROLE PERMISSION MAPPINGS
# ============================================

FULL_ACCESS_PERMISSIONS: Set[Permission] = {p for p in Permission if not p.value.startswith("admin:")}
ADMIN_PERMISSIONS: Set[Permission] = {p for p in Permission}

ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "admin": ADMIN_PERMISSIONS,
    
    "project_manager": FULL_ACCESS_PERMISSIONS,
    
    "superintendent": FULL_ACCESS_PERMISSIONS,
    
    "foreman": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW, Permission.TASK_CREATE, Permission.TASK_ASSIGN,
        Permission.TASK_UPDATE, Permission.TASK_ACKNOWLEDGE, Permission.TASK_COMPLETE,
        Permission.DAILY_REPORT_VIEW, Permission.DAILY_REPORT_CREATE, Permission.DAILY_REPORT_UPDATE,
        Permission.PHOTO_VIEW, Permission.PHOTO_CREATE, Permission.PHOTO_UPDATE,
        Permission.DOCUMENT_VIEW,
        Permission.RFI_VIEW, Permission.RFI_CREATE, Permission.RFI_UPDATE,
        Permission.CHANGE_VIEW, Permission.CHANGE_CREATE,
        Permission.PUNCH_VIEW, Permission.PUNCH_CREATE, Permission.PUNCH_UPDATE,
        Permission.DELIVERY_VIEW, Permission.DELIVERY_CONFIRM,
        Permission.CONSTRAINT_VIEW, Permission.CONSTRAINT_CREATE, Permission.CONSTRAINT_UPDATE,
        Permission.DECISION_VIEW, Permission.DECISION_CREATE,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_VIEW_ALL,
        Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW,
    },
    
    "project_engineer": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW, Permission.TASK_CREATE, Permission.TASK_ASSIGN,
        Permission.TASK_UPDATE, Permission.TASK_ACKNOWLEDGE, Permission.TASK_COMPLETE,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW, Permission.PHOTO_CREATE, Permission.PHOTO_UPDATE,
        Permission.DOCUMENT_VIEW, Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_UPDATE, Permission.DOCUMENT_MANAGE_REVISIONS,
        Permission.RFI_VIEW, Permission.RFI_CREATE, Permission.RFI_UPDATE, Permission.RFI_ANSWER,
        Permission.CHANGE_VIEW, Permission.CHANGE_CREATE, Permission.CHANGE_PRICE,
        Permission.PUNCH_VIEW, Permission.PUNCH_CREATE, Permission.PUNCH_UPDATE,
        Permission.DELIVERY_VIEW,
        Permission.CONSTRAINT_VIEW, Permission.CONSTRAINT_CREATE,
        Permission.CONSTRAINT_UPDATE, Permission.CONSTRAINT_RESOLVE,
        Permission.DECISION_VIEW, Permission.DECISION_CREATE,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW,
    },
    
    "accounting": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.RFI_VIEW,
        Permission.CHANGE_VIEW, Permission.CHANGE_PRICE, Permission.CHANGE_APPROVE,
        Permission.PUNCH_VIEW,
        Permission.DELIVERY_VIEW,
        Permission.CONSTRAINT_VIEW,
        Permission.DECISION_VIEW,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_VIEW_ALL,
        Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN, Permission.TIMECARD_APPROVE,
        Permission.COST_CODE_VIEW, Permission.COST_CODE_CREATE, Permission.COST_CODE_UPDATE,
        Permission.SERVICE_VIEW,
    },
    
    "logistics": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW, Permission.TASK_ACKNOWLEDGE, Permission.TASK_COMPLETE,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW, Permission.PHOTO_CREATE,
        Permission.DOCUMENT_VIEW,
        Permission.RFI_VIEW,
        Permission.CHANGE_VIEW,
        Permission.PUNCH_VIEW,
        Permission.DELIVERY_VIEW, Permission.DELIVERY_CREATE,
        Permission.DELIVERY_UPDATE, Permission.DELIVERY_CONFIRM,
        Permission.CONSTRAINT_VIEW, Permission.CONSTRAINT_CREATE,
        Permission.CONSTRAINT_UPDATE, Permission.CONSTRAINT_RESOLVE,
        Permission.DECISION_VIEW,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW,
    },
    
    "document_controller": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW, Permission.TASK_ACKNOWLEDGE, Permission.TASK_COMPLETE,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW,
        Permission.DOCUMENT_VIEW, Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_UPDATE, Permission.DOCUMENT_DELETE, Permission.DOCUMENT_MANAGE_REVISIONS,
        Permission.RFI_VIEW,
        Permission.CHANGE_VIEW,
        Permission.PUNCH_VIEW,
        Permission.DELIVERY_VIEW,
        Permission.CONSTRAINT_VIEW,
        Permission.DECISION_VIEW,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW,
    },
    
    "service_dispatcher": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW, Permission.PHOTO_CREATE,
        Permission.DOCUMENT_VIEW,
        Permission.RFI_VIEW,
        Permission.CHANGE_VIEW,
        Permission.PUNCH_VIEW,
        Permission.DELIVERY_VIEW,
        Permission.CONSTRAINT_VIEW,
        Permission.DECISION_VIEW,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW, Permission.SERVICE_CREATE,
        Permission.SERVICE_ASSIGN, Permission.SERVICE_UPDATE, Permission.SERVICE_COMPLETE,
    },
    
    "field_worker": {
        Permission.PROJECT_VIEW,
        Permission.TASK_VIEW, Permission.TASK_ACKNOWLEDGE, Permission.TASK_COMPLETE,
        Permission.DAILY_REPORT_VIEW,
        Permission.PHOTO_VIEW, Permission.PHOTO_CREATE,
        Permission.DOCUMENT_VIEW,
        Permission.RFI_VIEW, Permission.RFI_CREATE,
        Permission.CHANGE_VIEW, Permission.CHANGE_CREATE,
        Permission.PUNCH_VIEW, Permission.PUNCH_CREATE,
        Permission.DELIVERY_VIEW, Permission.DELIVERY_CONFIRM,
        Permission.CONSTRAINT_VIEW,
        Permission.DECISION_VIEW,
        Permission.TIMECARD_VIEW_OWN, Permission.TIMECARD_CREATE, Permission.TIMECARD_UPDATE_OWN,
        Permission.COST_CODE_VIEW,
        Permission.SERVICE_VIEW,
    },
}


# ============================================
# PERMISSION CHECKING FUNCTIONS
# ============================================

def get_user_permissions(role: str) -> Set[Permission]:
    """Get all permissions for a given role"""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    return permission in get_user_permissions(role)


def has_any_permission(role: str, permissions: List[Permission]) -> bool:
    """Check if a role has any of the specified permissions"""
    user_perms = get_user_permissions(role)
    return any(p in user_perms for p in permissions)


def has_all_permissions(role: str, permissions: List[Permission]) -> bool:
    """Check if a role has all of the specified permissions"""
    user_perms = get_user_permissions(role)
    return all(p in user_perms for p in permissions)


def is_admin(role: str) -> bool:
    """Check if role is admin"""
    return role == "admin"


def is_manager_level(role: str) -> bool:
    """Check if role is manager level (PM, Super, Admin)"""
    return role in ["admin", "project_manager", "superintendent"]


# ============================================
# FASTAPI DEPENDENCY DECORATORS
# ============================================

def require_permission(*permissions: Permission):
    """
    Dependency that checks if the current user has the required permission(s).
    Usage: Depends(require_permission(Permission.TASK_VIEW))
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "")
        
        if not has_any_permission(user_role, list(permissions)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {[p.value for p in permissions]}"
            )
        return current_user
    
    return permission_checker


def require_roles(*roles: str):
    """
    Dependency that checks if the current user has one of the specified roles.
    Usage: Depends(require_roles("admin", "project_manager"))
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "")
        
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {roles}"
            )
        return current_user
    
    return role_checker


# ============================================
# PROJECT MEMBERSHIP CHECKING
# ============================================

async def check_project_access(
    user_id: int,
    project_id: int,
    user_role: str,
    db: AsyncSession
) -> bool:
    """
    Check if user has access to a project.
    Admins bypass project membership check.
    """
    if is_admin(user_role):
        return True
    
    from app.models import project_users
    
    result = await db.execute(
        select(project_users).where(
            project_users.c.user_id == user_id,
            project_users.c.project_id == project_id
        )
    )
    return result.first() is not None


async def get_user_project_ids(user_id: int, user_role: str, db: AsyncSession) -> List[int]:
    """
    Get list of project IDs user has access to.
    Admins get all projects.
    """
    from app.models import Project, project_users
    
    if is_admin(user_role):
        result = await db.execute(select(Project.id))
        return [row[0] for row in result.fetchall()]
    
    result = await db.execute(
        select(project_users.c.project_id).where(project_users.c.user_id == user_id)
    )
    return [row[0] for row in result.fetchall()]


async def verify_project_access(
    project_id: int,
    current_user: dict,
    db: AsyncSession,
    required_permission: Optional[Permission] = None
):
    """
    Helper to verify project access and optionally a permission.
    Raises HTTPException if denied.
    """
    user_id = int(current_user.get("sub", 0))
    user_role = current_user.get("role", "")
    
    # Check permission first
    if required_permission and not has_permission(user_role, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {required_permission.value}"
        )
    
    # Check project access
    has_access = await check_project_access(user_id, project_id, user_role, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )


# ============================================
# OWNERSHIP CHECKING
# ============================================

def is_owner(user_id: int, resource_owner_id: int) -> bool:
    """Check if user owns a resource"""
    return user_id == resource_owner_id


async def can_edit_resource(
    user_id: int,
    resource_owner_id: int,
    user_role: str,
    edit_permission: Permission,
    edit_own_permission: Optional[Permission] = None
) -> bool:
    """
    Check if user can edit a resource.
    - If user has general edit permission, allow
    - If user owns it and has edit_own permission, allow
    """
    if has_permission(user_role, edit_permission):
        return True
    
    if edit_own_permission and is_owner(user_id, resource_owner_id):
        return has_permission(user_role, edit_own_permission)
    
    return False


# ============================================
# ROLE HIERARCHY
# ============================================

ROLE_HIERARCHY = {
    "admin": 100,
    "project_manager": 90,
    "superintendent": 85,
    "foreman": 70,
    "project_engineer": 70,
    "accounting": 60,
    "logistics": 50,
    "document_controller": 50,
    "service_dispatcher": 50,
    "field_worker": 10,
}


def can_manage_user(manager_role: str, target_role: str) -> bool:
    """Check if a user can manage another user based on role hierarchy"""
    manager_level = ROLE_HIERARCHY.get(manager_role, 0)
    target_level = ROLE_HIERARCHY.get(target_role, 0)
    return manager_level > target_level


def get_permission_summary(role: str) -> dict:
    """Get grouped permission summary for a role (useful for frontend)"""
    perms = get_user_permissions(role)
    summary = {}
    for perm in perms:
        category, action = perm.value.split(":")
        if category not in summary:
            summary[category] = []
        summary[category].append(action)
    return summary
