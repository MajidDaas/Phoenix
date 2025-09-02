// main.js - Main application logic

// State management
let selectedCandidates = [];
let executiveCandidates = [];
const maxSelections = 15;
const maxExecutives = 7;
let activeDetails = null;
let electionOpen = true; // This will be updated by the backend
let currentChart = null;
const totalVoters = 20; // Number of eligible voters (for demo)
let currentUser = null; // Store the authenticated user information
let candidates = []; // Moved from const to let, initialized as empty

// DOM Elements
const candidateList = document.getElementById('candidateList');
const selectedCount = document.getElementById('selectedCount');
const executiveCount = document.getElementById('executiveCount');
const submitVoteBtn = document.getElementById('submitVoteBtn');
const electionStatus = document.getElementById('electionStatus');
const resultsContent = document.getElementById('resultsContent');
const winnerInfoPopup = document.getElementById('winnerInfoPopup');

// --- UI Functions ---

// Initialize candidates for voting (Simple cards for voting tab)
function initCandidates() {
    candidateList.innerHTML = '';
    candidates.forEach(candidate => {
        const activityClass = candidate.activity >= 14 ? 'activity-high' :
                            candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
        const activityText = candidate.activity >= 14 ? 'High Activity' :
                           candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';
        const card = document.createElement('div');
        card.className = 'candidate-item';
        card.dataset.id = candidate.id;
        // --- Simplified Voting Card ---
        card.innerHTML = `
            <div class="candidate-info" data-id="${candidate.id}">
                <i class="fas fa-info"></i>
            </div>
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                 onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
            <div class="candidate-name">${candidate.name}</div>
            <div class="candidate-position">${candidate.position}</div>
            <div class="activity-indicator ${activityClass}">${activityText}</div>
            <div class="candidate-details" id="details-${candidate.id}">
                <div class="close-details" data-id="${candidate.id}">×</div>
                <h4>${candidate.name}</h4>
                <p>${candidate.bio}</p>
                <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
            </div>
        `;
        // --- End Simplified Voting Card ---
        card.addEventListener('click', (e) => {
            // Prevent triggering when clicking on info icon or close button
            if (e.target.closest('.candidate-info') || e.target.closest('.close-details')) {
                return;
            }
            const id = parseInt(card.dataset.id);
            selectCandidate(id);
        });
        candidateList.appendChild(card);
    });
    // Add event listeners for info icons
    document.querySelectorAll('.candidate-info').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(icon.dataset.id);
            showCandidateDetails(id);
        });
    });
    // Add event listeners for close buttons
    document.querySelectorAll('.close-details').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(button.dataset.id);
            hideCandidateDetails(id);
        });
    });
}

// Show candidate details (Popup for voting tab)
function showCandidateDetails(id) {
    // Hide any currently active details
    if (activeDetails) {
        hideCandidateDetails(activeDetails);
    }
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.add('show');
        activeDetails = id;
    }
}

// Hide candidate details (Popup for voting tab)
function hideCandidateDetails(id) {
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.remove('show');
        activeDetails = null;
    }
}

