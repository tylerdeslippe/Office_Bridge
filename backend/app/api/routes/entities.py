"""
Office Bridge - Additional Entity Routes
RFIs, Change Orders, Punch Items, Deliveries, Constraints, Decisions
"""
from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core import get_db, get_current_user
from app.models import (
    RFI, RFIStatus, ChangeOrder, ChangeStatus, PunchItem, PunchStatus,
    Delivery, Constraint, DecisionLog, CostCode, ServiceCall
)
from app.schemas import (
    RFICreate, RFIUpdate, RFIResponse, RFIListResponse,
    ChangeOrderCreate, ChangeOrderUpdate, ChangeOrderResponse, ChangeOrderListResponse,
    PunchItemCreate, PunchItemUpdate, PunchItemResponse, PunchItemListResponse,
    DeliveryCreate, DeliveryUpdate, DeliveryResponse, DeliveryListResponse,
    ConstraintCreate, ConstraintUpdate, ConstraintResponse, ConstraintListResponse,
    DecisionLogCreate, DecisionLogResponse, DecisionLogListResponse,
    CostCodeCreate, CostCodeResponse, CostCodeListResponse,
    ServiceCallCreate, ServiceCallUpdate, ServiceCallResponse, ServiceCallListResponse,
)

# ============================================
# RFI ROUTES
# ============================================

rfi_router = APIRouter(prefix="/rfis", tags=["RFIs"])


