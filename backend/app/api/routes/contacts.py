"""
Contacts & Site Locations API Routes
Handles vendors, customers, site contacts, and location history
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Contact, ContactType, SiteLocation, Project, User
from pydantic import BaseModel

router = APIRouter()


# ============================================
# SCHEMAS
# ============================================

class ContactBase(BaseModel):
    contact_type: str
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    vendor_category: Optional[str] = None
    is_approved_vendor: Optional[bool] = True
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactResponse(ContactBase):
    id: int
    times_used: int
    last_used_at: Optional[datetime]
    is_active: bool
    display_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class SiteLocationBase(BaseModel):
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_name: Optional[str] = None
    building_type: Optional[str] = None
    parking_notes: Optional[str] = None
    access_instructions: Optional[str] = None
    gate_code: Optional[str] = None
    loading_dock_info: Optional[str] = None
    building_engineer_name: Optional[str] = None
    building_engineer_phone: Optional[str] = None
    security_phone: Optional[str] = None


class SiteLocationCreate(SiteLocationBase):
    pass


class SiteLocationResponse(SiteLocationBase):
    id: int
    project_count: int
    last_project_date: Optional[datetime]
    
    class Config:
        from_attributes = True


class PreviousJobInfo(BaseModel):
    """Info from previous jobs at the same location"""
    project_id: int
    project_name: str
    project_number: Optional[str]
    completed_date: Optional[datetime]
    site_contact_name: Optional[str]
    site_contact_phone: Optional[str]
    gc_contact_name: Optional[str]
    gc_contact_phone: Optional[str]
    parking_notes: Optional[str]
    access_instructions: Optional[str]
    gate_code: Optional[str]
    client_name: Optional[str]


class LocationSuggestion(BaseModel):
    """Suggestion for a location based on address or coordinates"""
    site_location: Optional[SiteLocationResponse] = None
    previous_jobs: List[PreviousJobInfo] = []
    distance_meters: Optional[float] = None


# ============================================
# HELPER FUNCTIONS
# ============================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


# ============================================
# CONTACT ROUTES
# ============================================

@router.get("/contacts", response_model=List[ContactResponse])
def list_contacts(
    contact_type: Optional[str] = None,
    search: Optional[str] = None,
    vendor_category: Optional[str] = None,
    is_approved: Optional[bool] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List contacts with optional filters"""
    query = db.query(Contact).filter(Contact.is_active == True)
    
    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)
    
    if vendor_category:
        query = query.filter(Contact.vendor_category == vendor_category)
    
    if is_approved is not None:
        query = query.filter(Contact.is_approved_vendor == is_approved)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.company_name.ilike(search_term),
                Contact.first_name.ilike(search_term),
                Contact.last_name.ilike(search_term),
                Contact.email.ilike(search_term)
            )
        )
    
    # Order by most recently used
    contacts = query.order_by(Contact.times_used.desc(), Contact.company_name).limit(limit).all()
    
    # Add display_name to response
    for contact in contacts:
        contact.display_name = contact.display_name
    
    return contacts


@router.post("/contacts", response_model=ContactResponse)
def create_contact(
    contact: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new contact"""
    db_contact = Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    contact_update: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact_update.dict(exclude_unset=True).items():
        setattr(contact, key, value)
    
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/contacts/{contact_id}/use")
def mark_contact_used(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a contact as used (increment usage counter)"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.times_used = (contact.times_used or 0) + 1
    contact.last_used_at = datetime.utcnow()
    db.commit()
    
    return {"status": "ok", "times_used": contact.times_used}


# ============================================
# VENDOR ROUTES (Specialized contact queries)
# ============================================

@router.get("/vendors", response_model=List[ContactResponse])
def list_vendors(
    category: Optional[str] = None,
    approved_only: bool = True,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List vendors (filtered contacts)"""
    query = db.query(Contact).filter(
        Contact.contact_type == ContactType.VENDOR,
        Contact.is_active == True
    )
    
    if approved_only:
        query = query.filter(Contact.is_approved_vendor == True)
    
    if category:
        query = query.filter(Contact.vendor_category == category)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.company_name.ilike(search_term),
                Contact.first_name.ilike(search_term)
            )
        )
    
    return query.order_by(Contact.times_used.desc(), Contact.company_name).limit(limit).all()