// Select candidate for council (UPDATED LOGIC: Clicking EO removes selection entirely)
function selectCandidate(id) {
    // Check if election is open
    if (!electionOpen) {
        showMessage('Voting is currently closed', 'error');
        return;
    }

    // Ensure candidates data is available
    if (typeof candidates === 'undefined' || !Array.isArray(candidates)) {
        showMessage('Candidate data is not loaded correctly.', 'error');
        return;
    }

    const candidate = candidates.find(c => c.id === id);
    if (!candidate) {
        console.warn(`Candidate with ID ${id} not found.`);
        return;
    }
    const isSelected = selectedCandidates.includes(id);
    const isExecutive = executiveCandidates.includes(id);

    // --- UPDATED LOGIC ---
    if (isSelected) {
        // Clicked on a candidate that is already selected
        if (isExecutive) {
            // --- CHANGE: Clicking an EO removes it completely ---
            // 1. Remove from Executive Officers list (removes orange badge)
            executiveCandidates = executiveCandidates.filter(cId => cId !== id);
            console.log(`Removed candidate ID ${id} from Executive Officers (orange badge removed).`);
            // 2. Remove from Selected list (removes green border)
            selectedCandidates = selectedCandidates.filter(cId => cId !== id);
            console.log(`Deselected candidate ID ${id} (green border removed).`);
            // --- END CHANGE ---
        } else {
            // It's selected but NOT an Executive Officer.
            // Check if we can promote it to Executive Officer
            if (executiveCandidates.length < maxExecutives) {
                executiveCandidates.push(id);
                console.log(`Promoted candidate ID ${id} to Executive Officer (added orange badge).`);
            } else {
                // EO list is full. Interpret click as deselection.
                selectedCandidates = selectedCandidates.filter(cId => cId !== id);
                console.log(`Deselected candidate ID ${id} (EO list full, green border removed).`);
            }
        }
    } else {
        // Clicked on a candidate that is NOT selected
        if (selectedCandidates.length < maxSelections) {
            selectedCandidates.push(id);
            console.log(`Selected candidate ID ${id} (added green border).`);
        } else {
            showMessage(`You can only select ${maxSelections} council members`, 'error');
            return;
        }
    }
    // --- END UPDATED LOGIC ---

    updateUI();
}
// --- END FIXED VOTING LOGIC ---

