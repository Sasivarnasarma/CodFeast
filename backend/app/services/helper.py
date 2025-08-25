import os
import httpx

SECRET_KEYS = os.environ.get('SECRET_KEYS', '').split()
TURNSTILE_SECRET_KEY = os.getenv('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA')


async def validate_secret_key(key: str) -> bool:
    return key in SECRET_KEYS


async def verify_turnstile_token(response_token, remote_ip=None):
    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": response_token
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, timeout=10)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        return {"success": False, "error-codes": [str(e)]}
    except httpx.HTTPStatusError as e:
        return {"success": False, "error-codes": [f"HTTP error {e.response.status_code}"]}
