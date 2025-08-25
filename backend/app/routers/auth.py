from fastapi import APIRouter
from ..services import helper

router = APIRouter(prefix='/auth', tags=['auth'])

@router.get('/{secret_key}')
async def register_user(secret_key: str):
    is_valid = await helper.validate_secret_key(secret_key)
    if not is_valid:
        return {'ok': False, 'error': 'Invalid secret key'}
    return {'ok': True}