// Update UI based on selections
function updateUI() {
    // Update counters
    selectedCount.textContent = selectedCandidates.length;
    executiveCount.textContent = executiveCandidates.length;
    // Update card states
    document.querySelectorAll('.candidate-item').forEach(card => {
        const id = parseInt(card.dataset.id);
        const isSelected = selectedCandidates.includes(id);
        const isExecutive = executiveCandidates.includes(id);
        card.classList.toggle('selected', isSelected);
        card.classList.toggle('executive-selected', isExecutive);
        // Remove existing badges
        const existingBadge = card.querySelector('.priority-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        // Add new badge if selected
        if (isSelected) {
            const badge = document.createElement('div');
            badge.className = 'priority-badge';
            badge.textContent = selectedCandidates.indexOf(id) + 1;
            if (isExecutive) {
                badge.classList.add('executive-badge');
                badge.textContent = executiveCandidates.indexOf(id) + 1;
            }
            card.appendChild(badge);
        }
    });
    // Enable/disable submit button
    submitVoteBtn.disabled = selectedCandidates.length !== maxSelections;
}

// Submit vote
async function submitVote() {
    if (!currentUser) {
         showMessage('You must be authenticated before submitting.', 'error');
         return;
    }
    if (selectedCandidates.length !== maxSelections) {
        showMessage(`Please select exactly ${maxSelections} candidates`, 'error');
        return;
    }
    if (executiveCandidates.length !== maxExecutives) {
        showMessage(`Please designate exactly ${maxExecutives} executive officers`, 'error');
        return;
    }
    // Show loading state
    submitVoteBtn.disabled = true;
    document.getElementById('submitLoading').classList.remove('hidden');

    try {
        const response = await ElectionAPI.submitVote(selectedCandidates, executiveCandidates);
        if (response.message && response.message.includes('successfully')) {
            showMessage(`Vote submitted successfully!
Selected Candidates: ${selectedCandidates.length}
Executive Officers: ${executiveCandidates.length}`, 'success');
            // Reset selections
            selectedCandidates = [];
            executiveCandidates = [];
            updateUI();
            // Reset to step 1
            document.getElementById('step1').classList.remove('hidden');
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.add('hidden');
            currentUser = null; // Clear user after submission
        } else {
            showMessage(response.message || 'Failed to submit vote', 'error');
        }
    } catch (err) {
        console.error('Error submitting vote:', err);
        showMessage('An error occurred while submitting your vote. Please try again.', 'error');
    } finally {
        // Hide loading state
        submitVoteBtn.disabled = false;
        document.getElementById('submitLoading').classList.add('hidden');
    }
}


// Render results
async function renderResults() {
    try {
        const resultsData = await ElectionAPI.getResults();
        // Update stats
        document.getElementById('totalCandidates').textContent = resultsData.stats.totalCandidates;
        document.getElementById('voterTurnout').textContent = resultsData.isOpen ?
            'Elections in Progress' :
            `${Math.round((resultsData.stats.totalVotes / totalVoters) * 100)}%`;

        if (resultsData.isOpen) {
            resultsContent.innerHTML = `
                <div class="status-info">
                    <p><i class="fas fa-info-circle"></i> Results will be available after the election is closed.</p>
                </div>
            `;
            return;
        }

        // Use results from backend
        const resultsArray = resultsData.results;
        // Sort to identify executive officers (top 7 by executive votes)
        const sortedByExecutiveVotes = [...resultsArray].sort((a, b) => b.executiveVotes - a.executiveVotes);
        const executiveOfficers = sortedByExecutiveVotes.slice(0, 7).map(c => c.name);

        let resultsHTML = `<div class="results-container">`;
        resultsArray.forEach(candidate => {
            // Find the full candidate object to get winner status and other details
            const fullCandidate = candidates.find(c => c.id === candidate.id);
            const isExecutive = executiveOfficers.includes(candidate.name);
            // Add data attribute for winner status and use winner-name class for styling and interaction
            const winnerClass = (fullCandidate && fullCandidate.isWinner) ? 'winner-name' : '';
            const winnerDataAttr = (fullCandidate && fullCandidate.isWinner) ? `data-is-winner="true"` : `data-is-winner="false"`;
            resultsHTML += `
                <div class="result-card ${isExecutive ? 'executive' : ''}">
                    <h4>
                        <span class="${winnerClass}" ${winnerDataAttr}
                              data-name="${candidate.name}"
                              data-position="${fullCandidate ? fullCandidate.position : ''}"
                              data-bio="${fullCandidate ? fullCandidate.bio : ''}"
                              data-activity="${fullCandidate ? fullCandidate.activity : ''}"
                              onclick="showWinnerPopup(event)">
                            ${candidate.name}
                        </span>
                    </h4>
                    <div class="progress-container">
                        <div class="progress-label">Council Votes:</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (candidate.councilVotes / (resultsArray[0]?.councilVotes || 1)) * 100)}%"></div>
                        </div>
                        <div class="progress-value">${candidate.councilVotes.toLocaleString()}</div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label">Executive Votes:</div>
                        <div class="progress-bar">
                            <div class="progress-fill executive" style="width: ${Math.min(100, (candidate.executiveVotes / (sortedByExecutiveVotes[0]?.executiveVotes || 1)) * 100)}%"></div>
                        </div>
                        <div class="progress-value">${candidate.executiveVotes.toLocaleString()}</div>
                    </div>
                </div>
            `;
        });
        resultsHTML += `</div>`;
        // Add chart container
        resultsHTML += `
            <div class="chart-container">
                <h3><i class="fas fa-chart-bar"></i> Vote Distribution</h3>
                <canvas id="resultsChart" width="400" height="200"></canvas>
            </div>
        `;
        resultsContent.innerHTML = resultsHTML;

        // Create chart
        setTimeout(() => {
            const ctx = document.getElementById('resultsChart').getContext('2d');
            if (currentChart) {
                currentChart.destroy();
            }
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: resultsArray.map(c => c.name),
                    datasets: [
                        {
                            label: 'Council Votes',
                            data: resultsArray.map(c => c.councilVotes),
                            backgroundColor: 'rgba(0, 150, 87, 0.7)',
                            borderColor: 'rgba(0, 150, 87, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Executive Votes',
                            data: resultsArray.map(c => c.executiveVotes),
                            backgroundColor: 'rgba(243, 156, 18, 0.7)',
                            borderColor: 'rgba(243, 156, 18, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y} votes`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Votes'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Candidates'
                            }
                        }
                    }
                }
            });
        }, 100);
    } catch (err) {
        console.error('Error fetching results:', err);
        resultsContent.innerHTML = `<div class="status-error"><p>Error loading results. Please try again later.</p></div>`;
    }
}


