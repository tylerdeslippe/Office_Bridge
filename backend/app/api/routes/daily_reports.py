"""
Office Bridge - Daily Report Routes
The critical field-to-office bridge
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core import get_db, get_current_user
from app.models import DailyReport
from app.schemas import (
    DailyReportCreate, DailyReportUpdate, DailyReportResponse, DailyReportListResponse
)

router = APIRouter(prefix="/daily-reports", tags=["Daily Reports"])


@router.get("", response_model=DailyReportListResponse)
async def list_daily_reports(
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    submitted_by_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List daily reports with filters"""
    query = select(DailyReport)
    
    if project_id:
        query = query.where(DailyReport.project_id == project_id)
    if start_date:
        query = query.where(DailyReport.report_date >= start_date)
    if end_date:
        query = query.where(DailyReport.report_date <= end_date)
    if submitted_by_id:
        query = query.where(DailyReport.submitted_by_id == submitted_by_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(DailyReport.report_date.desc())
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return DailyReportListResponse(reports=reports, total=total)


@router.post("", response_model=DailyReportResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_report(
    data: DailyReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Submit a daily report (5-10 minute field entry)"""
    # Check if report already exists for this project/date
    existing = await db.execute(
        select(DailyReport).where(
            DailyReport.project_id == data.project_id,
            DailyReport.report_date == data.report_date,
            DailyReport.submitted_by_id == int(current_user["sub"])
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Daily report already exists for this date. Use PATCH to update."
        )
    
    report = DailyReport(
        **data.model_dump(),
        submitted_by_id=int(current_user["sub"])
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{report_id}", response_model=DailyReportResponse)
async def get_daily_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific daily report"""
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")
    
    return report


@router.patch("/{report_id}", response_model=DailyReportResponse)
async def update_daily_report(
    report_id: int,
    data: DailyReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a daily report"""
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(report, field, value)
    
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a daily report"""
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Daily report not found")
    
    await db.delete(report)
    await db.commit()
