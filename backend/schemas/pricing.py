from pydantic import BaseModel

class PriceBreakdown(BaseModel):
    flights_total: float
    hotel_total: float
    extras_total: float
    grand_total: float
    currency: str = "MXN"