from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str
    password: str