from typing import Tuple, Dict

# Example scoring rules. Adjust to your tournament format.
WIN_POINTS = 3
DRAW_POINTS = 1
LOSS_POINTS = 0


def calculate_match_points(team_score: int, opp_score: int) -> Tuple[int, int]:
    """Return points for (team, opponent) based on score."""
    if team_score > opp_score:
        return WIN_POINTS, LOSS_POINTS
    if team_score < opp_score:
        return LOSS_POINTS, WIN_POINTS
    return DRAW_POINTS, DRAW_POINTS


def update_team_totals(team: Dict, points: int, win: int = 0, loss: int = 0, draw: int = 0):
    team.setdefault('total_points', 0)
    team.setdefault('wins', 0)
    team.setdefault('losses', 0)
    team.setdefault('draws', 0)
    team['total_points'] += points
    team['wins'] += win
    team['losses'] += loss
    team['draws'] += draw
    return team


def build_rankings(teams: list) -> list:
    # teams is a list of dicts with total_points, wins etc.
    sorted_teams = sorted(teams, key=lambda t: (t.get('total_points', 0), t.get('wins', 0)), reverse=True)
    rankings = []
    for idx, t in enumerate(sorted_teams, 1):
        rankings.append({
            'rank': idx,
            'team_id': t.get('id') or t.get('team_id'),
            'name': t.get('name'),
            'total_points': t.get('total_points', 0),
            'wins': t.get('wins', 0),
            'losses': t.get('losses', 0),
            'draws': t.get('draws', 0),
        })
    return rankings
