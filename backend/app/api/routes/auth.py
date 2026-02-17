"""
Office Bridge - Authentication Routes
With mandatory company code for team sync
"""
from datetime import datetime
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User, Company, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================
# SCHEMAS
# ============================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_code: str  # Required for team sync
    phone: Optional[str] = None
    role: Optional[str] = "field_worker"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    company_id: Optional[int] = None
    company_code: Optional[str] = None
    company_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============================================
# ROUTES
# ============================================

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with mandatory company code"""
    
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Find or create company by code
    company = db.query(Company).filter(Company.code == data.company_code).first()
    
    if not company:
        # Create new company with this code
        company = Company(
            name=f"Company {data.company_code}",
            code=data.company_code,
            invite_code=secrets.token_urlsafe(16),
            is_beta=True,
        )
        db.add(company)
        db.commit()
        db.refresh(company)
    
    # Check company user limit
    if len(company.members) >= company.max_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company has reached maximum users"
        )
    
    # Create user
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=UserRole(data.role) if data.role else UserRole.FIELD_WORKER,
        primary_company_id=company.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Add user to company members
    company.members.append(user)
    
    # If this is the first user, make them the owner
    if company.owner_id is None:
        company.owner_id = user.id
    
    db.commit()
    
    # Create token
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "company_id": company.id,
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value,
            company_id=company.id,
            company_code=company.code,
            company_name=company.name,
            created_at=user.created_at.isoformat() if user.created_at else None,
        )
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    
    # Find user
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Get company info
    company = None
    if user.primary_company_id:
        company = db.query(Company).filter(Company.id == user.primary_company_id).first()
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create token
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "company_id": user.primary_company_id,
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value,
            company_id=company.id if company else None,
            company_code=company.code if company else None,
            company_name=company.name if company else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
        )
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(__import__('app.core.security', fromlist=['get_current_user']).get_current_user)
):
    """Get current user info"""
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = None
    if user.primary_company_id:
        company = db.query(Company).filter(Company.id == user.primary_company_id).first()
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        company_id=company.id if company else None,
        company_code=company.code if company else None,
        company_name=company.name if company else None,
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.post("/change-password")
def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(__import__('app.core.security', fromlist=['get_current_user']).get_current_user)
):
    """Change user password"""
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}
