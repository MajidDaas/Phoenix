// main.js - Main application logic

// Candidate data (for frontend display, results will come from backend)
// In a fully integrated app, this might also come from an API endpoint
const candidates = [
    { id: 1, name: "Sarah Johnson", position: "Community Advocate", photo: "https://randomuser.me/api/portraits/women/44.jpg", activity: 15, bio: "20 years of experience in community development and social programs. Focuses on inclusive growth and social equity.", isWinner: true },
    { id: 2, name: "Michael Chen", position: "Education Specialist", photo: "https://randomuser.me/api/portraits/men/32.jpg", activity: 12, bio: "Former school board member with expertise in educational policy. Advocates for STEM education and digital literacy.", isWinner: true },
    { id: 3, name: "Emma Rodriguez", position: "Environmental Planner", photo: "https://randomuser.me/api/portraits/women/68.jpg", activity: 8, bio: "Urban planning expert focused on sustainable development. Leads initiatives for green infrastructure and renewable energy.", isWinner: true },
    { id: 4, name: "David Kim", position: "Business Development", photo: "https://randomuser.me/api/portraits/men/22.jpg", activity: 14, bio: "Entrepreneur with 15 years in business development. Promotes economic growth through small business support.", isWinner: true },
    { id: 5, name: "Lisa Anderson", position: "Healthcare Advocate", photo: "https://randomuser.me/api/portraits/women/12.jpg", activity: 6, bio: "Registered nurse with 18 years of experience. Focuses on public health initiatives and mental wellness programs.", isWinner: true },
    { id: 6, name: "Robert Martinez", position: "Infrastructure Specialist", photo: "https://randomuser.me/api/portraits/men/65.jpg", activity: 11, bio: "Civil engineer with expertise in urban infrastructure. Leads projects for smart city development and transportation.", isWinner: true },
    { id: 7, name: "Jennifer Lee", position: "Arts & Culture", photo: "https://randomuser.me/api/portraits/women/33.jpg", activity: 9, bio: "Artist and cultural organizer. Promotes local arts programs and cultural diversity initiatives.", isWinner: true },
    { id: 8, name: "Thomas Wilson", position: "Public Safety", photo: "https://randomuser.me/api/portraits/men/41.jpg", activity: 13, bio: "Former police chief with 25 years of experience. Focuses on community policing and crime prevention programs.", isWinner: false },
    { id: 9, name: "Amanda Taylor", position: "Youth Programs", photo: "https://randomuser.me/api/portraits/women/76.jpg", activity: 7, bio: "Educator with focus on youth development. Leads programs for after-school activities and mentorship.", isWinner: false },
    { id: 10, name: "Christopher Brown", position: "Technology Innovation", photo: "https://randomuser.me/api/portraits/men/82.jpg", activity: 16, bio: "Tech entrepreneur and innovation specialist. Promotes digital transformation and tech education.", isWinner: false },
    { id: 11, name: "Michelle Garcia", position: "Housing Advocate", photo: "https://randomuser.me/api/portraits/women/54.jpg", activity: 5, bio: "Housing policy expert. Focuses on affordable housing initiatives and tenant rights.", isWinner: false },
    { id: 12, name: "Daniel Rodriguez", position: "Transportation", photo: "https://randomuser.me/api/portraits/men/19.jpg", activity: 10, bio: "Urban planner specializing in transportation. Advocates for public transit and walkable communities.", isWinner: false },
    { id: 13, name: "Stephanie Clark", position: "Senior Services", photo: "https://randomuser.me/api/portraits/women/28.jpg", activity: 4, bio: "Social worker with focus on senior care. Leads programs for aging in place and senior wellness.", isWinner: false },
    { id: 14, name: "Matthew Hall", position: "Economic Development", photo: "https://randomuser.me/api/portraits/men/53.jpg", activity: 12, bio: "Economist with focus on regional development. Promotes job creation and workforce development.", isWinner: false },
    { id: 15, name: "Rebecca Lewis", position: "Environmental Justice", photo: "https://randomuser.me/api/portraits/women/67.jpg", activity: 8, bio: "Environmental scientist. Focuses on climate action and environmental justice for underserved communities.", isWinner: false },
    { id: 16, name: "Kevin Walker", position: "Public Libraries", photo: "https://randomuser.me/api/portraits/men/74.jpg", activity: 9, bio: "Librarian and educator. Advocates for digital literacy and community learning centers.", isWinner: false },
    { id: 17, name: "Nicole Allen", position: "Disability Rights", photo: "https://randomuser.me/api/portraits/women/39.jpg", activity: 6, bio: "Disability rights advocate. Focuses on accessibility and inclusive community design.", isWinner: false },
    { id: 18, name: "Brandon Young", position: "Sports & Recreation", photo: "https://randomuser.me/api/portraits/men/91.jpg", activity: 11, bio: "Former athlete and coach. Promotes youth sports and community recreation programs.", isWinner: false }
];

// State management
let selectedCandidates = [];
let executiveCandidates = [];
const maxSelections = 15;
const maxExecutives = 7;
let activeDetails = null;
let electionOpen = true; // This will be updated by the backend
let currentChart = null;
const totalVoters = 20; // Number of eligible voters (for demo)
let voterId = null; // Store the voter ID after verification

