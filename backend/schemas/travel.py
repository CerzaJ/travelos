from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class Travelers(BaseModel):
    adults: int = Field(..., ge=1)
    children: int = Field(0, ge=0)

class Preferences(BaseModel):
    hotel_stars: int = Field(..., ge=1, le=5)
    hotel_type: str
    flight_class: str
    extras: List[str] = []

class TravelRequest(BaseModel):
    request_id: str
    origin: str
    destination: str
    departure_date: date
    return_date: date
    travelers: Travelers
    budget_mxn: float = Field(..., gt=0)
    preferences: Preferences
    notes: Optional[str] = None