import os
import json
from typing import Optional, Dict, Any
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests
import requests as http_requests
import datetime

class GoogleAuth:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        
        # OAuth2 scopes for Google Sign-In
        self.scopes = [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
    
    def get_authorization_url(self) -> str:
        """Generate Google OAuth2 authorization URL."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return authorization_url, state
    
    def exchange_code_for_tokens(self, authorization_code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access and ID tokens."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        try:
            flow.fetch_token(code=authorization_code)
            return {
                'access_token': flow.credentials.token,
                'id_token': flow.credentials.id_token,
                'refresh_token': flow.credentials.refresh_token
            }
        except Exception as e:
            print(f"Error exchanging code for tokens: {e}")
            return None
    
    def verify_id_token(self, id_token_str: str) -> Optional[Dict[str, Any]]:
        """Verify Google ID token and extract user information."""
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_str, 
                requests.Request(), 
                self.client_id
            )
            
            # Verify the token was issued by Google
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            # Verify the token is for our app
            if idinfo['aud'] != self.client_id:
                raise ValueError('Wrong audience.')
            
            return {
                'user_id': idinfo['sub'],
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
        except Exception as e:
            print(f"Error verifying ID token: {e}")
            return None
    
    def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Google API using access token."""
        try:
            response = http_requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None

# Voter session management
class VoterSession:
    def __init__(self):
        self.sessions_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'voter_sessions.json')
        self._load_sessions()
    
    def _load_sessions(self):
        """Load existing voter sessions from file."""
        try:
            with open(self.sessions_file, 'r') as f:
                self.sessions = json.load(f)
        except FileNotFoundError:
            self.sessions = {}
    
    def _save_sessions(self):
        """Save voter sessions to file."""
        os.makedirs(os.path.dirname(self.sessions_file), exist_ok=True)
        with open(self.sessions_file, 'w') as f:
            json.dump(self.sessions, f, indent=2)
    
    def create_session(self, user_id: str, email: str, name: str) -> str:
        """Create a new voter session."""
        import uuid
        session_id = str(uuid.uuid4())
        
        self.sessions[session_id] = {
            'user_id': user_id,
            'email': email,
            'name': name,
            'created_at': str(datetime.datetime.now()),
            'has_voted': False
        }
        
        self._save_sessions()
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get voter session by session ID."""
        return self.sessions.get(session_id)
    
    def mark_voted(self, session_id: str):
        """Mark a voter as having voted."""
        if session_id in self.sessions:
            self.sessions[session_id]['has_voted'] = True
            self._save_sessions()
    
    def has_voted(self, user_id: str) -> bool:
        """Check if a user has already voted."""
        for session in self.sessions.values():
            if session['user_id'] == user_id and session['has_voted']:
                return True
        return False
