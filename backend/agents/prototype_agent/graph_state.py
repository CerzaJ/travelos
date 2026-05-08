from __future__ import annotations

import re
from datetime import date
from typing import Any, Literal, TypedDict

from pydantic import BaseModel, Field, field_validator


class TravelQueryInput(BaseModel):
    user_query: str = Field(..., description="Raw user request.")
    origin: str | None = Field(default=None, description="Flight origin airport/city code.")
    destination: str | None = Field(default=None, description="Flight destination airport/city code.")
    depart_date: str | None = Field(default=None, description="Outbound flight date in YYYY-MM-DD.")
    return_date: str | None = Field(default=None, description="Return flight date in YYYY-MM-DD.")
    hotel_city: str | None = Field(default=None, description="Hotel destination city.")
    hotel_checkin: str | None = Field(default=None, description="Hotel check-in date in YYYY-MM-DD.")
    hotel_checkout: str | None = Field(default=None, description="Hotel check-out date in YYYY-MM-DD.")
    preferences: dict[str, Any] = Field(default_factory=dict, description="Optional travel constraints.")


class TravelRequest(BaseModel):
    """UI/backend-aligned travel request (TravelOS-style form)."""

    client_name: str | None = Field(default=None, description="Client display name.")
    client_email: str | None = Field(default=None, description="Client email.")
    destination: str | None = Field(default=None, description="Trip destination (city/region).")
    departure_city: str | None = Field(default=None, description="Origin city.")
    start_date: date | None = Field(default=None, description="Trip start (parsed from ISO or dd/mm/yyyy).")
    end_date: date | None = Field(default=None, description="Trip end (parsed from ISO or dd/mm/yyyy).")
    travelers: str | int | None = Field(default=None, description="Travelers label or count.")
    min_budget: float | None = Field(default=None, description="Minimum budget.")
    max_budget: float | None = Field(default=None, description="Maximum budget.")
    special_preferences: str | None = Field(default=None, description="Natural language preferences.")
    currency: str | None = Field(default=None, description="Preferred currency code for integrations.")
    locale: str | None = Field(default=None, description="Optional locale hint (e.g. en, es).")

    @staticmethod
    def _parse_budget_value(value: Any) -> float | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).replace("$", "").replace(",", "").strip()
        if not s:
            return None
        try:
            return float(s)
        except ValueError:
            return None

    @staticmethod
    def _parse_date_value(value: str | date | None) -> date | None:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        s = str(value).strip()
        if not s:
            return None
        iso = re.match(r"^(\d{4}-\d{1,2}-\d{1,2})", s)
        if iso:
            parts = iso.group(1).split("-")
            y, mo, d = int(parts[0]), int(parts[1]), int(parts[2])
            return date(y, mo, d)
        dmy = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})\b", s)
        if dmy:
            day, month, year = int(dmy.group(1)), int(dmy.group(2)), int(dmy.group(3))
            try:
                return date(year, month, day)
            except ValueError:
                return None
        return None

    @field_validator("travelers", mode="before")
    @classmethod
    def _coerce_travelers(cls, value: Any) -> str | int | None:
        if value is None or value == "":
            return None
        if isinstance(value, int):
            return value
        s = str(value).strip()
        return s if s else None

    @field_validator("min_budget", "max_budget", mode="before")
    @classmethod
    def _coerce_budget(cls, value: Any) -> float | None:
        parsed = cls._parse_budget_value(value)
        return parsed

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def _coerce_date_fields(cls, value: Any) -> date | None:
        if value is None or value == "":
            return None
        if isinstance(value, date):
            return value
        parsed = cls._parse_date_value(str(value))
        return parsed

    def start_date_iso(self) -> str | None:
        return self.start_date.isoformat() if self.start_date else None

    def end_date_iso(self) -> str | None:
        return self.end_date.isoformat() if self.end_date else None

    def travelers_display(self) -> str | None:
        if self.travelers is None:
            return None
        if isinstance(self.travelers, int):
            return str(self.travelers)
        s = str(self.travelers).strip()
        return s or None


