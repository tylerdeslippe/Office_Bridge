"""
Office Bridge - Main Application Entry Point
Field-to-Office Bridge for Construction Management
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import init_db
from app.api import (
    auth_router,
    projects_router,
    tasks_router,
    daily_reports_router,
    photos_router,
    contacts_router,
    quotes_router,
    files_router,
    companies_router,
    developer_router,
    feedback_router,
    rfi_router,
    change_router,
    punch_router,
    delivery_router,
    constraint_router,
    decision_router,
    cost_code_router,
    service_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle - startup and shutdown"""
    # Startup
    await init_db()
    
    # Ensure upload directories exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "photos"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "documents"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "drawings"), exist_ok=True)
    
    yield
    
    # Shutdown (cleanup if needed)


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Office Bridge API
    
    Field-to-Office bridge for construction project management.
    
    ### Features:
    - **Daily Reports**: Quick 5-10 minute field entry for crew counts, work completed, delays
    - **Task Management**: Assignable to-do lists with acknowledgment workflow
    - **Photo Documentation**: Progress photos with annotations and markup
    - **Document Control**: Drawings, specs, redlines with revision tracking
    - **RFI Workflow**: Field submits, office routes and tracks
    - **Change Management**: Potential changes captured in field, priced in office
    - **Punch Lists**: Quality checkpoints with photo documentation
    - **Deliveries**: Material look-ahead and receiving confirmation
    - **Constraints**: Weekly look-ahead planning with constraint tracking
    - **Decision Log**: Proof of decisions for dispute prevention
    - **Service Dispatch**: Callback and service work management
    - **Company Sync**: Team data synchronization across devices
    - **Beta Feedback**: In-app feedback collection
    """,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(tasks_router, prefix=settings.API_V1_PREFIX)
app.include_router(daily_reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(photos_router, prefix=settings.API_V1_PREFIX)
app.include_router(contacts_router, prefix=settings.API_V1_PREFIX)
app.include_router(quotes_router, prefix=settings.API_V1_PREFIX)
app.include_router(files_router, prefix=settings.API_V1_PREFIX)
app.include_router(companies_router, prefix=settings.API_V1_PREFIX)
app.include_router(developer_router, prefix=settings.API_V1_PREFIX)
app.include_router(feedback_router, prefix=settings.API_V1_PREFIX)
app.include_router(rfi_router, prefix=settings.API_V1_PREFIX)
app.include_router(change_router, prefix=settings.API_V1_PREFIX)
app.include_router(punch_router, prefix=settings.API_V1_PREFIX)
app.include_router(delivery_router, prefix=settings.API_V1_PREFIX)
app.include_router(constraint_router, prefix=settings.API_V1_PREFIX)
app.include_router(decision_router, prefix=settings.API_V1_PREFIX)
app.include_router(cost_code_router, prefix=settings.API_V1_PREFIX)
app.include_router(service_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check for load balancers"""
    return {"status": "healthy"}
