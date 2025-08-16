from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.get('/')
async def root():
    return {'service': 'cod-tournament-backend', 'status': 'ok'}