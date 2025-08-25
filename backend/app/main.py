from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

config = load_dotenv('config.env', override=True)
if not config:
    print("Warning: config.env file not found or could not be loaded.")
    exit(1)

from .routers import teams, matches, leaderboard, auth

app = FastAPI(title='COD Tournament Backend')

# CORS (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(matches.router)
app.include_router(leaderboard.router)

@app.middleware("http")
async def log_ip_middleware(request: Request, call_next):
    x_forwarded_for = request.headers.get('X-Forwarded-For')
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.client.host
    with open("access.log", "a") as f:
        f.write(f"Incoming request from IP: {ip} | Path: {request.url.path}\n")
    response = await call_next(request)
    return response

@app.get('/')
async def root():
    return {'service': 'cod-tournament-backend', 'status': 'ok'}