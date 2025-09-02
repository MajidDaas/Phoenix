# backend/utils/data_handler.py
import os
import json
from typing import List, Dict, Any
# --- FIX: Remove duplicate sys import and correct path handling ---
# The sys.path.append line is generally not recommended in utility modules like this.
# The correct way is to ensure the package structure or use relative imports if within a package.
# For now, assuming models.py is in the same backend directory and this file is correctly imported.
# If there are import issues, they should be resolved by the project structure or PYTHONPATH.
# from models import Candidate, Vote, VotesData, ElectionStatus
# from config import Config

# --- TEMPORARY FIX FOR IMPORTS (Assuming models.py and config.py are siblings to this file) ---
# Adjust the import path as needed based on your actual project structure.
# If this file is at backend/utils/data_handler.py and models.py is at backend/models.py:
import sys
import os
# Get the directory of the current file (utils/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Get the parent directory (backend/)
backend_dir = os.path.dirname(current_dir)
# Add backend/ to sys.path so we can import models and config
sys.path.append(backend_dir)
# Now import
from models import Candidate, Vote, VotesData, ElectionStatus
from config import Config
# --- END TEMPORARY FIX ---

DATA_FOLDER = Config.DATA_FOLDER

def _read_json_file(filename: str) -> Any:
    """Read data from a JSON file."""
    file_path = os.path.join(DATA_FOLDER, filename)
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"DEBUG: File {file_path} not found.")
        # Return empty structure if file doesn't exist
        if filename == 'candidates.json':
            print("DEBUG: Returning empty list for missing candidates.json")
            return [] # Return empty list for candidates
        elif filename == 'votes.json':
            return {"voter_ids": [], "votes": []}
        elif filename == 'election_status.json':
            return {"is_open": True}
    except json.JSONDecodeError as e: # --- FIX: Catch JSONDecodeError specifically ---
        print(f"ERROR: Error decoding JSON from {filename} at {file_path}: {e}")
        # --- CRUCIAL FIX: Ensure candidates.json always returns a list ---
        if filename == 'candidates.json':
            print("DEBUG: Returning empty list for malformed candidates.json")
            return [] # Always return a list for candidates, even if JSON is bad
        # For other files, returning None might be okay if caller handles it,
        # but it's safer to return an empty structure.
        elif filename == 'votes.json':
            return {"voter_ids": [], "votes": []}
        elif filename == 'election_status.json':
            return {"is_open": True}
        else:
            return None # For unknown files, keep original behavior
        # --- END CRUCIAL FIX ---
    except Exception as e: # Catch-all for other potential errors (permissions, etc.)
        print(f"ERROR: Unexpected error reading {filename} at {file_path}: {e}")
        # --- ROBUSTNESS FIX: Also ensure candidates.json returns a list on ANY error ---
        if filename == 'candidates.json':
            print("DEBUG: Returning empty list for candidates.json due to unexpected error")
            return [] # Always return a list for candidates
        # Apply same logic for other known files
        elif filename == 'votes.json':
            return {"voter_ids": [], "votes": []}
        elif filename == 'election_status.json':
            return {"is_open": True}
        else:
            return None # For unknown files, keep original behavior
        # --- END ROBUSTNESS FIX ---

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
    print(f"DEBUG: get_candidates received data of type: {type(data)}") # Debug log
    # --- REDUNDANCY CHECK (shouldn't be needed with fixes above, but good practice) ---
    if data is None or not isinstance(data, list):
        print("DEBUG: get_candidates returning empty list because data is None or not a list")
        return []
    # --- END REDUNDANCY CHECK ---
    # Ensure each item is a dict before trying to unpack it (extra safety)
    valid_items = [item for item in data if isinstance(item, dict)]
    print(f"DEBUG: get_candidates processing {len(valid_items)} valid candidate items")
    return [Candidate(**item) for item in valid_items]

def get_votes() -> VotesData:
    """Get all votes and voter IDs from the data file."""
    data = _read_json_file('votes.json')
    if data is None:
        return VotesData(voter_ids=[], votes=[])
    
    # Ensure data has the expected structure
    if not isinstance(data, dict) or 'votes' not in data or 'voter_ids' not in data:
        print("WARNING: votes.json has unexpected structure. Returning empty VotesData.")
        return VotesData(voter_ids=[], votes=[])
        
    votes = [Vote(**vote_data) for vote_data in data.get('votes', []) if isinstance(vote_data, dict)]
    return VotesData(voter_ids=data.get('voter_ids', []), votes=votes)

def save_votes(votes_data: VotesData) -> bool:
    """Save votes and voter IDs to the data file."""
    # Ensure votes_data is a VotesData instance before calling to_dict
    if not isinstance(votes_data, VotesData):
         print("ERROR: save_votes called with non-VotesData object")
         return False
    return _write_json_file('votes.json', votes_data.to_dict())

def get_election_status() -> ElectionStatus:
    """Get the current election status."""
    data = _read_json_file('election_status.json')
    if data is None:
        return ElectionStatus(is_open=True)
    
    # Ensure data is a dict before unpacking
    if not isinstance(data, dict):
        print("WARNING: election_status.json has unexpected structure. Returning default status.")
        return ElectionStatus(is_open=True)
        
    return ElectionStatus(**data)

def save_election_status(status: ElectionStatus) -> bool:
    """Save the election status to the data file."""
    # Ensure status is an ElectionStatus instance before calling to_dict
    if not isinstance(status, ElectionStatus):
         print("ERROR: save_election_status called with non-ElectionStatus object")
         return False
    return _write_json_file('election_status.json', status.to_dict())

# --- END OF FILE ---
