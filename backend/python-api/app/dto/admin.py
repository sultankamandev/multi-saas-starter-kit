from __future__ import annotations

from pydantic import BaseModel, Field


class AdminCreateUserRequest(BaseModel):
    first_name: str = ""
    last_name: str = ""
    email: str
    password: str = Field(min_length=8)
    role: str = "user"
    language: str = ""
    verified: bool | None = None


class AdminUpdateUserRequest(BaseModel):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = None
    language: str | None = None
    country: str | None = None
    address: str | None = None
    phone: str | None = None
    verified: bool | None = None
    two_fa_enabled: bool | None = None


class AdminUpdateRoleRequest(BaseModel):
    role: str  # "admin" or "user"


class UserListParams(BaseModel):
    page: int = 1
    limit: int = 10
    sort_field: str = "id"
    sort_order: str = "ASC"
    search: str = ""


class AdminSummary(BaseModel):
    total_users: int
    verified_users: int
    new_users_7_days: int
    verified_percent: float


class UserAnalytics(BaseModel):
    date: str
    registrations: int
    verified: int


class ActiveUserStats(BaseModel):
    date: str
    active_users: int


class ActiveUserAnalyticsResponse(BaseModel):
    daily: list[ActiveUserStats]
    active_24h: int
    active_7d: int


class RetentionStats(BaseModel):
    signup_date: str
    new_users: int
    retained_7d: int
    retained_30d: int
    retention_7_rate: float
    retention_30_rate: float


class RetentionAnalyticsResponse(BaseModel):
    retention_data: list[RetentionStats]
    average_7d: float
    average_30d: float


class CohortRow(BaseModel):
    signup_date: str
    new_users: int
    day_1: float
    day_3: float
    day_7: float
    day_14: float
    day_30: float


class AnalyticsFilter(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
    country: str | None = None
    language: str | None = None
