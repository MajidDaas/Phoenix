from dataclasses import dataclass, asdict
from typing import List, Optional
import json

@dataclass
class Candidate:
    id: int
    name: str
    position: str
    photo: str
    activity: int
    bio: str

    def to_dict(self):
        return asdict(self)

@dataclass
class Vote:
    id: str
    voter_id: str
    selected_candidates: List[int]
    executive_candidates: List[int]
    timestamp: str

    def to_dict(self):
        return asdict(self)

@dataclass
class VotesData:
    voter_ids: List[str]
    votes: List[Vote]

    def to_dict(self):
        return {
            "voter_ids": self.voter_ids,
            "votes": [vote.to_dict() for vote in self.votes]
        }

@dataclass
class ElectionStatus:
    is_open: bool

    def to_dict(self):
        return asdict(self)