// --- Winner Popup ---
// Show winner info popup
function showWinnerPopup(event) {
    const target = event.currentTarget;
    const isWinner = target.getAttribute('data-is-winner') === 'true';
    if (!isWinner) {
        return;
    }
    const name = target.getAttribute('data-name');
    const position = target.getAttribute('data-position');
    const bio = target.getAttribute('data-bio');
    const activity = target.getAttribute('data-activity');
    // Populate popup content
    document.getElementById('popupName').textContent = name;
    document.getElementById('popupPosition').textContent = position;
    document.getElementById('popupBio').textContent = bio;
    document.getElementById('popupActivity').textContent = activity;
    // Position the popup near the cursor or the element
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    winnerInfoPopup.style.left = `${rect.left + scrollLeft + rect.width / 2 - winnerInfoPopup.offsetWidth / 2}px`;
    winnerInfoPopup.style.top = `${rect.top + scrollTop - winnerInfoPopup.offsetHeight - 10}px`;
    // Show the popup
    winnerInfoPopup.style.display = 'block';
}

// Hide winner info popup (can be called by clicking outside or a close button if added)
function hideWinnerPopup() {
    winnerInfoPopup.style.display = 'none';
}
// Add event listener to hide popup when clicking anywhere else
document.addEventListener('click', function(event) {
    if (!winnerInfoPopup.contains(event.target) && event.target.closest('.winner-name') === null) {
        hideWinnerPopup();
    }
});

// --- Voting Process Functions ---

// Request voter ID
// Google OAuth2 Authentication
async function signInWithGoogle() {
    // Show loading state
    document.getElementById('googleSigninBtn').disabled = true;
    document.getElementById('authLoading').classList.remove('hidden');

    try {
        // Check if Google OAuth2 is properly configured
        const response = await fetch('/auth/google/login');
        if (response.status === 500) {
            throw new Error('Google OAuth2 not configured');
        }

        // If we get here, Google OAuth2 is configured but may have issues
        // For now, let's suggest using demo mode
        showMessage('Google OAuth2 is experiencing issues. Please use Demo Mode for testing.', 'error');

    } catch (err) {
        console.error('Error initiating Google sign-in:', err);
        if (err.message === 'Google OAuth2 not configured') {
            showMessage('Google OAuth2 is not configured. Please use Demo Mode or contact the administrator.', 'error');
        } else {
            showMessage('Google OAuth2 is experiencing issues. Please use Demo Mode for testing.', 'error');
        }
    } finally {
        // Hide loading state
        document.getElementById('googleSigninBtn').disabled = false;
        document.getElementById('authLoading').classList.add('hidden');
    }
}

// Demo authentication (skip Google OAuth2)
async function demoAuth() {
    try {
        // Show loading state
        document.getElementById('demoAuthBtn').disabled = true;
        document.getElementById('authLoading').classList.remove('hidden');

        // Call demo authentication endpoint
        const response = await fetch('/api/auth/demo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;

            // Show step 3 directly
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.remove('hidden');

            // Update UI with demo user info
            document.getElementById('confirmedUserName').textContent = currentUser.name;

            // Initialize candidates
            initCandidates();
            updateUI();
            showMessage('Demo mode: Authentication successful. You may now vote.', 'success');
        } else {
            throw new Error('Demo authentication failed');
        }
    } catch (err) {
        console.error('Demo auth error:', err);
        showMessage('Demo authentication failed. Please try again.', 'error');
    } finally {
        // Hide loading state
        document.getElementById('demoAuthBtn').disabled = false;
        document.getElementById('authLoading').classList.add('hidden');
    }
}

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                // Show step 3 if authenticated
                document.getElementById('step1').classList.add('hidden');
                document.getElementById('step2').classList.add('hidden');
                document.getElementById('step3').classList.remove('hidden');
                document.getElementById('confirmedUserName').textContent = currentUser.name;
                initCandidates();
                updateUI();
                showMessage('Welcome back! You are authenticated.', 'success');
            }
        }
    } catch (err) {
        console.log('Not authenticated or error checking auth status');
    }
}

