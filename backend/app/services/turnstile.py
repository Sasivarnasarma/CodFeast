import requests

def verify_turnstile_token(secret_key, response_token, remote_ip=None):
    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": secret_key,
        "response": response_token
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        response = requests.post(url, data=data, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"success": False, "error-codes": [str(e)]}
