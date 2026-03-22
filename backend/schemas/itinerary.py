from pydantic import BaseModel
from typing import List

class DayPlan(BaseModel):
    day: int
    activities: List[str]

class Itinerary(BaseModel):
    destination: str
    days: int
    plan: List[DayPlan]