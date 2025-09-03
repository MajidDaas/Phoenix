# app.py - Main Flask application

from flask import Flask, jsonify, request, send_from_directory, session, redirect, url_for, Response
from flask_cors import CORS
from functools import wraps
import io
import csv
import os
import uuid
from config import config
from utils.data_handler import get_candidates, get_votes, save_votes, get_election_status, save_election_status
from models import Vote, VotesData, ElectionStatus
from utils.auth import GoogleAuth, VoterSession

def create_app(config_name='default'):
    app = Flask(__name__, static_folder='../frontend')
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # Enable CORS for development
    # Note: Extra spaces in origins list might cause issues, consider trimming if needed.
    CORS(app, origins=['https://majiddaas2.pythonanywhere.com', 'http://127.0.0.1:5001'], supports_credentials=True)

    # Initialize Google OAuth2 and voter session management
    google_auth = GoogleAuth(
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        redirect_uri=app.config['GOOGLE_REDIRECT_URI']
    )
    voter_session = VoterSession()

    # In a real application, use proper authentication (e.g., JWT, sessions)
    # For demo, we'll keep it simple
    DEMO_VOTER_IDS = set()

    # --- Helper Functions ---

    def require_admin(func):
        """
        Decorator to require admin access for a route.
        Checks if the user is authenticated and has the 'is_admin' flag set in their session.
        """
        @wraps(func) # Preserves original function metadata
        def wrapper(*args, **kwargs):
            session_id = session.get('voter_session_id')
            if not session_id:
                return jsonify({'message': 'Authentication required'}), 401

            voter_info = voter_session.get_session(session_id)
            # Check if voter_info exists and if is_admin is True
            if not voter_info or not voter_info.get('is_admin', False):
                user_email = voter_info.get('email') if voter_info else 'Unknown'
                app.logger.warning(f"User {user_email} attempted admin access without permission.")
                return jsonify({'message': 'Admin access required'}), 403 # 403 Forbidden

            # If user is authenticated and an admin, proceed
            return func(*args, **kwargs)
        return wrapper

    # --- API Routes ---

    # Serve static files from the frontend folder
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory(os.path.join(app.static_folder, 'css'), filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory(os.path.join(app.static_folder, 'js'), filename)

    # @desc    Get all candidates
    # @route   GET /api/candidates
    # @access  Public
    @app.route('/api/candidates', methods=['GET'])
    def get_all_candidates():
        """
        API endpoint to get all candidates.
        Reads data from backend/data/candidates.json and returns it as JSON.
        """
        try:
            # --- Construct the path to the candidates.json file ---
            # Assumes this file (app.py) is in the backend/ directory
            # and data/ is a subdirectory of backend/
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(backend_dir, 'data')
            candidates_file_path = os.path.join(data_dir, 'candidates.json')

            # --- Check if the file exists ---
            if not os.path.exists(candidates_file_path):
                app.logger.error(f"Candidates file not found at {candidates_file_path}")
                return jsonify({"message": "Candidates data file not found on server."}), 404

            # --- Read the JSON data from the file ---
            import json  # Ensure json is imported locally if needed
            with open(candidates_file_path, 'r') as f:
                candidates_data = json.load(f)

            # --- Validate data format (basic check) ---
            if not isinstance(candidates_data, list):
                app.logger.error("Candidates data is not in the expected list format.")
                return jsonify({"message": "Invalid candidates data format on server."}), 500

            # --- Return the data as a JSON response ---
            # 200 OK is the default status code
            return jsonify(candidates_data)

        except json.JSONDecodeError as e:
            # Handle case where the JSON file is malformed
            app.logger.error(f"Error decoding JSON from candidates file: {e}")
            return jsonify({"message": "Error reading candidates data. Invalid JSON format in file."}), 500
        except Exception as e:
            # Handle any other unexpected errors (e.g., permissions)
            app.logger.error(f"Unexpected error fetching candidates: {e}")
            return jsonify({"message": "An internal server error occurred while fetching candidates."}), 500

    # @desc    Request a voter ID (simulated)
    # @route   POST /api/votes/request-id
    # @access  Public
    @app.route('/api/votes/request-id', methods=['POST'])
    def request_voter_id():
        data = request.get_json()
        email = data.get('email')
        phone_last4 = data.get('phoneLast4')

        if not email or not phone_last4:
            return jsonify({'message': 'Email and last 4 digits of phone are required'}), 400

        # Simple validation
        if '@' not in email or '.' not in email:
            return jsonify({'message': 'Invalid email format'}), 400

        if len(phone_last4) != 4 or not phone_last4.isdigit():
            return jsonify({'message': 'Phone last 4 digits must be 4 numbers'}), 400

        election_status = get_election_status()
        if not election_status.is_open:
            return jsonify({'message': 'Election is currently closed'}), 400

        # Generate a unique voter ID (in a real app, send via email)
        voter_id = f"VOTER_{uuid.uuid4().hex[:8].upper()}"
        DEMO_VOTER_IDS.add(voter_id)  # Store for verification

        # In a real app, you would send an email here
        app.logger.info(f"[DEMO] Sending Voter ID {voter_id} to {email}")

        return jsonify({
            'message': 'Voter ID generated successfully (check console for demo ID)',
            'voterId': voter_id  # For demo purposes
        }), 200

    # @desc    Verify a voter ID
    # @route   POST /api/votes/verify-id
    # @access  Public
    @app.route('/api/votes/verify-id', methods=['POST'])
    def verify_voter_id():
        data = request.get_json()
        voter_id = data.get('voterId')

        if not voter_id:
            return jsonify({'message': 'Voter ID is required'}), 400

        election_status = get_election_status()
        if not election_status.is_open:
            return jsonify({'message': 'Election is currently closed'}), 400

        # Check if voter ID exists (demo logic)
        if voter_id not in DEMO_VOTER_IDS:
            return jsonify({'message': 'Invalid voter ID'}), 400

        # Check if voter ID has already been used
        votes_data = get_votes()
        if voter_id in votes_data.voter_ids:
            return jsonify({'message': 'This voter ID has already been used'}), 400

        return jsonify({'message': 'Voter ID verified successfully'}), 200

    # @desc    Submit a vote
    # @route   POST /api/votes/submit
    # @access  Authenticated
    @app.route('/api/votes/submit', methods=['POST'])
    def submit_vote():
        # Check authentication
        session_id = session.get('voter_session_id')
        voter_info = None

        if session_id:
            voter_info = voter_session.get_session(session_id)
            if not voter_info:
                return jsonify({'message': 'Invalid session'}), 401

            if voter_info['has_voted']:
                return jsonify({'message': 'You have already voted'}), 400
        else:
            # Demo mode - create a demo user
            voter_info = {
                'user_id': f"DEMO_USER_{uuid.uuid4().hex[:8].upper()}",
                'name': 'Demo User',
                'email': 'demo@example.com'
            }

        data = request.get_json()
        selected_candidates = data.get('selectedCandidates')
        executive_candidates = data.get('executiveCandidates')
        MAX_SELECTIONS = 15
        MAX_EXECUTIVES = 7

        if not selected_candidates or not executive_candidates:
            return jsonify({'message': 'Selected candidates and executive candidates are required'}), 400

        if len(selected_candidates) != MAX_SELECTIONS:
            return jsonify({'message': f'You must select exactly {MAX_SELECTIONS} candidates'}), 400

        if len(executive_candidates) != MAX_EXECUTIVES:
            return jsonify({'message': f'You must select exactly {MAX_EXECUTIVES} executive officers'}), 400

        # Validate candidate IDs (assuming get_candidates returns objects with an 'id' attribute)
        # This part might need adjustment based on your Candidate model's structure
        try:
            candidate_objects = get_candidates()
            candidate_ids = [c.id for c in candidate_objects]
        except AttributeError:
             app.logger.error("Candidate objects do not have an 'id' attribute.")
             return jsonify({'message': 'Server configuration error: Candidate data invalid.'}), 500
        except Exception as e:
             app.logger.error(f"Error fetching candidate IDs: {e}")
             return jsonify({'message': 'Server error while validating candidates.'}), 500

        invalid_selected = any(id not in candidate_ids for id in selected_candidates)
        invalid_executives = any(id not in candidate_ids for id in executive_candidates)

        if invalid_selected or invalid_executives:
            return jsonify({'message': 'Invalid candidate ID provided'}), 400

        election_status = get_election_status()
        if not election_status.is_open:
            return jsonify({'message': 'Election is currently closed'}), 400

        # Record the vote using Google user ID
        new_vote = Vote(
            id=str(uuid.uuid4()),
            voter_id=voter_info['user_id'],
            selected_candidates=selected_candidates,
            executive_candidates=executive_candidates,
            timestamp=__import__('datetime').datetime.utcnow().isoformat() + 'Z'
        )

        votes_data = get_votes()
        votes_data.votes.append(new_vote)
        votes_data.voter_ids.append(voter_info['user_id'])

        if not save_votes(votes_data):
            return jsonify({'message': 'Failed to save vote'}), 500

        # Mark voter as having voted (only if authenticated)
        if session_id:
            voter_session.mark_voted(session_id)

        return jsonify({'message': 'Vote submitted successfully'}), 200

    # @desc    Get election results
    # @route   GET /api/results
    # @access  Public
    @app.route('/api/results', methods=['GET'])
    def get_results():
        election_status = get_election_status()
        candidates = get_candidates()
        votes_data = get_votes()

        if election_status.is_open:
            return jsonify({
                'message': 'Election is open. Results are not available yet.',
                'isOpen': True,
                'stats': {
                    'totalCandidates': len(candidates),
                    'totalVotes': len(votes_data.votes)
                }
            }), 200

        # Calculate results
        # Ensure candidates have a to_dict() method or adjust accordingly
        try:
            results = {c.id: {
                **c.to_dict(), # Requires Candidate model to have to_dict()
                'councilVotes': 0,
                'executiveVotes': 0
            } for c in candidates}
        except AttributeError:
             app.logger.error("Candidate objects do not have a 'to_dict' method.")
             return jsonify({'message': 'Server configuration error: Candidate data invalid for results.'}), 500
        except Exception as e:
             app.logger.error(f"Error preparing candidate results data: {e}")
             return jsonify({'message': 'Server error while calculating results.'}), 500


        for vote in votes_data.votes:
            for id in vote.selected_candidates:
                if id in results:
                    results[id]['councilVotes'] += 1
            for id in vote.executive_candidates:
                if id in results:
                    results[id]['executiveVotes'] += 1

        # Convert to array and sort
        results_array = list(results.values())
        # Sort by council votes DESC, then executive votes DESC
        results_array.sort(key=lambda x: (x['councilVotes'], x['executiveVotes']), reverse=True)

        return jsonify({
            'isOpen': False,
            'results': results_array,
            'stats': {
                'totalCandidates': len(candidates),
                'totalVotes': len(votes_data.votes)
            }
        }), 200

    # @desc    Authenticate admin (Password-based - kept for potential legacy/backup use)
    # @route   POST /api/admin/auth
    # @access  Public
    @app.route('/api/admin/auth', methods=['POST'])
    def authenticate_admin():
        data = request.get_json()
        password = data.get('password')

        if not password:
            return jsonify({'message': 'Password is required'}), 400

        if password == app.config['ADMIN_PASSWORD']:
            # In a real app, you would set a secure session or JWT token here
            return jsonify({'message': 'Admin authenticated'}), 200
        else:
            return jsonify({'message': 'Invalid password'}), 401

    # @desc    Get election status
    # @route   GET /api/admin/status
    # @access  Admin (protected by require_admin)
    @app.route('/api/admin/status', methods=['GET'])
    @require_admin
    def get_admin_status():
        try:
            status = get_election_status()
            return jsonify(status.to_dict()), 200
        except Exception as err:
            app.logger.error(f"Error getting admin status: {err}")
            return jsonify({'message': 'Server error'}), 500

    # @desc    Toggle election status
    # @route   POST /api/admin/toggle
    # @access  Admin (protected by require_admin)
    @app.route('/api/admin/toggle', methods=['POST'])
    @require_admin
    def toggle_election_status():
        try:
            current_status = get_election_status()
            new_status = ElectionStatus(is_open=not current_status.is_open)
            if save_election_status(new_status):
                return jsonify({
                    'message': f"Election is now {'open' if new_status.is_open else 'closed'}",
                    'isOpen': new_status.is_open
                }), 200
            else:
                return jsonify({'message': 'Failed to update election status'}), 500
        except Exception as err:
            app.logger.error(f"Error toggling election status: {err}")
            return jsonify({'message': 'Server error'}), 500

    # @desc    Export votes (simplified JSON)
    # @route   GET /api/admin/export
    # @access  Admin (protected by require_admin)
    @app.route('/api/admin/export', methods=['GET'])
    @require_admin
    def export_votes():
        try:
            votes_data = get_votes()
            # In a real app, you might want to format this differently or use a file response
            return jsonify(votes_data.to_dict()), 200 # Requires VotesData model to have to_dict()
        except AttributeError:
             app.logger.error("VotesData object does not have a 'to_dict' method.")
             return jsonify({'message': 'Server configuration error: Vote data invalid for export.'}), 500
        except Exception as err:
            app.logger.error(f"Error exporting votes (JSON): {err}")
            return jsonify({'message': 'Server error'}), 500

    # --- Google OAuth2 Routes ---

    # @desc    Initiate Google OAuth2 login
    # @route   GET /auth/google/login
    # @access  Public
    @app.route('/auth/google/login')
    def google_login():
        try:
            # Check if Google OAuth2 is properly configured
            if (app.config['GOOGLE_CLIENT_ID'] == 'your-google-client-id' or
                app.config['GOOGLE_CLIENT_SECRET'] == 'your-google-client-secret' or
                'your-google-client-id' in app.config['GOOGLE_CLIENT_ID'] or
                'your-google-client-secret' in app.config['GOOGLE_CLIENT_SECRET']):
                return jsonify({
                    'message': 'Google OAuth2 is not configured. Please use Demo Mode or contact the administrator.',
                    'error': 'oauth_not_configured'
                }), 500

            authorization_url, state = google_auth.get_authorization_url()
            session['oauth_state'] = state
            return redirect(authorization_url)
        except Exception as e:
            app.logger.error(f"Google login error: {e}")
            return jsonify({'message': 'Authentication error'}), 500

    # @desc    Google OAuth2 callback
    # @route   GET /auth/google/callback
    # @access  Public
    @app.route('/auth/google/callback')
    def google_callback():
        try:
            code = request.args.get('code')
            state = request.args.get('state')

            if not code:
                return jsonify({'message': 'Authorization code not received'}), 400

            # Exchange code for tokens
            tokens = google_auth.exchange_code_for_tokens(code)
            if not tokens:
                return jsonify({'message': 'Failed to exchange authorization code'}), 400

            # Verify ID token
            user_info = google_auth.verify_id_token(tokens['id_token'])
            if not user_info:
                return jsonify({'message': 'Failed to verify user identity'}), 400

            # --- Check for Admin Access AFTER user_info is available ---
            user_email = user_info.get('email')
            is_admin = False
            if user_email:
                # Get the comma-separated list from the environment variable
                admin_emails_str = os.environ.get('PHOENIX_ADMIN_EMAILS', '')
                # Split into a list, removing any extra whitespace
                admin_emails_list = [email.strip() for email in admin_emails_str.split(',') if email.strip()]
                # Check if the user's email is in the list
                if user_email in admin_emails_list:
                    is_admin = True
                    app.logger.info(f"[Admin] User {user_email} granted admin access via Google Auth.")
                # else:
                #     app.logger.info(f"[User] User {user_email} authenticated via Google Auth (not admin).")
            # --- End Admin Check ---

            # Check if user has already voted
            if voter_session.has_voted(user_info['user_id']):
                return jsonify({'message': 'You have already voted in this election'}), 400

            # Create voter session (pass the is_admin flag)
            session_id = voter_session.create_session(
                user_info['user_id'],
                user_info['email'],
                user_info['name'],
                is_admin=is_admin # Pass the calculated is_admin flag
            )

            # Store session ID in Flask session
            session['voter_session_id'] = session_id
            session['user_info'] = user_info

            # Redirect to voting page
            return redirect('/?authenticated=true')

        except Exception as e:
            app.logger.error(f"Google callback error: {e}")
            return jsonify({'message': 'Authentication error'}), 500

    # @desc    Get current voter session
    # @route   GET /api/auth/session
    # @access  Authenticated
    @app.route('/api/auth/session', methods=['GET'])
    def get_voter_session():
        session_id = session.get('voter_session_id')
        if not session_id:
            return jsonify({'message': 'Not authenticated'}), 401

        voter_info = voter_session.get_session(session_id)
        if not voter_info:
            return jsonify({'message': 'Invalid session'}), 401

        # --- FIX: Add missing comma ---
        return jsonify({
            'authenticated': True,
            'user': {
                'name': voter_info['name'],
                'email': voter_info['email']
            },
            'hasVoted': voter_info['has_voted'], # <-- Comma added here
            'isAdmin': voter_info.get('is_admin', False) # Include admin status
        }), 200
        # --- End FIX ---

    # @desc    Logout voter
    # @route   POST /api/auth/logout
    # @access  Authenticated
    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        session.pop('voter_session_id', None)
        session.pop('user_info', None)
        return jsonify({'message': 'Logged out successfully'}), 200

    # @desc    Demo mode authentication
    # @route   POST /api/auth/demo
    # @access  Public
    @app.route('/api/auth/demo', methods=['POST'])
    def demo_auth():
        try:
            # Create a demo session (not an admin by default in demo mode)
            demo_user_id = f"DEMO_USER_{uuid.uuid4().hex[:8].upper()}"
            session_id = voter_session.create_session(
                demo_user_id,
                'demo@example.com',
                'Demo User',
                is_admin=False # Explicitly set is_admin=False for demo users
            )

            # Store session ID in Flask session
            session['voter_session_id'] = session_id
            session['user_info'] = {
                'user_id': demo_user_id,
                'email': 'demo@example.com',
                'name': 'Demo User'
            }

            return jsonify({
                'message': 'Demo mode activated successfully',
                'user': {
                    'name': 'Demo User',
                    'email': 'demo@example.com'
                }
            }), 200
        except Exception as e:
            app.logger.error(f"Demo auth error: {e}")
            return jsonify({'message': 'Demo authentication failed'}), 500

    # --- NEW ROUTE: Export votes to CSV ---
    # @desc    Export votes to CSV (Updated Format with Names)
    # @route   GET /api/admin/export-csv
    # @access  Admin (protected by require_admin)
    @app.route('/api/admin/export-csv', methods=['GET'])
    @require_admin
    def export_votes_to_csv():
        try:
            # --- Fetch data ---
            votes_data = get_votes()
            candidates = get_candidates()

            # --- Create candidate lookup dict ---
            # Map candidate ID to candidate name for easy lookup
            candidate_lookup = {c.id: c.name for c in candidates}

            # --- Generate CSV in memory ---
            output = io.StringIO()
            writer = csv.writer(output)

            # --- Write CSV header ---
            header = ['Voter ID']
            header.extend([f'Executive {i+1}' for i in range(7)])
            header.extend([f'Council {i+1}' for i in range(8)])
            writer.writerow(header)

            # --- Write vote data ---
            for vote in votes_data.votes:
                row = [vote.voter_id] # Start with Voter ID

                # Add Executive Officers (up to 7) - Lookup names
                executive_names_list = [candidate_lookup.get(cid, f"Unknown ID: {cid}") for cid in vote.executive_candidates[:7]]
                executive_names_list.extend([''] * (7 - len(executive_names_list)))
                row.extend(executive_names_list)

                # Add remaining Council Members (up to 8) - Lookup names
                # Filter out candidates already listed as Executive Officers
                remaining_council_ids = [cid for cid in vote.selected_candidates if cid not in set(vote.executive_candidates)]
                remaining_council_names_list = [candidate_lookup.get(cid, f"Unknown ID: {cid}") for cid in remaining_council_ids[:8]]
                remaining_council_names_list.extend([''] * (8 - len(remaining_council_names_list)))
                row.extend(remaining_council_names_list)

                writer.writerow(row)

            # Get the CSV string
            csv_data = output.getvalue()
            output.close()

            # --- Prepare response ---
            return Response(
                csv_data,
                mimetype='text/csv',
                headers={"Content-Disposition": "attachment;filename=votes_export_with_names.csv"}
            )

        except FileNotFoundError as e:
            app.logger.error(f"Data file not found during CSV export: {e}")
            return jsonify({'message': 'Required data file not found for export.'}), 404
        except Exception as err:
            app.logger.error(f"Error exporting votes to CSV: {err}")
            return jsonify({'message': 'An internal server error occurred during CSV export.'}), 500
    # --- END NEW ROUTE ---

    # --- THE FINAL LINE OF THE FUNCTION ---
    return app

if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=True, port=5000)