@router.get("/vendors/categories")
def list_vendor_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all vendor categories in use"""
    categories = db.query(Contact.vendor_category).filter(
        Contact.contact_type == ContactType.VENDOR,
        Contact.vendor_category.isnot(None),
        Contact.is_active == True
    ).distinct().all()
    
    return [c[0] for c in categories if c[0]]


# ============================================
# CUSTOMER ROUTES (Specialized contact queries)
# ============================================

@router.get("/customers", response_model=List[ContactResponse])
def list_customers(
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List customers (filtered contacts)"""
    query = db.query(Contact).filter(
        Contact.contact_type == ContactType.CUSTOMER,
        Contact.is_active == True
    )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.company_name.ilike(search_term),
                Contact.first_name.ilike(search_term),
                Contact.last_name.ilike(search_term)
            )
        )
    
    return query.order_by(Contact.times_used.desc(), Contact.company_name).limit(limit).all()


# ============================================
# SITE LOCATION ROUTES
# ============================================

@router.get("/site-locations", response_model=List[SiteLocationResponse])
def list_site_locations(
    search: Optional[str] = None,
    building_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List saved site locations"""
    query = db.query(SiteLocation)
    
    if building_type:
        query = query.filter(SiteLocation.building_type == building_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SiteLocation.address.ilike(search_term),
                SiteLocation.building_name.ilike(search_term),
                SiteLocation.city.ilike(search_term)
            )
        )
    
    return query.order_by(SiteLocation.project_count.desc()).limit(limit).all()


@router.post("/site-locations", response_model=SiteLocationResponse)
def create_site_location(
    location: SiteLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new site location"""
    db_location = SiteLocation(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@router.get("/site-locations/nearby", response_model=List[SiteLocationResponse])
def find_nearby_locations(
    latitude: float,
    longitude: float,
    radius_meters: int = Query(default=500, le=10000),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find site locations near given coordinates"""
    # Get all locations with coordinates
    locations = db.query(SiteLocation).filter(
        SiteLocation.latitude.isnot(None),
        SiteLocation.longitude.isnot(None)
    ).all()
    
    # Calculate distances and filter
    nearby = []
    for loc in locations:
        distance = haversine_distance(latitude, longitude, loc.latitude, loc.longitude)
        if distance <= radius_meters:
            nearby.append((loc, distance))
    
    # Sort by distance and return
    nearby.sort(key=lambda x: x[1])
    return [loc for loc, _ in nearby[:limit]]


# ============================================
# COPY FROM PREVIOUS JOB
# ============================================

@router.get("/locations/lookup", response_model=LocationSuggestion)
def lookup_location(
    address: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_meters: int = Query(default=200, le=5000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Look up location info - finds previous jobs and site data.
    Uses either address text match or GPS coordinates.
    This is the main "Copy from Previous Job" endpoint.
    """
    previous_jobs: List[PreviousJobInfo] = []
    site_location: Optional[SiteLocation] = None
    distance: Optional[float] = None
    
    # Search by coordinates (GPS)
    if latitude is not None and longitude is not None:
        # Find nearby site locations
        locations = db.query(SiteLocation).filter(
            SiteLocation.latitude.isnot(None),
            SiteLocation.longitude.isnot(None)
        ).all()
        
        for loc in locations:
            dist = haversine_distance(latitude, longitude, loc.latitude, loc.longitude)
            if dist <= radius_meters:
                if site_location is None or dist < distance:
                    site_location = loc
                    distance = dist
        
        # Find nearby projects
        projects = db.query(Project).filter(
            Project.latitude.isnot(None),
            Project.longitude.isnot(None)
        ).all()
        
        for proj in projects:
            dist = haversine_distance(latitude, longitude, proj.latitude, proj.longitude)
            if dist <= radius_meters:
                previous_jobs.append(PreviousJobInfo(
                    project_id=proj.id,
                    project_name=proj.name,
                    project_number=proj.number,
                    completed_date=proj.actual_completion,
                    site_contact_name=proj.site_contact_name,
                    site_contact_phone=proj.site_contact_phone,
                    gc_contact_name=proj.gc_contact_name,
                    gc_contact_phone=proj.gc_contact_phone,
                    parking_notes=proj.parking_notes,
                    access_instructions=proj.access_instructions,
                    gate_code=proj.gate_code,
                    client_name=proj.client_name
                ))
    
    # Search by address text
    if address:
        # Normalize address for comparison
        address_lower = address.lower().strip()
        
        # Find matching site location
        site_location = db.query(SiteLocation).filter(
            func.lower(SiteLocation.address).contains(address_lower)
        ).first()
        
        # Find previous projects at this address
        matching_projects = db.query(Project).filter(
            or_(
                func.lower(Project.address).contains(address_lower),
                func.lower(Project.name).contains(address_lower)
            )
        ).order_by(Project.created_at.desc()).limit(10).all()
        
        for proj in matching_projects:
            # Don't add duplicates if we already found by GPS
            if not any(pj.project_id == proj.id for pj in previous_jobs):
                previous_jobs.append(PreviousJobInfo(
                    project_id=proj.id,
                    project_name=proj.name,
                    project_number=proj.number,
                    completed_date=proj.actual_completion,
                    site_contact_name=proj.site_contact_name,
                    site_contact_phone=proj.site_contact_phone,
                    gc_contact_name=proj.gc_contact_name,
                    gc_contact_phone=proj.gc_contact_phone,
                    parking_notes=proj.parking_notes,
                    access_instructions=proj.access_instructions,
                    gate_code=proj.gate_code,
                    client_name=proj.client_name
                ))
    
    return LocationSuggestion(
        site_location=site_location,
        previous_jobs=previous_jobs,
        distance_meters=distance
    )


@router.post("/locations/save-from-project/{project_id}", response_model=SiteLocationResponse)
def save_location_from_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a project's location info as a reusable SiteLocation"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if location already exists
    existing = None
    if project.latitude and project.longitude:
        locations = db.query(SiteLocation).filter(
            SiteLocation.latitude.isnot(None)
        ).all()
        for loc in locations:
            if haversine_distance(project.latitude, project.longitude, loc.latitude, loc.longitude) < 50:
                existing = loc
                break
    
    if existing:
        # Update existing location with latest info
        if project.parking_notes:
            existing.parking_notes = project.parking_notes
        if project.access_instructions:
            existing.access_instructions = project.access_instructions
        if project.gate_code:
            existing.gate_code = project.gate_code
        if project.site_contact_name:
            existing.building_engineer_name = project.site_contact_name
        if project.site_contact_phone:
            existing.building_engineer_phone = project.site_contact_phone
        existing.project_count = (existing.project_count or 0) + 1
        existing.last_project_date = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new site location
    site_location = SiteLocation(
        address=project.address,
        city=project.city,
        state=project.state,
        zip_code=project.zip_code,
        latitude=project.latitude,
        longitude=project.longitude,
        building_name=project.name,
        parking_notes=project.parking_notes,
        access_instructions=project.access_instructions,
        gate_code=project.gate_code,
        building_engineer_name=project.site_contact_name,
        building_engineer_phone=project.site_contact_phone,
        project_count=1,
        last_project_date=datetime.utcnow()
    )
    
    db.add(site_location)
    db.commit()
    db.refresh(site_location)
    
    # Update project with site location reference
    project.site_location_id = site_location.id
    db.commit()
    
    return site_location
