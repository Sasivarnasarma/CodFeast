from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class Member(BaseModel):
    name: str

class TeamCreate(BaseModel):
    id: str = Field(..., description='Team unique id (e.g. slug)')
    name: str
    telephone: str
    members: List[Member]
    cf_turnstile: str

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

class TeamAction(str, Enum):
    approve = 'approve'
    reject = 'reject'
    pending = 'pending'
    delete = 'delete'

class TeamActionRequest(BaseModel):
    action: TeamAction
    secret: str

class MatchCreate(BaseModel):
    id: str
    team1_id: str
    team2_id: str
    scheduled_time: Optional[datetime]
    secret: str

class MatchScoreUpdate(BaseModel):
    team1_score: int
    team2_score: int
    secret: str

class MatchResponse(BaseModel):
    id: str
    team1_id: str
    team2_id: str
    team1_score: Optional[int] = 0
    team2_score: Optional[int] = 0
    status: str
    scheduled_time: Optional[datetime]