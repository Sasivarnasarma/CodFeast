from fastapi import Header, HTTPException, Depends
from typing import Optional
from .services import firebase as fb_services

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail='Authorization header missing')
    try:
        scheme, token = authorization.split(' ')
    except ValueError:
        raise HTTPException(status_code=401, detail='Malformed authorization header')
    if scheme.lower() != 'bearer':
        raise HTTPException(status_code=401, detail='Unsupported auth scheme')
    try:
        claims = fb_services.verify_firebase_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Token verification failed: {e}')
    # Ensure user exists in Firestore users collection (optional upsert)
    uid = claims.get('uid')
    if uid:
        fb_services.upsert_user(uid, {
            'name': claims.get('name'),
            'email': claims.get('email'),
            'role': claims.get('role', 'player')
        })
    return claims

async def require_admin(user: dict = Depends(get_current_user)):
    role = user.get('role') or user.get('claims', {}).get('role')
    # If you store role in Firestore users doc, fetch it instead for stronger checks.
    user_doc = fb_services.get_user(user.get('uid'))
    if user_doc and user_doc.get('role') == 'admin':
        return user
    if role == 'admin':
        return user
    raise HTTPException(status_code=403, detail='Admin privileges required')