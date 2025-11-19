"""HTTP clients used to fetch listings from other microservices."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Iterable

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import Settings
from ..schemas import BundleRequest, CarOption, FlightOption, HotelOption


def _fallback_flights(request: BundleRequest) -> list[FlightOption]:
    base_departure = request.departure_date
    return [
        FlightOption(
            id="demo-flight-1",
            origin=request.origin or "SFO",
            destination=request.destination,
            departure_time=base_departure,
            arrival_time=base_departure + timedelta(hours=5),
            airline="Kayak Airways",
            flight_class=request.preferences.flight_class,
            price=min(request.budget * 0.35, 450),
            duration_minutes=310,
            seats_available=12,
        )
    ]


def _fallback_hotels(request: BundleRequest) -> list[HotelOption]:
    return [
        HotelOption(
            id="demo-hotel-1",
            name="Kayak Grand",
            star_rating=4.5,
            price_per_night=min(request.budget * 0.3, 280),
            nights=3,
            amenities=["wifi", "breakfast", "parking"],
            neighborhood="Downtown",
        )
    ]


def _fallback_cars(request: BundleRequest) -> list[CarOption]:
    return [
        CarOption(
            id="demo-car-1",
            provider="Kayak Rentals",
            car_type="SUV",
            daily_price=65.0,
            seats=5,
            transmission="automatic",
        )
    ]


async def _post_json(url: str, payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


def _transform_results(raw_items: Iterable[dict[str, Any]], model_cls):
    return [model_cls(**item) for item in raw_items]


def build_search_payload(request: BundleRequest, allocation: float) -> dict[str, Any]:
    return {
        "destination": request.destination,
        "origin": request.origin,
        "departureDate": request.departure_date.isoformat(),
        "returnDate": request.return_date.isoformat() if request.return_date else None,
        "budget": allocation,
        "preferences": request.preferences.model_dump(),
        "constraints": request.constraints.model_dump(),
    }


@retry(wait=wait_exponential(multiplier=0.3, min=0.5, max=3), stop=stop_after_attempt(3))
async def fetch_flights(settings: Settings, request: BundleRequest) -> list[FlightOption]:
    payload = build_search_payload(request, allocation=request.budget * 0.4)
    try:
        data = await _post_json(f"{settings.flights_service_url}/flights/search", payload, settings.request_timeout_seconds)
        flights = data.get("data", {}).get("flights", [])
        return _transform_results(flights, FlightOption) or _fallback_flights(request)
    except Exception:
        return _fallback_flights(request)


@retry(wait=wait_exponential(multiplier=0.3, min=0.5, max=3), stop=stop_after_attempt(3))
async def fetch_hotels(settings: Settings, request: BundleRequest) -> list[HotelOption]:
    payload = build_search_payload(request, allocation=request.budget * 0.4)
    try:
        data = await _post_json(f"{settings.hotels_service_url}/hotels/search", payload, settings.request_timeout_seconds)
        hotels = data.get("data", {}).get("hotels", [])
        return _transform_results(hotels, HotelOption) or _fallback_hotels(request)
    except Exception:
        return _fallback_hotels(request)


@retry(wait=wait_exponential(multiplier=0.3, min=0.5, max=3), stop=stop_after_attempt(3))
async def fetch_cars(settings: Settings, request: BundleRequest) -> list[CarOption]:
    payload = build_search_payload(request, allocation=request.budget * 0.2)
    try:
        data = await _post_json(f"{settings.cars_service_url}/cars/search", payload, settings.request_timeout_seconds)
        cars = data.get("data", {}).get("cars", [])
        return _transform_results(cars, CarOption) or _fallback_cars(request)
    except Exception:
        return _fallback_cars(request)