// DOM Elements
const candidateList = document.getElementById('candidateList');
const selectedCount = document.getElementById('selectedCount');
const executiveCount = document.getElementById('executiveCount');
const submitVoteBtn = document.getElementById('submitVoteBtn');
const electionStatus = document.getElementById('electionStatus');
const resultsContent = document.getElementById('resultsContent');
const winnerInfoPopup = document.getElementById('winnerInfoPopup');

// --- UI Functions ---

// Initialize candidates for voting
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

// Show candidate details
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

// Hide candidate details
function hideCandidateDetails(id) {
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.remove('show');
        activeDetails = null;
    }
}

// Select candidate for council
function selectCandidate(id) {
    // Check if election is open
    if (!electionOpen) {
        showMessage('Voting is currently closed', 'error');
        return;
    }
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    const isSelected = selectedCandidates.includes(id);
    const isExecutive = executiveCandidates.includes(id);
    // Third click - remove completely
    if (isSelected && isExecutive) {
        selectedCandidates = selectedCandidates.filter(cId => cId !== id);
        executiveCandidates = executiveCandidates.filter(cId => cId !== id);
    }
    // Second click - mark as executive
    else if (isSelected) {
        if (executiveCandidates.length < maxExecutives) {
            executiveCandidates.push(id);
        } else {
            showMessage('You can only select 7 executive officers', 'error');
            return;
        }
    }
    // First click - select for council
    else {
        if (selectedCandidates.length < maxSelections) {
            selectedCandidates.push(id);
        } else {
            showMessage('You can only select 15 council members', 'error');
            return;
        }
    }
    updateUI();
}

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
    if (!voterId) {
         showMessage('You must verify your voter ID before submitting.', 'error');
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
        const response = await ElectionAPI.submitVote(voterId, selectedCandidates, executiveCandidates);
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
            voterId = null; // Clear voter ID after submission
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
async function requestVoterID() {
    const email = document.getElementById('voterEmail').value.trim();
    const phone = document.getElementById('voterPhone').value.trim();
    if (!email || !phone) {
        showMessage('Please enter both email and phone number', 'error');
        return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    // Validate phone (last 4 digits)
    if (phone.length !== 4 || !/^\d+$/.test(phone)) {
        showMessage('Please enter exactly 4 digits for your phone number', 'error');
        return;
    }
    // Show loading state
    document.getElementById('requestVoterBtn').disabled = true;
    document.getElementById('requestLoading').classList.remove('hidden');

    try {
        const response = await ElectionAPI.requestVoterID(email, phone);
        if (response.message && response.message.includes('successfully')) {
            // Show step 2
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
            // For demo purposes, show the voter ID in the message
            showMessage(`Demo: ${response.message} ID: ${response.voterId}`, 'info');
        } else {
            showMessage(response.message || 'Failed to request voter ID', 'error');
        }
    } catch (err) {
        console.error('Error requesting voter ID:', err);
        showMessage('An error occurred. Please try again.', 'error');
    } finally {
        // Hide loading state
        document.getElementById('requestVoterBtn').disabled = false;
        document.getElementById('requestLoading').classList.add('hidden');
    }
}

// Skip ID request (demo functionality)
function skipIDRequest() {
    // Generate a demo voter ID
    voterId = "DEMO_VID_" + Math.random().toString(36).substr(2, 9).toUpperCase();
    document.getElementById('confirmedVoterId').textContent = voterId;
    // Show step 3
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    // Initialize candidates
    initCandidates();
    updateUI();
    showMessage('Demo mode: Voter ID skipped. You may now vote.', 'success');
}

// Verify voter ID from email
async function verifyEmailVoterId() {
    const enteredVoterId = document.getElementById('emailVoterId').value.trim();
    if (!enteredVoterId) {
        showMessage('Please enter the voter ID you received via email', 'error');
        return;
    }
    // Show loading state
    document.getElementById('verifyVoterBtn').disabled = true;
    document.getElementById('verifyLoading').classList.remove('hidden');

    try {
        const response = await ElectionAPI.verifyVoterID(enteredVoterId);
        if (response.message && response.message.includes('successfully')) {
            voterId = enteredVoterId; // Store the verified voter ID
            document.getElementById('confirmedVoterId').textContent = enteredVoterId;
            // Show step 3
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.remove('hidden');
            // Initialize candidates
            initCandidates();
            updateUI();
            showMessage('Email verified successfully! You may now vote.', 'success');
        } else {
            showMessage(response.message || 'Invalid voter ID', 'error');
        }
    } catch (err) {
        console.error('Error verifying voter ID:', err);
        showMessage('An error occurred while verifying your ID. Please try again.', 'error');
    } finally {
        // Hide loading state
        document.getElementById('verifyVoterBtn').disabled = false;
        document.getElementById('verifyLoading').classList.add('hidden');
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

    // Voting buttons
    document.getElementById('requestVoterBtn').addEventListener('click', requestVoterID);
    document.getElementById('skipIdRequestBtn').addEventListener('click', skipIDRequest);
    document.getElementById('verifyVoterBtn').addEventListener('click', verifyEmailVoterId);
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

    // Add click outside listener for candidate details
    document.addEventListener('click', (e) => {
        if (activeDetails && !e.target.closest('.candidate-item')) {
            hideCandidateDetails(activeDetails);
        }
    });
});
