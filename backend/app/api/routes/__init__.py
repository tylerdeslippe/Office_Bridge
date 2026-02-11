from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.daily_reports import router as daily_reports_router
from app.api.routes.photos import router as photos_router
from app.api.routes.contacts import router as contacts_router
from app.api.routes.quotes import router as quotes_router
from app.api.routes.files import router as files_router
from app.api.routes.entities import (
    rfi_router,
    change_router,
    punch_router,
    delivery_router,
    constraint_router,
    decision_router,
    cost_code_router,
    service_router,
)

__all__ = [
    "auth_router",
    "projects_router",
    "tasks_router",
    "daily_reports_router",
    "photos_router",
    "contacts_router",
    "quotes_router",
    "files_router",
    "rfi_router",
    "change_router",
    "punch_router",
    "delivery_router",
    "constraint_router",
    "decision_router",
    "cost_code_router",
    "service_router",
]