@rfi_router.get("", response_model=RFIListResponse)
async def list_rfis(
    project_id: Optional[int] = None,
    status: Optional[RFIStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(RFI)
    if project_id:
        query = query.where(RFI.project_id == project_id)
    if status:
        query = query.where(RFI.status == status)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(RFI.created_at.desc())
    result = await db.execute(query)
    rfis = result.scalars().all()
    
    return RFIListResponse(rfis=rfis, total=total)


@rfi_router.post("", response_model=RFIResponse, status_code=status.HTTP_201_CREATED)
async def create_rfi(
    data: RFICreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Generate RFI number
    count = await db.scalar(
        select(func.count()).where(RFI.project_id == data.project_id)
    )
    rfi_number = f"RFI-{(count or 0) + 1:04d}"
    
    rfi = RFI(
        **data.model_dump(),
        rfi_number=rfi_number,
        submitted_by_id=int(current_user["sub"])
    )
    db.add(rfi)
    await db.commit()
    await db.refresh(rfi)
    return rfi


@rfi_router.get("/{rfi_id}", response_model=RFIResponse)
async def get_rfi(
    rfi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    return rfi


@rfi_router.patch("/{rfi_id}", response_model=RFIResponse)
async def update_rfi(
    rfi_id: int,
    data: RFIUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Auto-set dates based on status
    if "status" in update_data:
        if update_data["status"] == RFIStatus.ROUTED and not rfi.routed_date:
            rfi.routed_date = date.today()
        if update_data["status"] == RFIStatus.ANSWERED and not rfi.answered_date:
            rfi.answered_date = date.today()
    
    for field, value in update_data.items():
        setattr(rfi, field, value)
    
    await db.commit()
    await db.refresh(rfi)
    return rfi


# ============================================
# CHANGE ORDER ROUTES
# ============================================

change_router = APIRouter(prefix="/changes", tags=["Change Orders"])


@change_router.get("", response_model=ChangeOrderListResponse)
async def list_changes(
    project_id: Optional[int] = None,
    status: Optional[ChangeStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(ChangeOrder)
    if project_id:
        query = query.where(ChangeOrder.project_id == project_id)
    if status:
        query = query.where(ChangeOrder.status == status)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(ChangeOrder.created_at.desc())
    result = await db.execute(query)
    changes = result.scalars().all()
    
    return ChangeOrderListResponse(changes=changes, total=total)


@change_router.post("", response_model=ChangeOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_change(
    data: ChangeOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    count = await db.scalar(
        select(func.count()).where(ChangeOrder.project_id == data.project_id)
    )
    change_number = f"PCO-{(count or 0) + 1:04d}"
    
    change = ChangeOrder(
        **data.model_dump(),
        change_number=change_number,
        submitted_by_id=int(current_user["sub"])
    )
    db.add(change)
    await db.commit()
    await db.refresh(change)
    return change


@change_router.get("/{change_id}", response_model=ChangeOrderResponse)
async def get_change(
    change_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(ChangeOrder).where(ChangeOrder.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change order not found")
    return change


@change_router.patch("/{change_id}", response_model=ChangeOrderResponse)
async def update_change(
    change_id: int,
    data: ChangeOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(ChangeOrder).where(ChangeOrder.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change order not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(change, field, value)
    
    await db.commit()
    await db.refresh(change)
    return change


# ============================================
# PUNCH ITEM ROUTES
# ============================================

punch_router = APIRouter(prefix="/punch-items", tags=["Punch Items"])


@punch_router.get("", response_model=PunchItemListResponse)
async def list_punch_items(
    project_id: Optional[int] = None,
    status: Optional[PunchStatus] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(PunchItem)
    if project_id:
        query = query.where(PunchItem.project_id == project_id)
    if status:
        query = query.where(PunchItem.status == status)
    if category:
        query = query.where(PunchItem.category == category)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(PunchItem.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PunchItemListResponse(punch_items=items, total=total)


@punch_router.post("", response_model=PunchItemResponse, status_code=status.HTTP_201_CREATED)
async def create_punch_item(
    data: PunchItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    punch = PunchItem(**data.model_dump())
    db.add(punch)
    await db.commit()
    await db.refresh(punch)
    return punch


@punch_router.patch("/{punch_id}", response_model=PunchItemResponse)
async def update_punch_item(
    punch_id: int,
    data: PunchItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(PunchItem).where(PunchItem.id == punch_id))
    punch = result.scalar_one_or_none()
    if not punch:
        raise HTTPException(status_code=404, detail="Punch item not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        if update_data["status"] == PunchStatus.COMPLETED:
            punch.completed_date = date.today()
        if update_data["status"] == PunchStatus.VERIFIED:
            punch.verified_date = date.today()
            punch.verified_by_id = int(current_user["sub"])
    
    for field, value in update_data.items():
        setattr(punch, field, value)
    
    await db.commit()
    await db.refresh(punch)
    return punch


# ============================================
# DELIVERY ROUTES
# ============================================

delivery_router = APIRouter(prefix="/deliveries", tags=["Deliveries"])


@delivery_router.get("", response_model=DeliveryListResponse)
async def list_deliveries(
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(Delivery)
    if project_id:
        query = query.where(Delivery.project_id == project_id)
    if start_date:
        query = query.where(Delivery.expected_date >= start_date)
    if end_date:
        query = query.where(Delivery.expected_date <= end_date)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(Delivery.expected_date.asc())
    result = await db.execute(query)
    deliveries = result.scalars().all()
    
    return DeliveryListResponse(deliveries=deliveries, total=total)


@delivery_router.post("", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED)
async def create_delivery(
    data: DeliveryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    delivery = Delivery(**data.model_dump())
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)
    return delivery


@delivery_router.patch("/{delivery_id}", response_model=DeliveryResponse)
async def update_delivery(
    delivery_id: int,
    data: DeliveryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(delivery, field, value)
    
    await db.commit()
    await db.refresh(delivery)
    return delivery


# ============================================
# CONSTRAINT ROUTES
# ============================================

constraint_router = APIRouter(prefix="/constraints", tags=["Constraints"])


@constraint_router.get("", response_model=ConstraintListResponse)
async def list_constraints(
    project_id: Optional[int] = None,
    is_resolved: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(Constraint)
    if project_id:
        query = query.where(Constraint.project_id == project_id)
    if is_resolved is not None:
        query = query.where(Constraint.is_resolved == is_resolved)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(Constraint.due_date.asc())
    result = await db.execute(query)
    constraints = result.scalars().all()
    
    return ConstraintListResponse(constraints=constraints, total=total)


@constraint_router.post("", response_model=ConstraintResponse, status_code=status.HTTP_201_CREATED)
async def create_constraint(
    data: ConstraintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    constraint = Constraint(**data.model_dump())
    db.add(constraint)
    await db.commit()
    await db.refresh(constraint)
    return constraint


@constraint_router.patch("/{constraint_id}", response_model=ConstraintResponse)
async def update_constraint(
    constraint_id: int,
    data: ConstraintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Constraint).where(Constraint.id == constraint_id))
    constraint = result.scalar_one_or_none()
    if not constraint:
        raise HTTPException(status_code=404, detail="Constraint not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "is_resolved" in update_data and update_data["is_resolved"] and not constraint.resolved_date:
        constraint.resolved_date = date.today()
    
    for field, value in update_data.items():
        setattr(constraint, field, value)
    
    await db.commit()
    await db.refresh(constraint)
    return constraint


# ============================================
# DECISION LOG ROUTES
# ============================================

decision_router = APIRouter(prefix="/decisions", tags=["Decision Log"])


@decision_router.get("", response_model=DecisionLogListResponse)
async def list_decisions(
    project_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(DecisionLog)
    if project_id:
        query = query.where(DecisionLog.project_id == project_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(DecisionLog.decision_date.desc())
    result = await db.execute(query)
    decisions = result.scalars().all()
    
    return DecisionLogListResponse(decisions=decisions, total=total)


@decision_router.post("", response_model=DecisionLogResponse, status_code=status.HTTP_201_CREATED)
async def create_decision(
    data: DecisionLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    decision = DecisionLog(**data.model_dump())
    db.add(decision)
    await db.commit()
    await db.refresh(decision)
    return decision


# ============================================
# COST CODE ROUTES
# ============================================

cost_code_router = APIRouter(prefix="/cost-codes", tags=["Cost Codes"])


@cost_code_router.get("", response_model=CostCodeListResponse)
async def list_cost_codes(
    project_id: int,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(CostCode).where(CostCode.project_id == project_id)
    if is_active is not None:
        query = query.where(CostCode.is_active == is_active)
    
    result = await db.execute(query)
    cost_codes = result.scalars().all()
    
    return CostCodeListResponse(cost_codes=cost_codes, total=len(cost_codes))


@cost_code_router.post("", response_model=CostCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_cost_code(
    data: CostCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    cost_code = CostCode(**data.model_dump())
    db.add(cost_code)
    await db.commit()
    await db.refresh(cost_code)
    return cost_code


# ============================================
# SERVICE CALL ROUTES
# ============================================

service_router = APIRouter(prefix="/service-calls", tags=["Service Dispatch"])


@service_router.get("", response_model=ServiceCallListResponse)
async def list_service_calls(
    assigned_to_id: Optional[int] = None,
    is_completed: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(ServiceCall)
    if assigned_to_id:
        query = query.where(ServiceCall.assigned_to_id == assigned_to_id)
    if is_completed is not None:
        query = query.where(ServiceCall.is_completed == is_completed)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset(skip).limit(limit).order_by(ServiceCall.scheduled_date.asc())
    result = await db.execute(query)
    calls = result.scalars().all()
    
    return ServiceCallListResponse(service_calls=calls, total=total)


@service_router.post("", response_model=ServiceCallResponse, status_code=status.HTTP_201_CREATED)
async def create_service_call(
    data: ServiceCallCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    count = await db.scalar(select(func.count()).select_from(ServiceCall))
    call_number = f"SC-{(count or 0) + 1:05d}"
    
    call = ServiceCall(**data.model_dump(), call_number=call_number)
    db.add(call)
    await db.commit()
    await db.refresh(call)
    return call


@service_router.patch("/{call_id}", response_model=ServiceCallResponse)
async def update_service_call(
    call_id: int,
    data: ServiceCallUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await db.execute(select(ServiceCall).where(ServiceCall.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Service call not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "is_completed" in update_data and update_data["is_completed"] and not call.completed_date:
        call.completed_date = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(call, field, value)
    
    await db.commit()
    await db.refresh(call)
    return call
