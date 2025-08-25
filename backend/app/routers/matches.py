from fastapi import APIRouter, HTTPException
from ..models.schemas import MatchCreate, MatchResponse, MatchScoreUpdate
from ..services import firebase as fb
from ..services import scoring

router = APIRouter(prefix='/matches', tags=['matches'])

@router.post('', response_model=MatchCreate)
async def create_match(payload: MatchCreate):
    match_id = payload.id
    exists = fb.get_match(match_id)
    if exists:
        raise HTTPException(status_code=400, detail='Match ID already exists')
    data = payload.dict()
    fb.create_match(match_id, data)
    return data

@router.get('', response_model=list[MatchResponse])
async def list_all_matches():
    return fb.list_matches()

@router.patch('/{match_id}/score')
async def update_score(match_id: str, payload: MatchScoreUpdate):
    match = fb.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail='Match not found')
    fb.update_match(match_id, {
        'team1_score': payload.team1_score,
        'team2_score': payload.team2_score,
        'status': 'completed'
    })
    team1 = fb.get_team(match['team1_id']) or {}
    team2 = fb.get_team(match['team2_id']) or {}
    p1, p2 = scoring.calculate_match_points(payload.team1_score, payload.team2_score)
    if p1 > p2:
        update1 = scoring.update_team_totals(team1, p1, win=1)
        update2 = scoring.update_team_totals(team2, p2, loss=1)
    elif p1 < p2:
        update1 = scoring.update_team_totals(team1, p1, loss=1)
        update2 = scoring.update_team_totals(team2, p2, win=1)
    else:
        update1 = scoring.update_team_totals(team1, p1, draw=1)
        update2 = scoring.update_team_totals(team2, p2, draw=1)
    fb.update_team(match['team1_id'], update1)
    fb.update_team(match['team2_id'], update2)
    teams = fb.list_approved_teams()
    rankings = scoring.build_rankings(teams)
    fb.write_leaderboard('default', rankings)
    return {'ok': True, 'rankings': rankings}