from fastapi import APIRouter, Request, Response, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse
import os

router = APIRouter(prefix='/leaderboard', tags=['leaderboard'])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "varna")
COOKIE_NAME = "admin_auth"
COOKIE_VALUE = ADMIN_SECRET  # static for now

@router.get("/admin/login", response_class=HTMLResponse)
def login_page():
    return """
    <form method="post" action="/admin/login">
        <input type="password" name="secret" placeholder="Admin Secret" />
        <button type="submit">Login</button>
    </form>
    """

@router.post("/admin/login")
def login(secret: str = Form(...)):
    if secret == ADMIN_SECRET:
        resp = RedirectResponse(url="/", status_code=302)
        resp.set_cookie(COOKIE_NAME, COOKIE_VALUE, httponly=True, max_age=3600)
        return resp
    else:
        return HTMLResponse("Incorrect secret", status_code=401)
