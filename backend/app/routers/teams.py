import os
from fastapi import APIRouter, Request, Depends, HTTPException
from ..models.schemas import TeamCreate, TeamResponse
from ..services import firebase as fb, turnstile
from typing import List

TURNSTILE_SECRET_KEY = os.getenv('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA')

router = APIRouter(prefix='/teams', tags=['teams'])

@router.post('/register', response_model=TeamResponse)
async def register_team(payload: TeamCreate, request: Request, user=Depends(lambda: None)):
    client_ip = request.headers.get("CF-Connecting-IP") or \
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                request.client.host or None
    turnstile_response = turnstile.verify_turnstile_token(
        TURNSTILE_SECRET_KEY, payload.cf_turnstile, client_ip
    )
    if not turnstile_response.get("success"):
        raise HTTPException(
            status_code=401, 
            detail=turnstile_response.get('error-codes')[0]
                if turnstile_response.get('error-codes') else 
                'Turnstile verification failed'
            )

    team_id = payload.id
    exists = fb.get_team(team_id)
    if exists:
        raise HTTPException(status_code=400, detail='Team ID already exists')
    team_data = payload.model_dump()
    del team_data['cf_turnstile']
    team_data.update({'id': team_id})
    fb.create_team(team_id, team_data)
    return team_data

@router.get('', response_model=List[TeamResponse])
async def list_teams():
    teams = fb.list_teams()
    # Attach id if missing
    for t in teams:
        if 'id' not in t:
            # Firestore docs often have the id as the document id, but our helper returns dict only.
            pass
    return teams

@router.patch('/{team_id}/approve')
async def approve_team(team_id: str, admin=Depends(lambda: None)):
    # In real code require admin dependency
    t = fb.get_team(team_id)
    if not t:
        raise HTTPException(status_code=404, detail='Team not found')
    fb.update_team(team_id, {'status': 'approved'})
    return {'ok': True}

@router.get('/{team_id}', response_model=TeamResponse)
async def get_team(team_id: str):
    team = fb.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail='Team not found')
    return team