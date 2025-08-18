from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class Member(BaseModel):
    name: str

class TeamCreate(BaseModel):
    id: str = Field(..., description='Team unique id (e.g. slug)')
    name: str
    telephone: str
    members: List[Member]

class TeamResponse(BaseModel):
    id: str
    name: str
    telephone: str
    members: List[Member]
    status: str
    wins: Optional[int] = 0
    losses: Optional[int] = 0
    draws: Optional[int] = 0
    registered_at: Optional[datetime]
    total_points: int = 0

class MatchCreate(BaseModel):
    id: str
    team1_id: str
    team2_id: str
    scheduled_time: Optional[datetime]

class MatchScoreUpdate(BaseModel):
    team1_score: int
    team2_score: int

class MatchResponse(BaseModel):
    id: str
    team1_id: str
    team2_id: str
    team1_score: Optional[int]
    team2_score: Optional[int]
    status: str
    scheduled_time: Optional[datetime]