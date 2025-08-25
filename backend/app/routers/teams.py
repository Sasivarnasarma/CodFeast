import os
from fastapi import APIRouter, Request, HTTPException
from ..models.schemas import TeamCreate, TeamResponse, TeamAction, TeamActionRequest
from ..services import firebase as fb, helper
from typing import List


router = APIRouter(prefix='/teams', tags=['teams'])

@router.post('/register', response_model=TeamResponse)
async def register_team(payload: TeamCreate, request: Request):
    client_ip = request.headers.get("CF-Connecting-IP") or \
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                request.client.host or None
    turnstile_response = await helper.verify_turnstile_token(payload.cf_turnstile, client_ip)
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

@router.get('/', response_model=List[TeamResponse])
async def list_teams(status: str = None):
    teams = fb.list_teams(status=status)
    return teams

@router.patch('/{team_id}')
async def update_team_status(team_id: str, payload: TeamActionRequest):
    is_valid = await helper.validate_secret_key(payload.secret)
    if not is_valid:
        raise HTTPException(status_code=403, detail='Invalid secret key')

    t = fb.get_team(team_id)
    print(payload.action)
    if not t:
        raise HTTPException(status_code=404, detail='Team not found')

    if payload.action == TeamAction.approve:
        fb.update_team(team_id, {'status': 'approved'})
    elif payload.action == TeamAction.reject:
        fb.update_team(team_id, {'status': 'rejected'})
    elif payload.action == TeamAction.pending:
        fb.update_team(team_id, {'status': 'pending'})
    elif payload.action == TeamAction.delete:
        fb.delete_team(team_id)
    else:
        raise HTTPException(status_code=400, detail='Invalid action')

    return {'ok': True}

@router.get('/{team_id}', response_model=TeamResponse)
async def get_team(team_id: str):
    team = fb.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail='Team not found')
    return team