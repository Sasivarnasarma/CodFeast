import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, auth, firestore

FIREBASE_CRED_PATH = os.environ.get('FIREBASE_CREDENTIAL_PATH')

# Initialize Firebase Admin SDK (idempotent)
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client(database_id='cod-fest-db-x')

# Firestore collection refs
TEAMS_COL = db.collection('teams')
MATCHES_COL = db.collection('matches')
LEADERBOARD_COL = db.collection('leaderboard')
USERS_COL = db.collection('users')

# Basic helpers

def get_user(uid: str) -> Optional[Dict[str, Any]]:
    doc = USERS_COL.document(uid).get()
    return doc.to_dict() if doc.exists else None


def upsert_user(uid: str, payload: Dict[str, Any]):
    payload.setdefault('created_at', datetime.utcnow())
    USERS_COL.document(uid).set(payload, merge=True)


def verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """Verify an ID token and return decoded claims. Raises auth.InvalidIdTokenError etc."""
    return auth.verify_id_token(id_token)


def create_team(team_id: str, payload: Dict[str, Any]):
    payload.setdefault('registered_at', datetime.utcnow())
    payload.setdefault('status', 'pending')
    payload.setdefault('total_points', 0)
    TEAMS_COL.document(team_id).set(payload)
    return payload


def get_team(team_id: str):
    doc = TEAMS_COL.document(team_id).get()
    return doc.to_dict() if doc.exists else None


def update_team(team_id: str, updates: Dict[str, Any]):
    TEAMS_COL.document(team_id).set(updates, merge=True)

def list_teams():
    docs = TEAMS_COL.stream()
    return [d.to_dict() for d in docs]

def list_approved_teams():
    docs = TEAMS_COL.where('status', '==', 'approved').stream()
    return [d.to_dict() for d in docs]


def create_match(match_id: str, payload: Dict[str, Any]):
    payload.setdefault('status', 'scheduled')
    MATCHES_COL.document(match_id).set(payload)
    return payload


def get_match(match_id: str):
    doc = MATCHES_COL.document(match_id).get()
    return doc.to_dict() if doc.exists else None


def update_match(match_id: str, updates: Dict[str, Any]):
    MATCHES_COL.document(match_id).set(updates, merge=True)


def list_matches():
    docs = MATCHES_COL.stream()
    return [d.to_dict() for d in docs]


def write_leaderboard(season_id: str, rankings: Dict[str, Any]):
    LEADERBOARD_COL.document(season_id).set({'rankings': rankings, 'updated_at': datetime.now(timezone.utc)})


def get_leaderboard(season_id: str):
    doc = LEADERBOARD_COL.document(season_id).get()
    return doc.to_dict() if doc.exists else None