// Proceed to voting after authentication
function proceedToVoting() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('confirmedUserName').textContent = currentUser.name;
    initCandidates();
    updateUI();
    showMessage('Ready to vote!', 'success');
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        // Reset to step 1
        document.getElementById('step1').classList.remove('hidden');
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.add('hidden');
        showMessage('Logged out successfully', 'success');
    } catch (err) {
        console.error('Error logging out:', err);
        showMessage('Error logging out', 'error');
    }
}

// Handle authentication callback from Google OAuth2
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authenticated = urlParams.get('authenticated');

    if (authenticated === 'true') {
        // User was redirected back from Google OAuth2
        checkAuthStatus();
    }
}


// --- Admin Functions ---

// Admin authentication
async function authenticateAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (!password) {
        showMessage('Please enter admin password', 'error');
        return;
    }
    // Show loading state
    document.getElementById('authAdminBtn').disabled = true;
    document.getElementById('adminAuthLoading').classList.remove('hidden');

    try {
        const response = await ElectionAPI.authenticateAdmin(password);
        if (response.message && response.message.includes('authenticated')) {
            document.getElementById('adminControls').classList.remove('hidden');
            showMessage('Admin access granted', 'success');
        } else {
            showMessage(response.message || 'Authentication failed', 'error');
        }
    } catch (err) {
        console.error('Error authenticating admin:', err);
        showMessage('An error occurred during authentication. Please try again.', 'error');
    } finally {
        // Hide loading state
        document.getElementById('authAdminBtn').disabled = false;
        document.getElementById('adminAuthLoading').classList.add('hidden');
    }
}

// Toggle election status
async function toggleElection() {
    try {
        const response = await ElectionAPI.toggleElectionStatus();
        if (response.message) {
            // Update local state
            electionOpen = response.isOpen;
            // Update UI elements
            const btn = document.getElementById('electionToggle');
            if (electionOpen) {
                btn.innerHTML = '<i class="fas fa-toggle-on"></i> Close Election';
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-success');
                electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is currently open';
                electionStatus.classList.remove('closed');
                document.getElementById('electionClosedMessage').classList.add('hidden');
                document.getElementById('step1').classList.remove('disabled');
                showMessage('Election has been opened. Voting is now allowed.', 'success');
            } else {
                btn.innerHTML = '<i class="fas fa-toggle-off"></i> Open Election';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-danger');
                electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
                electionStatus.classList.add('closed');
                document.getElementById('electionClosedMessage').classList.remove('hidden');
                document.getElementById('step1').classList.add('disabled');
                document.getElementById('step2').classList.add('disabled');
                document.getElementById('step3').classList.add('disabled');
                showMessage('Election has been closed. Results are now available.', 'success');
            }
            // Update results display if on results tab
            if (document.getElementById('results').classList.contains('active')) {
                renderResults();
            }
        } else {
            showMessage(response.message || 'Failed to toggle election status', 'error');
        }
    } catch (err) {
        console.error('Error toggling election:', err);
        showMessage('An error occurred while toggling the election. Please try again.', 'error');
    }
}

// Refresh data (placeholder)
async function refreshData() {
    showMessage('Data refreshed successfully', 'success');
    // In a real app, this might re-fetch candidate or vote data
}

// Export votes (placeholder)
async function exportVotes() {
    try {
        await ElectionAPI.exportVotes();
        showMessage('Votes export initiated. Check console for data.', 'success');
        // In a real app, this would trigger a file download
    } catch (err) {
        console.error('Error exporting votes:', err);
        showMessage('An error occurred while exporting votes. Please try again.', 'error');
    }
}

// Backup to cloud (placeholder)
async function backupToCloud() {
    showMessage('Data backed up to cloud successfully', 'success');
    // In a real app, this would make an API call to a backup service
}


// --- Utility Functions ---

// Show status message
function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = `status-message status-${type}`;
    div.innerHTML = `<p>${message}</p>`;
    const container = document.querySelector('.tab-content.active');
    container.insertBefore(div, container.firstChild);
    setTimeout(() => div.remove(), 5000);
}

