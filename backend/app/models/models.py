"""
Office Bridge - Database Models
Comprehensive models for field-to-office construction management
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float,
    ForeignKey, Enum, JSON, Table, Date, Time
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ============================================
# ENUMS
# ============================================

class UserRole(str, enum.Enum):
    PROJECT_MANAGER = "project_manager"
    SUPERINTENDENT = "superintendent"
    FOREMAN = "foreman"
    PROJECT_ENGINEER = "project_engineer"
    ACCOUNTING = "accounting"
    LOGISTICS = "logistics"
    DOCUMENT_CONTROLLER = "document_controller"
    SERVICE_DISPATCHER = "service_dispatcher"
    ADMIN = "admin"
    FIELD_WORKER = "field_worker"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CLOSED = "closed"


class ChangeStatus(str, enum.Enum):
    POTENTIAL = "potential"
    PRICED = "priced"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class RFIStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ROUTED = "routed"
    ANSWERED = "answered"
    CLOSED = "closed"


class PunchStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"


class DocumentType(str, enum.Enum):
    DRAWING = "drawing"
    SPEC = "spec"
    REDLINE = "redline"
    SCOPE_SHEET = "scope_sheet"
    SUBMITTAL = "submittal"
    RFI_ATTACHMENT = "rfi_attachment"
    PHOTO = "photo"
    PACKING_SLIP = "packing_slip"
    OTHER = "other"


# ============================================
# ASSOCIATION TABLES
# ============================================

project_users = Table(
    'project_users',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True)
)


# ============================================
# CORE MODELS
# ============================================

class User(Base):
    """User accounts with role-based access"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.FIELD_WORKER)
    is_active = Column(Boolean, default=True)
    profile_photo_url = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    projects = relationship("Project", secondary=project_users, back_populates="team_members")
    assigned_tasks = relationship("Task", foreign_keys="Task.assignee_id", back_populates="assignee")
    created_tasks = relationship("Task", foreign_keys="Task.created_by_id", back_populates="created_by")
    daily_reports = relationship("DailyReport", back_populates="submitted_by")
    timecards = relationship("Timecard", foreign_keys="[Timecard.user_id]", back_populates="user")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Project(Base):
    """Construction projects"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    number = Column(String(50), unique=True, index=True)  # Job number
    description = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANNING)
    
    # Location
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    site_location_id = Column(Integer, ForeignKey("site_locations.id"))
    
    # Project details
    client_name = Column(String(255))
    general_contractor = Column(String(255))
    contract_value = Column(Float)
    job_type = Column(String(50))  # Template type used
    
    # Site logistics (copied from SiteLocation or entered fresh)
    parking_notes = Column(Text)
    access_instructions = Column(Text)
    gate_code = Column(String(50))
    delivery_location = Column(Text)
    
    # Site contacts
    site_contact_name = Column(String(255))
    site_contact_phone = Column(String(20))
    gc_contact_name = Column(String(255))
    gc_contact_phone = Column(String(20))
    
    # Technical specs (for HVAC projects)
    technical_specs = Column(JSON)  # pressure_class, duct_material, controls_vendor, etc.
    
    # Equipment scheduling
    equipment_schedule = Column(JSON)  # crane/lift dates, durations
    
    # Dates
    start_date = Column(Date)
    target_completion = Column(Date)
    actual_completion = Column(Date)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team_members = relationship("User", secondary=project_users, back_populates="projects")
    cost_codes = relationship("CostCode", back_populates="project")
    daily_reports = relationship("DailyReport", back_populates="project")
    documents = relationship("Document", back_populates="project")
    photos = relationship("Photo", back_populates="project")
    rfis = relationship("RFI", back_populates="project")
    changes = relationship("ChangeOrder", back_populates="project")
    punch_items = relationship("PunchItem", back_populates="project")
    deliveries = relationship("Delivery", back_populates="project")
    constraints = relationship("Constraint", back_populates="project")
    decisions = relationship("DecisionLog", back_populates="project")
    tasks = relationship("Task", back_populates="project")


class CostCode(Base):
    """Cost codes for time/expense tracking - must match estimate"""
    __tablename__ = "cost_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    budgeted_hours = Column(Float)
    budgeted_amount = Column(Float)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    project = relationship("Project", back_populates="cost_codes")
    timecards = relationship("Timecard", back_populates="cost_code")


# ============================================
# TASK MANAGEMENT
# ============================================

class Task(Base):
    """To-do items assignable by upper management"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Assignment
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Status tracking
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    
    # Dates
    due_date = Column(DateTime)
    acknowledged_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_tasks")


