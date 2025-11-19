"""Unit tests for the FastAPI concierge bundle engine."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import Settings
from app.models import BundleRecord, CachedDeal, UserPreference, WatchRequest
from app.schemas import (
    BundleConstraints,
    BundlePreferences,
    BundleRequest,
    CarOption,
    FlightOption,
    HotelOption,
)
from app.services import http_clients
from app.services.bundle_engine import BundleEngine
from app.services.deal_cache import DealCache


def _request() -> BundleRequest:
    return BundleRequest(
        origin="SFO",
        destination="LAX",
        departure_date=datetime.utcnow() + timedelta(days=14),
        return_date=datetime.utcnow() + timedelta(days=18),
        budget=1200.0,
        preferences=BundlePreferences(flight_class="economy", hotel_star_rating=[4, 5]),
        constraints=BundleConstraints(adults=2, children=0, rooms=1),
    )


def test_bundle_engine_generates_and_persists(monkeypatch):
    async def _run():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

        async def fake_flights(settings, request):
            return [
                FlightOption(
                    id="flt-1",
                    origin=request.origin or "SFO",
                    destination=request.destination,
                    departure_time=request.departure_date,
                    arrival_time=request.departure_date + timedelta(hours=1),
                    airline="TestAir",
                    flight_class="economy",
                    price=320.0,
                    duration_minutes=60,
                    seats_available=20,
                )
            ]

        async def fake_hotels(settings, request):
            return [
                HotelOption(
                    id="htl-1",
                    name="Hotel Test",
                    star_rating=4.0,
                    price_per_night=180.0,
                    nights=3,
                    amenities=["wifi"],
                    neighborhood="Downtown",
                )
            ]

        async def fake_cars(settings, request):
            return [
                CarOption(
                    id="car-1",
                    provider="TestCars",
                    car_type="sedan",
                    daily_price=45.0,
                    seats=4,
                    transmission="automatic",
                )
            ]

        monkeypatch.setattr(http_clients, "fetch_flights", fake_flights)
        monkeypatch.setattr(http_clients, "fetch_hotels", fake_hotels)
        monkeypatch.setattr(http_clients, "fetch_cars", fake_cars)

        deal_cache = DealCache(factory, redis_client=None)
        engine_service = BundleEngine(Settings(), deal_cache, redis_client=None)

        response = await engine_service.generate(_request(), user_id="user-123")

        assert response.total_results == len(response.bundles)
        assert response.total_results >= 1

        saved = await deal_cache.bundles_for_user("user-123")
        assert len(saved) == response.total_results

        await engine.dispose()

    asyncio.run(_run())
