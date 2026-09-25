from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import configure_logging
from app.routers import (
    addresses,
    admin_orders,
    admin_sellers,
    auth,
    cart,
    categories,
    checkout,
    health,
    orders,
    products,
    seller_orders,
    seller_products,
    sellers,
)

configure_logging()

app = FastAPI(title="Marketplace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(sellers.router)
app.include_router(admin_sellers.router)
app.include_router(seller_products.router)
app.include_router(addresses.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(seller_orders.router)
app.include_router(admin_orders.router)
