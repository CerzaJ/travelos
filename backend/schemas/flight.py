from pydantic import BaseModel

class FlightOption(BaseModel):
    airline: str
    price: float
    departure_time: str
    arrival_time: str
    duration_hours: float