# ============================================
# DAILY FIELD REPORTING
# ============================================

class DailyReport(Base):
    """Daily field reports - the critical field-to-office bridge"""
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_date = Column(Date, nullable=False)
    
    # Crew info
    crew_count = Column(Integer)
    crew_details = Column(JSON)  # {"foreman": 1, "journeyman": 4, "apprentice": 2}
    
    # Work completed
    work_completed = Column(Text)  # Description of installed items
    quantities_installed = Column(JSON)  # {"linear_feet": 500, "fixtures": 12}
    areas_worked = Column(JSON)  # ["Building A Floor 2", "Building B Floor 1"]
    
    # Issues & delays
    delays_constraints = Column(Text)
    safety_incidents = Column(Text)
    
    # Weather
    weather_conditions = Column(String(100))
    weather_impact = Column(Text)
    
    # General notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="daily_reports")
    submitted_by = relationship("User", back_populates="daily_reports")
    delivery_reports = relationship("DeliveryReport", back_populates="daily_report")


class Timecard(Base):
    """Time entries with cost codes - bridges field time to job costing"""
    __tablename__ = "timecards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cost_code_id = Column(Integer, ForeignKey("cost_codes.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    
    # Time
    hours = Column(Float, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    
    # Details
    description = Column(Text)
    is_overtime = Column(Boolean, default=False)
    
    # Approval
    is_approved = Column(Boolean, default=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="timecards")
    cost_code = relationship("CostCode", back_populates="timecards")


# ============================================
# DOCUMENT CONTROL
# ============================================

class Document(Base):
    """Document management - drawings, specs, redlines"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Document info
    document_type = Column(Enum(DocumentType), nullable=False)
    title = Column(String(255), nullable=False)
    document_number = Column(String(100))
    revision = Column(String(20))
    
    # File info
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    
    # Metadata
    discipline = Column(String(100))  # HVAC, Plumbing, Electrical, etc.
    sheet_number = Column(String(50))
    
    # Status
    is_current = Column(Boolean, default=True)
    superseded_by_id = Column(Integer, ForeignKey("documents.id"))
    
    # Uploaded by
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="documents")


class Photo(Base):
    """Photo documentation - progress, problems, as-builts"""
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Photo info
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500))
    
    # Location/context
    location = Column(String(255))  # "Building A, Floor 2, Room 201"
    area = Column(String(100))
    
    # Annotations - stored as JSON for drawing on photos
    annotations = Column(JSON)  # [{type: "text", x: 100, y: 200, content: "Issue here"}]
    caption = Column(Text)
    
    # Categorization
    category = Column(String(100))  # "progress", "in-wall", "above-ceiling", "equipment", "delivery", "issue"
    tags = Column(JSON)  # ["milestone", "weekly", "pre-cover"]
    
    # Metadata
    taken_at = Column(DateTime)
    taken_by_id = Column(Integer, ForeignKey("users.id"))
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="photos")


# ============================================
# CHANGE MANAGEMENT
# ============================================

class ChangeOrder(Base):
    """Change management - field finds it, office prices it"""
    __tablename__ = "change_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Change info (4 items from field)
    change_number = Column(String(50))
    what_changed = Column(Text, nullable=False)
    why_changed = Column(Text, nullable=False)
    location = Column(String(255))  # drawing/room/grid
    time_material_impact = Column(Text)  # Field's initial guess
    
    # Office pricing
    status = Column(Enum(ChangeStatus), default=ChangeStatus.POTENTIAL)
    priced_amount = Column(Float)
    schedule_impact_days = Column(Integer)
    schedule_impact_statement = Column(Text)
    
    # Approval tracking
    submitted_date = Column(Date)
    approved_date = Column(Date)
    approved_amount = Column(Float)
    
    # People
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    priced_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="changes")
    photos = relationship("ChangePhoto", back_populates="change_order")


class ChangePhoto(Base):
    """Photos attached to change orders"""
    __tablename__ = "change_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    change_order_id = Column(Integer, ForeignKey("change_orders.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    
    change_order = relationship("ChangeOrder", back_populates="photos")


# ============================================
# RFI WORKFLOW
# ============================================

class RFI(Base):
    """RFI workflow - bridge for 'we cannot build this as drawn'"""
    __tablename__ = "rfis"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    rfi_number = Column(String(50))
    
    # Field submission
    question = Column(Text, nullable=False)
    location = Column(String(255))  # drawing/area/grid
    what_needed_to_proceed = Column(Text)
    
    # Status tracking
    status = Column(Enum(RFIStatus), default=RFIStatus.DRAFT)
    
    # Routing (office handles)
    routed_to = Column(String(255))  # GC, Engineer, Architect
    routed_date = Column(Date)
    
    # Answer
    answer = Column(Text)
    answered_by = Column(String(255))
    answered_date = Column(Date)
    
    # People
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Impact
    cost_impact = Column(Float)
    schedule_impact_days = Column(Integer)
    
    # Dates
    due_date = Column(Date)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="rfis")


# ============================================
# MATERIALS & LOGISTICS
# ============================================

class Delivery(Base):
    """Delivery tracking - material look-ahead"""
    __tablename__ = "deliveries"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Delivery info
    po_number = Column(String(100))
    vendor = Column(String(255))
    description = Column(Text)
    
    # Scheduling
    expected_date = Column(Date)
    actual_date = Column(Date)
    staging_location = Column(String(255))
    
    # Receiving
    received_by_id = Column(Integer, ForeignKey("users.id"))
    quantity_ordered = Column(Integer)
    quantity_received = Column(Integer)
    
    # Issues
    has_damage = Column(Boolean, default=False)
    has_shortage = Column(Boolean, default=False)
    issue_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="deliveries")


class DeliveryReport(Base):
    """Same-day delivery confirmation for daily reports"""
    __tablename__ = "delivery_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=False)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    
    description = Column(Text)
    quantity_received = Column(Integer)
    condition = Column(String(100))  # "good", "damaged", "partial"
    packing_slip_photo_id = Column(Integer, ForeignKey("photos.id"))
    notes = Column(Text)
    
    daily_report = relationship("DailyReport", back_populates="delivery_reports")


# ============================================
# SCHEDULING & CONSTRAINTS
# ============================================

class Constraint(Base):
    """Constraints log - what must happen for work to proceed"""
    __tablename__ = "constraints"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Constraint info
    description = Column(Text, nullable=False)
    constraint_type = Column(String(100))  # "access", "inspection", "other_trade", "material", "design"
    area = Column(String(255))
    
    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner_name = Column(String(255))  # For external parties
    
    # Dates
    due_date = Column(Date)
    resolved_date = Column(Date)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolution_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="constraints")


# ============================================
# DECISION LOG
# ============================================

class DecisionLog(Base):
    """Decision tracking - proof of 'we decided to do it this way'"""
    __tablename__ = "decision_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Decision info
    decision_date = Column(Date, nullable=False)
    decision = Column(Text, nullable=False)
    
    # Who/what
    approved_by = Column(String(255), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Impact
    affects_cost = Column(Boolean, default=False)
    affects_schedule = Column(Boolean, default=False)
    affects_quality = Column(Boolean, default=False)
    impact_details = Column(Text)
    
    # Documentation
    reference_documents = Column(JSON)  # List of document IDs or descriptions
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="decisions")


# ============================================
# PUNCH LIST & QUALITY
# ============================================

class PunchItem(Base):
    """Punch list items with location and photo"""
    __tablename__ = "punch_items"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Item info
    description = Column(Text, nullable=False)
    location = Column(String(255))
    area = Column(String(100))
    
    # Responsibility
    responsible_party = Column(String(255))
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    
    # Status
    status = Column(Enum(PunchStatus), default=PunchStatus.OPEN)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    
    # Dates
    due_date = Column(Date)
    completed_date = Column(Date)
    verified_date = Column(Date)
    verified_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Category
    category = Column(String(100))  # "rough-in", "trim", "start-up"
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="punch_items")
    photos = relationship("PunchPhoto", back_populates="punch_item")


class PunchPhoto(Base):
    """Photos attached to punch items"""
    __tablename__ = "punch_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    punch_item_id = Column(Integer, ForeignKey("punch_items.id"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    
    punch_item = relationship("PunchItem", back_populates="photos")


# ============================================
# SERVICE DISPATCH
# ============================================

class ServiceCall(Base):
    """Service dispatch for callbacks and service work"""
    __tablename__ = "service_calls"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    # Call info
    call_number = Column(String(50))
    customer_name = Column(String(255))
    customer_phone = Column(String(20))
    customer_address = Column(Text)
    
    # Issue
    issue_description = Column(Text, nullable=False)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    
    # Scheduling
    scheduled_date = Column(Date)
    scheduled_time = Column(Time)
    
    # Completion
    is_completed = Column(Boolean, default=False)
    completed_date = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# CONTACTS & VENDORS
# ============================================

class ContactType(str, enum.Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    GC = "gc"
    SITE_CONTACT = "site_contact"
    ARCHITECT = "architect"
    ENGINEER = "engineer"
    INSPECTOR = "inspector"
    OWNER = "owner"


class Contact(Base):
    """Reusable contacts - customers, vendors, site contacts"""
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Type
    contact_type = Column(Enum(ContactType), nullable=False)
    
    # Company info
    company_name = Column(String(255))
    
    # Person info
    first_name = Column(String(100))
    last_name = Column(String(100))
    title = Column(String(100))
    
    # Contact details
    email = Column(String(255))
    phone = Column(String(20))
    mobile = Column(String(20))
    
    # Address
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    
    # Location (for site contacts)
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Vendor-specific
    vendor_category = Column(String(100))  # "controls", "equipment", "insulation", etc.
    is_approved_vendor = Column(Boolean, default=True)
    
    # Notes
    notes = Column(Text)
    
    # Usage tracking
    times_used = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @property
    def full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.company_name or ""
    
    @property
    def display_name(self):
        if self.company_name and self.first_name:
            return f"{self.company_name} - {self.first_name} {self.last_name}"
        return self.company_name or self.full_name


class ProjectContact(Base):
    """Links contacts to projects with role context"""
    __tablename__ = "project_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    
    # Role on this project
    role = Column(String(100))  # "primary_contact", "backup", "billing", etc.
    is_primary = Column(Boolean, default=False)
    
    # Notes specific to this project
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class SiteLocation(Base):
    """Saved site locations for quick lookup and copy-from-previous"""
    __tablename__ = "site_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Address
    address = Column(String(255), nullable=False)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    
    # Geolocation
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Building/Site info
    building_name = Column(String(255))
    building_type = Column(String(100))  # "office", "hospital", "school", etc.
    
    # Access info (valuable for repeat visits)
    parking_notes = Column(Text)
    access_instructions = Column(Text)
    gate_code = Column(String(50))
    loading_dock_info = Column(Text)
    
    # Key contacts at this location
    building_engineer_name = Column(String(255))
    building_engineer_phone = Column(String(20))
    security_phone = Column(String(20))
    
    # Stats
    project_count = Column(Integer, default=0)
    last_project_date = Column(Date)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# QUOTE REQUESTS (Field to PM)
# ============================================

class QuoteStatus(str, enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    QUOTED = "quoted"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class QuoteRequest(Base):
    """Quick quote requests from field to PM"""
    __tablename__ = "quote_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Request info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Location
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Contact
    customer_name = Column(String(255))
    customer_phone = Column(String(20))
    customer_email = Column(String(255))
    
    # Photos (JSON array of photo URLs/IDs)
    photos = Column(JSON)
    
    # Scope details
    scope_notes = Column(Text)
    urgency = Column(String(50))  # "standard", "rush", "emergency"
    preferred_schedule = Column(String(255))
    
    # Status tracking
    status = Column(Enum(QuoteStatus), default=QuoteStatus.PENDING)
    
    # Assignment
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    
    # Quote details (filled by PM)
    quoted_amount = Column(Float)
    quote_notes = Column(Text)
    quote_valid_until = Column(Date)
    quoted_at = Column(DateTime)
    
    # Conversion
    converted_to_project_id = Column(Integer, ForeignKey("projects.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
