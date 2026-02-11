"""
Office Bridge - Pydantic Schemas for API Request/Response
"""
from datetime import datetime, date, time
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field
from app.models import UserRole, TaskStatus, TaskPriority, ProjectStatus, ChangeStatus, RFIStatus, PunchStatus, DocumentType


# ============================================
# BASE SCHEMAS
# ============================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


# ============================================
# AUTH SCHEMAS
# ============================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.FIELD_WORKER


# ============================================
# USER SCHEMAS
# ============================================

class UserBase(BaseSchema):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    profile_photo_url: Optional[str] = None
    created_at: datetime


class UserListResponse(BaseSchema):
    users: List[UserResponse]
    total: int


# ============================================
# PROJECT SCHEMAS
# ============================================

class ProjectBase(BaseSchema):
    name: str
    number: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    client_name: Optional[str] = None
    general_contractor: Optional[str] = None
    contract_value: Optional[float] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    client_name: Optional[str] = None
    general_contractor: Optional[str] = None
    contract_value: Optional[float] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: int
    status: ProjectStatus
    actual_completion: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseSchema):
    projects: List[ProjectResponse]
    total: int


# ============================================
# TASK SCHEMAS
# ============================================

class TaskBase(BaseSchema):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    project_id: Optional[int] = None
    assignee_id: int


class TaskUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None


class TaskAcknowledge(BaseSchema):
    acknowledged: bool = True


class TaskResponse(TaskBase):
    id: int
    project_id: Optional[int]
    assignee_id: int
    created_by_id: int
    status: TaskStatus
    acknowledged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None
    created_by: Optional[UserResponse] = None


class TaskListResponse(BaseSchema):
    tasks: List[TaskResponse]
    total: int


# ============================================
# DAILY REPORT SCHEMAS
# ============================================

class DailyReportBase(BaseSchema):
    report_date: date
    crew_count: Optional[int] = None
    crew_details: Optional[dict] = None
    work_completed: Optional[str] = None
    quantities_installed: Optional[dict] = None
    areas_worked: Optional[List[str]] = None
    delays_constraints: Optional[str] = None
    safety_incidents: Optional[str] = None
    weather_conditions: Optional[str] = None
    weather_impact: Optional[str] = None
    notes: Optional[str] = None


class DailyReportCreate(DailyReportBase):
    project_id: int


class DailyReportUpdate(BaseSchema):
    crew_count: Optional[int] = None
    crew_details: Optional[dict] = None
    work_completed: Optional[str] = None
    quantities_installed: Optional[dict] = None
    areas_worked: Optional[List[str]] = None
    delays_constraints: Optional[str] = None
    safety_incidents: Optional[str] = None
    weather_conditions: Optional[str] = None
    weather_impact: Optional[str] = None
    notes: Optional[str] = None


class DailyReportResponse(DailyReportBase):
    id: int
    project_id: int
    submitted_by_id: int
    created_at: datetime
    updated_at: datetime


class DailyReportListResponse(BaseSchema):
    reports: List[DailyReportResponse]
    total: int


# ============================================
# TIMECARD SCHEMAS
# ============================================

class TimecardBase(BaseSchema):
    work_date: date
    hours: float
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    description: Optional[str] = None
    is_overtime: bool = False


class TimecardCreate(TimecardBase):
    cost_code_id: int


class TimecardResponse(TimecardBase):
    id: int
    user_id: int
    cost_code_id: int
    is_approved: bool
    created_at: datetime


class TimecardListResponse(BaseSchema):
    timecards: List[TimecardResponse]
    total: int


# ============================================
# PHOTO SCHEMAS
# ============================================

class PhotoBase(BaseSchema):
    location: Optional[str] = None
    area: Optional[str] = None
    caption: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class PhotoCreate(PhotoBase):
    project_id: int


class PhotoUpdate(BaseSchema):
    location: Optional[str] = None
    area: Optional[str] = None
    caption: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    annotations: Optional[List[dict]] = None


