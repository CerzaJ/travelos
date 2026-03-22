from pydantic import BaseModel
from typing import List
from schemas.flight import FlightOption
from schemas.hotel import HotelOption
from schemas.pricing import PriceBreakdown
from schemas.itinerary import Itinerary

class OrchestratorResponse(BaseModel):
    flights: List[FlightOption]
    hotels: List[HotelOption]
    pricing: PriceBreakdown
    itinerary: Itinerary