// UI Controller for tab switching
const UIController = {
    switchTab: (tabName) => {
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to the clicked tab and corresponding content
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        // Specific actions for certain tabs
        if (tabName === 'results') {
            renderResults();
        }
        // Hide any active details when switching tabs
        if (activeDetails) {
            hideCandidateDetails(activeDetails);
        }
        // Hide winner popup when switching tabs
        hideWinnerPopup();
    }
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Phoenix Council Elections frontend initialized');
    loadCandidates(); // Initiates the fetch of candidate data

    // Check for authentication callback
    handleAuthCallback();

    // Initial UI setup
    // Fetch initial election status
    try {
        const statusResponse = await ElectionAPI.getElectionStatus();
        electionOpen = statusResponse.is_open;
        // Update election status display
        if (!electionOpen) {
            electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
            electionStatus.classList.add('closed');
            document.getElementById('electionClosedMessage').classList.remove('hidden');
            document.getElementById('step1').classList.add('disabled');
        }
    } catch (err) {
        console.error('Error fetching initial election status:', err);
    }

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            UIController.switchTab(tab.dataset.tab);
        });
    });

    // Admin button
    document.getElementById('adminBtn').addEventListener('click', () => {
        UIController.switchTab('admin');
    });

    // Authentication buttons
    document.getElementById('googleSigninBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('demoAuthBtn').addEventListener('click', demoAuth);
    document.getElementById('proceedToVoteBtn').addEventListener('click', proceedToVoting);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('submitVoteBtn').addEventListener('click', submitVote);

    // Admin buttons
    document.getElementById('authAdminBtn').addEventListener('click', authenticateAdmin);
    document.getElementById('electionToggle').addEventListener('click', toggleElection);
    document.getElementById('refreshDataBtn').addEventListener('click', refreshData);
    document.getElementById('exportVotesBtn').addEventListener('click', exportVotes);
    document.getElementById('backupToCloudBtn').addEventListener('click', backupToCloud);

    // Initialize the application for the vote tab
    // initCandidates(); // Don't init candidates here, wait for step 3
    updateUI();
    // renderResults(); // Don't render results here, wait for results tab

// ... (code inside DOMContentLoaded) ...
    // Add click outside listener for candidate details
    document.addEventListener('click', (e) => {
        if (activeDetails && !e.target.closest('.candidate-item')) {
            hideCandidateDetails(activeDetails);
        }
    });
    // --- END OF DOMContentLoaded CODE ---
}); // <-- This is the closing bracket of DOMContentLoaded

// --- NEW FUNCTION: Fetch Candidates from Backend ---
/**
 * Fetches the list of candidates from the backend API.
 * Initializes the candidate display UI upon successful fetch.
 */