class FlightOption(BaseModel):
    """Single flight search result — maps to FLIGHT_OPTIONS table."""

    title: str
    total_price: float | None = None
    currency: str | None = None
    total_duration_min: int | None = None
    layover_count: int | None = None
    airline: str | None = None
    departure_token: str | None = None
    segments_jsonb: list[Any] | None = None
    emissions_kg: float | None = None
    ranking_score: float | None = None
    raw_option_jsonb: dict[str, Any] = Field(default_factory=dict)


class HotelOption(BaseModel):
    """Single hotel search result — maps to HOTEL_OPTIONS table."""

    property_name: str
    total_rate: float | None = None
    nightly_rate: float | None = None
    currency: str | None = None
    overall_rating: float | None = None
    location: str | None = None
    property_token: str | None = None
    location_rating: float | None = None
    review_count: int | None = None
    amenities_jsonb: list[Any] | None = None
    free_cancellation: bool | None = None
    ranking_score: float | None = None
    raw_option_jsonb: dict[str, Any] = Field(default_factory=dict)


class PackageRegistration(BaseModel):
    """Payload-shaped snapshot for backend/DB registration alongside search results.

    FK fields (quote_request_id, job_id, flight_option_id, hotel_option_id) are
    assigned by the backend after insertion and echoed back; the agent emits them as None.
    """

    quote_request_id: str | None = Field(default=None, description="FK set by backend post-insert.")
    client_name: str | None = None
    client_email: str | None = None
    destination: str | None = None
    departure_city: str | None = None
    trip_start_iso: str | None = Field(default=None, description="YYYY-MM-DD from form or inferred.")
    trip_end_iso: str | None = Field(default=None, description="YYYY-MM-DD from form or inferred.")
    travelers: str | None = None
    min_budget: float | None = None
    max_budget: float | None = None
    special_preferences: str | None = None
    normalized_search: dict[str, Any] = Field(default_factory=dict, description="Resolved tool inputs.")
    # Package-level computed fields (map to PACKAGES table)
    total_price: float | None = Field(default=None, description="Combined flight + hotel price.")
    currency: str | None = None
    within_budget: bool | None = Field(default=None, description="total_price <= max_budget.")
    tier: str | None = Field(default=None, description="budget / standard / premium.")
    quality_score: float | None = Field(default=None, description="Average ranking score of selected options.")
    price_breakdown: dict[str, Any] | None = Field(default=None, description="Flight vs hotel cost split.")


class TravelQueryOutput(BaseModel):
    summary: str
    flight_options: list[FlightOption] = Field(default_factory=list)
    hotel_options: list[HotelOption] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    registration: PackageRegistration | None = Field(
        default=None,
        description="Structured snapshot for persisting with the generated package.",
    )


class MissingField(BaseModel):
    field: str
    reason: str


class ParsedIntentPlan(BaseModel):
    intent: Literal["flight", "hotel", "both", "unknown"] = "unknown"
    origin: str | None = None
    destination: str | None = None
    depart_date: str | None = None
    return_date: str | None = None
    hotel_city: str | None = None
    hotel_checkin: str | None = None
    hotel_checkout: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
    missing_fields: list[MissingField] = Field(default_factory=list)
    tool_plan: list[Literal["flight", "hotel"]] = Field(default_factory=list)
    plan_confidence: float = 0.0


class OutputConfig(BaseModel):
    include_raw: bool = False
    max_options: int = 3


class TravelGraphState(TypedDict, total=False):
    user_query: str
    travel_request: TravelRequest | dict[str, Any] | None
    package_mode: bool
    intent: Literal["flight", "hotel", "both", "unknown"]
    parsed_input: TravelQueryInput
    parsed_plan: ParsedIntentPlan
    missing_fields: list[MissingField]
    plan_confidence: float
    tool_plan: list[Literal["flight", "hotel"]]
    output_config: OutputConfig
    flight_tool_result: dict[str, Any]
    hotel_tool_result: dict[str, Any]
    meta_timing_flight_ms: int
    meta_timing_hotel_ms: int
    warnings: list[str]
    flight_warnings: list[str]
    hotel_warnings: list[str]
    output: TravelQueryOutput
    composite_query: str
