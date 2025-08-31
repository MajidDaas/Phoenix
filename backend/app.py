from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import uuid
from .config import config
from .utils.data_handler import get_candidates, get_votes, save_votes, get_election_status, save_election_status
from .models import Vote, VotesData, ElectionStatus

def create_app(config_name='default'):
    app = Flask(__name__, static_folder='../frontend')
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Enable CORS for development
    CORS(app)

    # In a real application, use proper authentication (e.g., JWT, sessions)
    # For demo, we'll keep it simple
    DEMO_VOTER_IDS = set()

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
    # @access  Public
    @app.route('/api/votes/submit', methods=['POST'])
    def submit_vote():
        data = request.get_json()
        voter_id = data.get('voterId')
        selected_candidates = data.get('selectedCandidates')
        executive_candidates = data.get('executiveCandidates')
        MAX_SELECTIONS = 15
        MAX_EXECUTIVES = 7

        if not voter_id or not selected_candidates or not executive_candidates:
            return jsonify({'message': 'Voter ID, selected candidates, and executive candidates are required'}), 400

        if len(selected_candidates) != MAX_SELECTIONS:
            return jsonify({'message': f'You must select exactly {MAX_SELECTIONS} candidates'}), 400

        if len(executive_candidates) != MAX_EXECUTIVES:
            return jsonify({'message': f'You must select exactly {MAX_EXECUTIVES} executive officers'}), 400

        # Validate candidate IDs
        candidate_ids = [c.id for c in get_candidates()]
        invalid_selected = any(id not in candidate_ids for id in selected_candidates)
        invalid_executives = any(id not in candidate_ids for id in executive_candidates)

        if invalid_selected or invalid_executives:
            return jsonify({'message': 'Invalid candidate ID provided'}), 400

        election_status = get_election_status()
        if not election_status.is_open:
            return jsonify({'message': 'Election is currently closed'}), 400

        # Verify voter ID again
        if voter_id not in DEMO_VOTER_IDS:
            return jsonify({'message': 'Invalid voter ID'}), 400

        votes_data = get_votes()
        if voter_id in votes_data.voter_ids:
            return jsonify({'message': 'This voter ID has already been used'}), 400

        # Record the vote
        new_vote = Vote(
            id=str(uuid.uuid4()),
            voter_id=voter_id,
            selected_candidates=selected_candidates,
            executive_candidates=executive_candidates,
            timestamp=__import__('datetime').datetime.utcnow().isoformat() + 'Z'
        )

        votes_data.votes.append(new_vote)
        votes_data.voter_ids.append(voter_id)

        if not save_votes(votes_data):
            return jsonify({'message': 'Failed to save vote'}), 500

        # Remove used voter ID from demo set
        DEMO_VOTER_IDS.discard(voter_id)

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
        results = {c.id: {
            **c.to_dict(),
            'councilVotes': 0,
            'executiveVotes': 0
        } for c in candidates}

        for vote in votes_data.votes:
            for id in vote.selected_candidates:
                if id in results:
                    results[id]['councilVotes'] += 1
            for id in vote.executive_candidates:
                if id in results:
                    results[id]['executiveVotes'] += 1

        # Convert to array and sort
        results_array = list(results.values())
        results_array.sort(key=lambda x: x['councilVotes'], reverse=True)  # Sort by council votes

        return jsonify({
            'isOpen': False,
            'results': results_array,
            'stats': {
                'totalCandidates': len(candidates),
                'totalVotes': len(votes_data.votes)
            }
        }), 200

    # @desc    Authenticate admin
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
    # @access  Admin (in real app, protected)
    @app.route('/api/admin/status', methods=['GET'])
    def get_admin_status():
        try:
            status = get_election_status()
            return jsonify(status.to_dict()), 200
        except Exception as err:
            app.logger.error(err)
            return jsonify({'message': 'Server error'}), 500

    # @desc    Toggle election status
    # @route   POST /api/admin/toggle
    # @access  Admin (in real app, protected)
    @app.route('/api/admin/toggle', methods=['POST'])
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
            app.logger.error(err)
            return jsonify({'message': 'Server error'}), 500

    # @desc    Export votes (simplified)
    # @route   GET /api/admin/export
    # @access  Admin (in real app, protected)
    @app.route('/api/admin/export', methods=['GET'])
    def export_votes():
        try:
            votes_data = get_votes()
            # In a real app, you might want to format this differently or use a file response
            return jsonify(votes_data.to_dict()), 200
        except Exception as err:
            app.logger.error(err)
            return jsonify({'message': 'Server error'}), 500

    return app

if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=True, port=5000)