async function loadCandidates() {
    const candidateListElement = document.getElementById('candidateList');
    if (!candidateListElement) {
        console.error("Candidate list container (#candidateList) not found in the DOM.");
        return;
    }

    // Show a loading indicator while fetching data
    candidateListElement.innerHTML = '<div class="loader"></div>'; // Ensure .loader CSS exists

    try {
        // --- FETCH DATA FROM BACKEND ---
        const response = await fetch('/api/candidates');

        if (!response.ok) {
            throw new Error(`Backend returned error ${response.status}: ${response.statusText}`);
        }

        const candidatesData = await response.json();

        if (!Array.isArray(candidatesData)) {
             throw new Error("Received candidate data is not in the expected array format.");
        }

        // --- SUCCESSFULLY LOADED ---
        candidates = candidatesData; // Assign fetched data to the global variable
        console.log("Candidates successfully loaded from backend:", candidates);

        // --- INITIALIZE UI DEPENDENT ON CANDIDATES ---
        // These functions now use the populated `candidates` array
        initCandidates();
        updateUI(); // Update counters, button states based on (initially empty) selections
        displayInfoCandidates(); // Populate the Info tab candidate list // <-- ADD THIS LINE

    } catch (error) {
        // --- HANDLE ERRORS ---
        console.error("Error loading candidates from backend:", error);
        // Display a user-friendly error message in the candidate list area
        candidateListElement.innerHTML = `
            <div class="status-error">
                <p><i class="fas fa-exclamation-circle"></i> Failed to load candidate data.</p>
                <p>Details: ${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
        // Optionally disable voting if candidates can't be loaded
        // const submitVoteBtn = document.getElementById('submitVoteBtn');
        // if (submitVoteBtn) {
        //     submitVoteBtn.disabled = true;
        //     submitVoteBtn.title = "Cannot submit vote: Candidate data unavailable.";
        // }

    } finally {
        // The loading indicator is replaced by either candidates or an error message,
        // so no specific cleanup is needed here for it in this structure.
    }
}
// --- END NEW FUNCTION ---

// --- NEW FUNCTION: Populate Info Tab Candidates ---
/**
 * Populates the "Meet the Candidates" section in the Info tab with expandable cards.
 */
function displayInfoCandidates() {
    const infoCandidateListElement = document.getElementById('infoCandidateList');
    if (!infoCandidateListElement) {
        console.warn("Info candidate list container (#infoCandidateList) not found.");
        return;
    }

    // Clear any existing content
    infoCandidateListElement.innerHTML = '';

    // Check if candidates data is loaded
    if (!Array.isArray(candidates) || candidates.length === 0) {
        infoCandidateListElement.innerHTML = '<p>Candidate information is not available yet.</p>';
        return;
    }

    // Loop through the loaded candidates array and create expandable HTML elements for the Info tab
    candidates.forEach(candidate => {
        const infoCard = document.createElement('div');
        infoCard.className = 'candidate-item info-candidate-item'; // Add a specific class for styling
        infoCard.dataset.id = candidate.id; // Store ID

        // Determine activity class and text
        const activityClass = candidate.activity >= 14 ? 'activity-high' :
                            candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
        const activityText = candidate.activity >= 14 ? 'High Activity' :
                           candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';

        // Create the initial collapsed view HTML
        infoCard.innerHTML = `
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                 onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
            <div class="candidate-name">${candidate.name}</div>
            <div class="candidate-position">${candidate.position}</div>
            <div class="activity-indicator ${activityClass}">${activityText}</div>
            <div class="candidate-bio-preview">
                <p>${candidate.bio.substring(0, 100)}${candidate.bio.length > 100 ? '...' : ''}</p>
                ${candidate.bio.length > 100 ? '<button class="btn btn-outline expand-info-btn" type="button">View Full Profile</button>' : ''}
            </div>
            <div class="candidate-full-profile hidden">
                 <p>${candidate.bio}</p>
                 <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                 <!-- Add any other fields you want in the full profile -->
                 <button class="btn collapse-info-btn" type="button">Collapse</button>
            </div>
        `;

        // Add click listener to the card itself for expanding
        infoCard.addEventListener('click', (e) => {
             // Prevent triggering if clicking on buttons within the card
             if (e.target.closest('.expand-info-btn') || e.target.closest('.collapse-info-btn')) {
                 return;
             }
             const preview = infoCard.querySelector('.candidate-bio-preview');
             const fullProfile = infoCard.querySelector('.candidate-full-profile');
             if (preview && fullProfile) {
                 preview.classList.add('hidden');
                 fullProfile.classList.remove('hidden');
             }
        });

        // Add specific listener for the "View Full Profile" button if it exists
        const expandBtn = infoCard.querySelector('.expand-info-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the main card click
                const preview = infoCard.querySelector('.candidate-bio-preview');
                const fullProfile = infoCard.querySelector('.candidate-full-profile');
                if (preview && fullProfile) {
                    preview.classList.add('hidden');
                    fullProfile.classList.remove('hidden');
                }
            });
        }

        // Add listener for the "Collapse" button
        const collapseBtn = infoCard.querySelector('.collapse-info-btn');
        if (collapseBtn) {
             collapseBtn.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent triggering the main card click
                 const preview = infoCard.querySelector('.candidate-bio-preview');
                 const fullProfile = infoCard.querySelector('.candidate-full-profile');
                 if (preview && fullProfile) {
                     fullProfile.classList.add('hidden');
                     preview.classList.remove('hidden');
                 }
             });
        }

        infoCandidateListElement.appendChild(infoCard);
    });
}
// --- END NEW FUNCTION ---