class PhotoResponse(PhotoBase):
    id: int
    project_id: int
    file_name: str
    file_path: str
    thumbnail_path: Optional[str] = None
    annotations: Optional[List[dict]] = None
    taken_at: Optional[datetime] = None
    taken_by_id: Optional[int] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    created_at: datetime


class PhotoListResponse(BaseSchema):
    photos: List[PhotoResponse]
    total: int


# ============================================
# DOCUMENT SCHEMAS
# ============================================

class DocumentBase(BaseSchema):
    document_type: DocumentType
    title: str
    document_number: Optional[str] = None
    revision: Optional[str] = None
    discipline: Optional[str] = None
    sheet_number: Optional[str] = None


class DocumentCreate(DocumentBase):
    project_id: int


class DocumentResponse(DocumentBase):
    id: int
    project_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_current: bool
    uploaded_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseSchema):
    documents: List[DocumentResponse]
    total: int


# ============================================
# RFI SCHEMAS
# ============================================

class RFIBase(BaseSchema):
    question: str
    location: Optional[str] = None
    what_needed_to_proceed: Optional[str] = None
    due_date: Optional[date] = None


class RFICreate(RFIBase):
    project_id: int


class RFIUpdate(BaseSchema):
    question: Optional[str] = None
    location: Optional[str] = None
    what_needed_to_proceed: Optional[str] = None
    status: Optional[RFIStatus] = None
    routed_to: Optional[str] = None
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    cost_impact: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    due_date: Optional[date] = None


class RFIResponse(RFIBase):
    id: int
    project_id: int
    rfi_number: Optional[str] = None
    status: RFIStatus
    routed_to: Optional[str] = None
    routed_date: Optional[date] = None
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    answered_date: Optional[date] = None
    submitted_by_id: Optional[int] = None
    cost_impact: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class RFIListResponse(BaseSchema):
    rfis: List[RFIResponse]
    total: int


# ============================================
# CHANGE ORDER SCHEMAS
# ============================================

class ChangeOrderBase(BaseSchema):
    what_changed: str
    why_changed: str
    location: Optional[str] = None
    time_material_impact: Optional[str] = None


class ChangeOrderCreate(ChangeOrderBase):
    project_id: int


class ChangeOrderUpdate(BaseSchema):
    what_changed: Optional[str] = None
    why_changed: Optional[str] = None
    location: Optional[str] = None
    time_material_impact: Optional[str] = None
    status: Optional[ChangeStatus] = None
    priced_amount: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    schedule_impact_statement: Optional[str] = None


class ChangeOrderResponse(ChangeOrderBase):
    id: int
    project_id: int
    change_number: Optional[str] = None
    status: ChangeStatus
    priced_amount: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    schedule_impact_statement: Optional[str] = None
    submitted_date: Optional[date] = None
    approved_date: Optional[date] = None
    approved_amount: Optional[float] = None
    submitted_by_id: Optional[int] = None
    priced_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ChangeOrderListResponse(BaseSchema):
    changes: List[ChangeOrderResponse]
    total: int


# ============================================
# PUNCH ITEM SCHEMAS
# ============================================

class PunchItemBase(BaseSchema):
    description: str
    location: Optional[str] = None
    area: Optional[str] = None
    responsible_party: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None
    category: Optional[str] = None


class PunchItemCreate(PunchItemBase):
    project_id: int
    assigned_to_id: Optional[int] = None


