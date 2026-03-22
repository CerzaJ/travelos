from pydantic import BaseModel

class HotelOption(BaseModel):
    name: str
    stars: int
    price_per_night: float
    location: str