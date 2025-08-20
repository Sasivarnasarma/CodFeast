from fastapi import APIRouter

router = APIRouter(prefix='/auth', tags=['auth'])

@router.get('/ping')
async def ping():
    return {'ok': True}

@router.get('/{secret_key}')
async def register_user(secret_key: str):
    print(f"Secret key: {secret_key}")
    return {'ok': True}
