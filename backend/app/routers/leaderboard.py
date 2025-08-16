from fastapi import APIRouter
from ..services import firebase as fb

router = APIRouter(prefix='/leaderboard', tags=['leaderboard'])

@router.get('')
async def get_leaderboard(season_id: str = 'default'):
    lb = fb.get_leaderboard(season_id)
    if not lb:
        return {'rankings': []}
    return lb

@router.post('/recalculate')
async def recalculate_leaderboard(season_id: str = 'default'):
    teams = fb.list_approved_teams()
    from ..services.scoring import build_rankings
    rankings = build_rankings(teams)
    fb.write_leaderboard(season_id, rankings)
    return {'ok': True, 'rankings': rankings}