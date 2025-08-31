import os
import json
from typing import List, Dict, Any
from ..models import Candidate, Vote, VotesData, ElectionStatus
from ..config import Config

DATA_FOLDER = Config.DATA_FOLDER

def _read_json_file(filename: str) -> Any:
    """Read data from a JSON file."""
    file_path = os.path.join(DATA_FOLDER, filename)
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Return empty structure if file doesn't exist
        if filename == 'candidates.json':
            return []
        elif filename == 'votes.json':
            return {"voter_ids": [], "votes": []}
        elif filename == 'election_status.json':
            return {"is_open": True}
    except json.JSONDecodeError:
        print(f"Error decoding JSON from {filename}")
        return None

def _write_json_file(filename: str, data: Any) -> bool:
    """Write data to a JSON file."""
    file_path = os.path.join(DATA_FOLDER, filename)
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error writing to {filename}: {e}")
        return False

def get_candidates() -> List[Candidate]:
    """Get all candidates from the data file."""
    data = _read_json_file('candidates.json')
    if data is None:
        return []
    return [Candidate(**item) for item in data]

def get_votes() -> VotesData:
    """Get all votes and voter IDs from the data file."""
    data = _read_json_file('votes.json')
    if data is None:
        return VotesData(voter_ids=[], votes=[])
    
    votes = [Vote(**vote_data) for vote_data in data['votes']]
    return VotesData(voter_ids=data['voter_ids'], votes=votes)

def save_votes(votes_data: VotesData) -> bool:
    """Save votes and voter IDs to the data file."""
    return _write_json_file('votes.json', votes_data.to_dict())

def get_election_status() -> ElectionStatus:
    """Get the current election status."""
    data = _read_json_file('election_status.json')
    if data is None:
        return ElectionStatus(is_open=True)
    return ElectionStatus(**data)

def save_election_status(status: ElectionStatus) -> bool:
    """Save the election status to the data file."""
    return _write_json_file('election_status.json', status.to_dict())
