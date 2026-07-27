from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.categories import router as categories_router
from app.api.v1.services import router as services_router
from app.api.v1.workers import router as workers_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.payments import router as payments_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.search import router as search_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.chat import router as chat_router
from app.api.v1.coupons import router as coupons_router
from app.api.v1.offers import router as offers_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(categories_router)
api_router.include_router(services_router)
api_router.include_router(workers_router)
api_router.include_router(bookings_router)
api_router.include_router(payments_router)
api_router.include_router(uploads_router)
api_router.include_router(wallet_router)
api_router.include_router(search_router)
api_router.include_router(notifications_router)
api_router.include_router(chat_router)
api_router.include_router(coupons_router)
api_router.include_router(offers_router)
api_router.include_router(admin_router)
