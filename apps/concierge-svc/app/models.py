"""SQLModel table definitions for the concierge service."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, SQLModel


class BundleRecord(SQLModel, table=True):
    __tablename__ = "bundles"

    id: str = Field(default=None, primary_key=True)
    search_id: str = Field(index=True)
    user_id: Optional[str] = Field(default=None, index=True)
    destination: str = Field(index=True)
    total_price: float
    savings: float
    fit_score: float
    explanation: str
    components: dict = Field(default_factory=dict, sa_column=Column(JSON))
    valid_until: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserPreference(SQLModel, table=True):
    __tablename__ = "user_preferences"

    user_id: str = Field(primary_key=True)
    destination: Optional[str] = None
    preferences: dict = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WatchRequest(SQLModel, table=True):
    __tablename__ = "watch_requests"

    id: str = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    destination: str
    budget_ceiling: float
    min_fit_score: float = Field(default=60)
    notify_on_inventory_below: Optional[int] = Field(default=5)
    active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_triggered_at: Optional[datetime] = None


class CachedDeal(SQLModel, table=True):
    __tablename__ = "cached_deals"

    deal_id: str = Field(primary_key=True)
    type: str
    destination: str = Field(index=True)
    summary: str
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    score: float = Field(default=0)
    price_value: float
    inventory: Optional[int] = None
    valid_until: datetime
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