class PunchItemUpdate(BaseSchema):
    description: Optional[str] = None
    location: Optional[str] = None
    area: Optional[str] = None
    responsible_party: Optional[str] = None
    status: Optional[PunchStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    category: Optional[str] = None


class PunchItemResponse(PunchItemBase):
    id: int
    project_id: int
    assigned_to_id: Optional[int] = None
    status: PunchStatus
    completed_date: Optional[date] = None
    verified_date: Optional[date] = None
    verified_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PunchItemListResponse(BaseSchema):
    punch_items: List[PunchItemResponse]
    total: int


# ============================================
# DELIVERY SCHEMAS
# ============================================

class DeliveryBase(BaseSchema):
    po_number: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    expected_date: Optional[date] = None
    staging_location: Optional[str] = None
    quantity_ordered: Optional[int] = None


class DeliveryCreate(DeliveryBase):
    project_id: int


class DeliveryUpdate(BaseSchema):
    po_number: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    expected_date: Optional[date] = None
    actual_date: Optional[date] = None
    staging_location: Optional[str] = None
    quantity_ordered: Optional[int] = None
    quantity_received: Optional[int] = None
    has_damage: Optional[bool] = None
    has_shortage: Optional[bool] = None
    issue_notes: Optional[str] = None


class DeliveryResponse(DeliveryBase):
    id: int
    project_id: int
    actual_date: Optional[date] = None
    received_by_id: Optional[int] = None
    quantity_received: Optional[int] = None
    has_damage: bool
    has_shortage: bool
    issue_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DeliveryListResponse(BaseSchema):
    deliveries: List[DeliveryResponse]
    total: int


# ============================================
# CONSTRAINT SCHEMAS
# ============================================

class ConstraintBase(BaseSchema):
    description: str
    constraint_type: Optional[str] = None
    area: Optional[str] = None
    owner_name: Optional[str] = None
    due_date: Optional[date] = None


class ConstraintCreate(ConstraintBase):
    project_id: int
    owner_id: Optional[int] = None


class ConstraintUpdate(BaseSchema):
    description: Optional[str] = None
    constraint_type: Optional[str] = None
    area: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    due_date: Optional[date] = None
    is_resolved: Optional[bool] = None
    resolution_notes: Optional[str] = None


class ConstraintResponse(ConstraintBase):
    id: int
    project_id: int
    owner_id: Optional[int] = None
    is_resolved: bool
    resolved_date: Optional[date] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ConstraintListResponse(BaseSchema):
    constraints: List[ConstraintResponse]
    total: int


# ============================================
# DECISION LOG SCHEMAS
# ============================================

class DecisionLogBase(BaseSchema):
    decision_date: date
    decision: str
    approved_by: str
    affects_cost: bool = False
    affects_schedule: bool = False
    affects_quality: bool = False
    impact_details: Optional[str] = None
    reference_documents: Optional[List[Any]] = None


class DecisionLogCreate(DecisionLogBase):
    project_id: int
    approved_by_id: Optional[int] = None


class DecisionLogResponse(DecisionLogBase):
    id: int
    project_id: int
    approved_by_id: Optional[int] = None
    created_at: datetime


class DecisionLogListResponse(BaseSchema):
    decisions: List[DecisionLogResponse]
    total: int


# ============================================
# COST CODE SCHEMAS
# ============================================

class CostCodeBase(BaseSchema):
    code: str
    description: str
    budgeted_hours: Optional[float] = None
    budgeted_amount: Optional[float] = None


class CostCodeCreate(CostCodeBase):
    project_id: int


class CostCodeResponse(CostCodeBase):
    id: int
    project_id: int
    is_active: bool


class CostCodeListResponse(BaseSchema):
    cost_codes: List[CostCodeResponse]
    total: int


# ============================================
# SERVICE CALL SCHEMAS
# ============================================

class ServiceCallBase(BaseSchema):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    issue_description: str
    priority: TaskPriority = TaskPriority.MEDIUM
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None


class ServiceCallCreate(ServiceCallBase):
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class ServiceCallUpdate(BaseSchema):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    issue_description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    assigned_to_id: Optional[int] = None
    is_completed: Optional[bool] = None
    resolution_notes: Optional[str] = None


class ServiceCallResponse(ServiceCallBase):
    id: int
    project_id: Optional[int] = None
    call_number: Optional[str] = None
    assigned_to_id: Optional[int] = None
    is_completed: bool
    completed_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ServiceCallListResponse(BaseSchema):
    service_calls: List[ServiceCallResponse]
    total: int


# Update forward references
TokenResponse.model_rebuild()
