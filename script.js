var exam = {
    name: "",
    time: 0,
    questioncount: 0
};
var questionTypes = [];
var questionScreenshots = [];
var currentQuestion = 1;
var questionStatus = []; // Tracks status: 'not-visited', 'answered', 'not-answered', 'marked', 'answered-marked'
var userResponses = []; // Array to store user responses
var timerInterval;
var currentUploadQuestion = 1;
var totalQuestionsToUpload = 0;

// Security tracking
var securityViolations = {
    tabSwitches: 0,
    lastViolationTime: null,
    logs: [],
    maxWarnings: 3,
    showWarnings: true
};

// Analytics tracking
var examAnalytics = {
    startTime: null,
    questions: [], // Per-question analytics
    totalTimeSpent: 0,
    answerChanges: 0
};

// Initialize theme based on localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (document.getElementById('light-toggle')) {
            document.getElementById('light-toggle').classList.remove('active');
        }
        if (document.getElementById('dark-toggle')) {
            document.getElementById('dark-toggle').classList.add('active');
        }
    }
}

// Toggle between light and dark theme
function toggleTheme() {
    const body = document.body;
    const lightToggle = document.getElementById('light-toggle');
    const darkToggle = document.getElementById('dark-toggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        lightToggle.classList.add('active');
        darkToggle.classList.remove('active');
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        darkToggle.classList.add('active');
        lightToggle.classList.remove('active');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', initTheme);

// Setup visibility change detection for tab switching
document.addEventListener('visibilitychange', function() {
    // Only track tab switches if we're in an exam (has start time) and in screenshot mode
    if (document.visibilityState === 'hidden' && examAnalytics.startTime && exam.mode === 'screenshot') {
        recordTabSwitch();
    }
});

// Function to record a tab switch security violation
function recordTabSwitch() {
    // Only record tab switches in screenshot mode
    if (exam.mode !== 'screenshot') return;
    
    securityViolations.tabSwitches++;
    securityViolations.lastViolationTime = new Date();
    
    // Log the violation details
    securityViolations.logs.push({
        type: 'Tab Switch',
        time: new Date().toLocaleTimeString(),
        question: currentQuestion,
        count: securityViolations.tabSwitches
    });
    
    // Show warning if enabled and under max warnings
    if (securityViolations.showWarnings && securityViolations.tabSwitches <= securityViolations.maxWarnings) {
        showTabSwitchWarning();
    }
}

// Function to show tab switch warning
function showTabSwitchWarning() {
    // Only show if we're in the exam (not during setup) and in screenshot mode
    if (!examAnalytics.startTime || exam.mode !== 'screenshot') return;
    
    // Create warning element if it doesn't exist
    let warningElement = document.getElementById('security-warning');
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'security-warning';
        warningElement.className = 'security-warning';
        document.body.appendChild(warningElement);
        
        // Add CSS for the warning
        const style = document.createElement('style');
        style.textContent = `
            .security-warning {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #ff3b30;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                animation: fadeIn 0.3s, fadeOut 0.3s 4.7s;
                font-weight: bold;
                max-width: 300px;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update warning message
    warningElement.innerHTML = `
        <div>⚠️ Tab switching detected!</div>
        <div style="font-size: 0.9em; margin-top: 5px;">This activity has been logged. (${securityViolations.tabSwitches}/${securityViolations.maxWarnings})</div>
    `;
    
    // Remove warning after 5 seconds
    setTimeout(() => {
        if (warningElement && warningElement.parentNode) {
            warningElement.parentNode.removeChild(warningElement);
        }
    }, 5000);
}

// Initialize analytics data
function initializeAnalytics() {
    examAnalytics.startTime = new Date();
    examAnalytics.totalTimeSpent = 0;
    examAnalytics.answerChanges = 0;
    examAnalytics.questions = [];
    
    // Create analytics object for each question
    for (let i = 0; i < exam.questioncount; i++) {
        examAnalytics.questions.push({
            index: i,
            timeSpent: 0,
            visits: 0,
            answerChanges: 0,
            responses: [],
            visitStartTime: null,
            lastVisitTime: null
        });
    }
}

// Track question visit
function recordQuestionVisit(questionIndex) {
    const qAnalytics = examAnalytics.questions[questionIndex];
    qAnalytics.visits++;
    qAnalytics.lastVisitTime = new Date();
    
    // Record start time for this visit to track time spent
    qAnalytics.visitStartTime = new Date();
}

// End question visit and update time spent
function endQuestionVisit(questionIndex) {
    const qAnalytics = examAnalytics.questions[questionIndex];
    if (qAnalytics.visitStartTime) {
        const now = new Date();
        const timeSpent = (now - qAnalytics.visitStartTime) / 1000; // in seconds
        qAnalytics.timeSpent += timeSpent;
        qAnalytics.visitStartTime = null;
    }
}

// Record response change
function recordResponseChange(questionIndex, response) {
    const qAnalytics = examAnalytics.questions[questionIndex];
    qAnalytics.answerChanges++;
    examAnalytics.answerChanges++;
    
    // Store response with timestamp
    qAnalytics.responses.push({
        value: response,
        time: new Date()
    });
}

// Generate analytics report
function generateAnalyticsReport() {
    // Calculate end time and total time
    const endTime = new Date();
    const totalDuration = (endTime - examAnalytics.startTime) / 1000; // in seconds
    
    // End timing for current question
    if (currentQuestion) {
        endQuestionVisit(currentQuestion - 1);
    }
    
    // Gather statistics
    let totalQuestionTime = 0;
    let longestQuestion = { index: 0, time: 0 };
    let mostRevisited = { index: 0, visits: 0 };
    let mostChanged = { index: 0, changes: 0 };
    
    examAnalytics.questions.forEach((q, index) => {
        totalQuestionTime += q.timeSpent;
        
        if (q.timeSpent > longestQuestion.time) {
            longestQuestion = { index: index, time: q.timeSpent };
        }
        
        if (q.visits > mostRevisited.visits) {
            mostRevisited = { index: index, visits: q.visits };
        }
        
        if (q.answerChanges > mostChanged.changes) {
            mostChanged = { index: index, changes: q.answerChanges };
        }
    });
    
    // Round times to make them more readable
    examAnalytics.questions.forEach(q => {
        q.timeSpent = Math.round(q.timeSpent * 10) / 10;
    });
    
    // Calculate time spent percentage for each question
    const questionTimePercent = examAnalytics.questions.map(q => ({
        index: q.index + 1,
        timeSpent: q.timeSpent,
        percent: Math.round((q.timeSpent / totalQuestionTime) * 100)
    }));
    
    // Return the compiled report
    return {
        totalDuration: Math.round(totalDuration),
        totalQuestionTime: Math.round(totalQuestionTime),
        totalAnswerChanges: examAnalytics.answerChanges,
        longestQuestion: {
            number: longestQuestion.index + 1,
            time: Math.round(longestQuestion.time * 10) / 10
        },
        mostRevisited: {
            number: mostRevisited.index + 1,
            visits: mostRevisited.visits
        },
        mostChanged: {
            number: mostChanged.index + 1,
            changes: mostChanged.changes
        },
        averageTimePerQuestion: Math.round((totalQuestionTime / exam.questioncount) * 10) / 10,
        questionTimeDistribution: questionTimePercent,
        tabSwitches: securityViolations.tabSwitches,
        securityLogs: securityViolations.logs
    };
}

// Function to create analytics visualization
function createAnalyticsVisualization(analyticsData) {
    // Create basic stats HTML first
    const statsHTML = `
        <div class="analytics-overview">
            <h3>Exam Analytics</h3>
            <div class="analytics-stats">
                <p><strong>Total duration:</strong> ${analyticsData.totalDuration} seconds</p>
                <p><strong>Average time per question:</strong> ${analyticsData.averageTimePerQuestion} seconds</p>
                <p><strong>Total answer changes:</strong> ${analyticsData.totalAnswerChanges}</p>
                <p><strong>Question taking most time:</strong> Question ${analyticsData.longestQuestion.number} (${analyticsData.longestQuestion.time} seconds)</p>
                <p><strong>Most revisited question:</strong> Question ${analyticsData.mostRevisited.number} (${analyticsData.mostRevisited.visits} visits)</p>
                <p><strong>Most changed answers:</strong> Question ${analyticsData.mostChanged.number} (${analyticsData.mostChanged.changes} changes)</p>
            </div>
        </div>
    `;
    
    // Create a simple table-based visualization for time distribution
    let tableHTML = '';
    if (analyticsData.questionTimeDistribution && analyticsData.questionTimeDistribution.length > 0) {
        tableHTML = `
            <div class="time-distribution">
                <h4>Time Distribution</h4>
                <table class="analytics-table">
                    <thead>
                        <tr>
                            <th>Question</th>
                            <th>Time (seconds)</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        analyticsData.questionTimeDistribution.forEach(item => {
            tableHTML += `
                <tr>
                    <td>Question ${item.index}</td>
                    <td>${item.timeSpent}</td>
                    <td>${item.percent}%</td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Create security info if there were tab switches
    let securityHTML = '';
    if (analyticsData.tabSwitches > 0) {
        securityHTML = `
            <div class="security-summary">
                <h4>Security Information</h4>
                <p>Tab switches detected: <strong>${analyticsData.tabSwitches}</strong></p>
            </div>
        `;
    }
    
    // Combine all sections
    const analyticsHTML = `
        <div class="analytics-container">
            ${statsHTML}
            ${tableHTML}
            ${securityHTML}
        </div>
    `;
    
    // Simple, reliable CSS that will work across browsers
    const analyticsStyles = `
        <style>
            .analytics-container {
                margin: 20px 0;
                padding: 15px;
                background-color: #f5f5f5;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .analytics-container h3 {
                margin-top: 0;
                color: #333;
                border-bottom: 2px solid #2196F3;
                padding-bottom: 8px;
                margin-bottom: 15px;
            }
            
            .analytics-container h4 {
                margin-top: 20px;
                margin-bottom: 10px;
                color: #555;
            }
            
            .analytics-stats {
                line-height: 1.6;
            }
            
            .analytics-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 0.9em;
            }
            
            .analytics-table th, .analytics-table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            
            .analytics-table th {
                background-color: #eee;
                font-weight: bold;
            }
            
            .analytics-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            
            .security-summary {
                margin-top: 20px;
                padding: 10px;
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                border-radius: 4px;
            }
            
            /* Dark theme compatibility */
            body[data-theme="dark"] .analytics-container {
                background-color: #333;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            
            body[data-theme="dark"] .analytics-container h3 {
                color: #eee;
                border-bottom-color: #64B5F6;
            }
            
            body[data-theme="dark"] .analytics-container h4 {
                color: #ccc;
            }
            
            body[data-theme="dark"] .analytics-table th {
                background-color: #444;
            }
            
            body[data-theme="dark"] .analytics-table th, 
            body[data-theme="dark"] .analytics-table td {
                border-bottom-color: #555;
            }
            
            body[data-theme="dark"] .analytics-table tr:nth-child(even) {
                background-color: #3a3a3a;
            }
            
            body[data-theme="dark"] .security-summary {
                background-color: #45403c;
                border-left-color: #ffb74d;
            }
        </style>
    `;
    
    return analyticsStyles + analyticsHTML;
}

function testFormat() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    exam.mode = 'manual'; // Set mode to manual
    
    // Validate inputs
    if (!exam.name || isNaN(exam.time) || isNaN(exam.questioncount) || exam.questioncount <= 0 || exam.time <= 0) {
        alert("Please fill in all fields with valid values");
        return;
    }
    
    // Initialize question status array
    questionStatus = Array(exam.questioncount).fill('not-visited');
    
    // Initialize user responses array
    userResponses = Array(exam.questioncount).fill(null);
    
    // Reset security violations
    securityViolations = {
        tabSwitches: 0,
        lastViolationTime: null,
        logs: [],
        maxWarnings: 3,
        showWarnings: true
    };
    
    typeSelector();
}

function processScreenshots() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    exam.mode = 'screenshot'; // Set mode to screenshot
    
    // Get uploaded files
    const fileInput = document.getElementById("question-screenshots");
    const files = fileInput.files;
    
    // Validate inputs
    if (!exam.name || isNaN(exam.time) || isNaN(exam.questioncount) || exam.questioncount <= 0 || exam.time <= 0) {
        alert("Please fill in all fields with valid values");
        return;
    }
    
    if (files.length === 0) {
        alert("Please upload question screenshots");
        return;
    }
    
    if (files.length !== exam.questioncount) {
        alert("Number of screenshots should match the number of questions");
        return;
    }
    
    // Initialize question status array
    questionStatus = Array(exam.questioncount).fill('not-visited');
    
    // Initialize user responses array
    userResponses = Array(exam.questioncount).fill(null);
    
    // Store screenshots
    questionScreenshots = [];
    for (let i = 0; i < files.length; i++) {
        if (!files[i].type.match('image.*')) {
            alert('Please upload only image files');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            questionScreenshots.push(e.target.result);
            
            // When all screenshots are loaded, go to type selection instead of displaying exam
            if (questionScreenshots.length === exam.questioncount) {
                typeSelector(); // Direct to question type selection instead of displaying exam
            }
        };
        reader.readAsDataURL(files[i]);
    }
}

function displayScreenshotExam() {
    // Set first question as current
    currentQuestion = 1;
    questionStatus[0] = 'not-answered';
    
    // Initialize analytics
    initializeAnalytics();
    recordQuestionVisit(0); // Start tracking first question
    
    // Start the exam timer
    startTimer(exam.time);
    
    // Render the exam interface
    renderExamInterface();
}

function renderExamInterface() {
    var workArea = document.getElementById("work-area");
    
    // Create exam container with question content and palette
    var content = `
        <div class="exam-container">
            <!-- Left side: Current question -->
            <div class="question-content">
                ${renderCurrentQuestion()}
                
                <div class="question-navigation">
                    <button class="btn btn-outline action-btn" onclick="navigateQuestion('prev')" ${currentQuestion === 1 ? 'disabled' : ''}>Previous</button>
                    <div class="question-actions">
                        <button class="btn action-btn" onclick="markForReview()">Mark for Review</button>
                        <button class="btn action-btn" onclick="clearCurrentResponse()">Clear Response</button>
                    </div>
                    <button class="btn action-btn" onclick="navigateQuestion('next')" ${currentQuestion === exam.questioncount ? 'disabled' : ''}>Save & Next</button>
                </div>
            </div>
            
            <!-- Right side: Question palette -->
            <div class="question-palette">
                <div class="palette-header">Question Palette</div>
                
                <div class="palette-grid">
                    ${renderQuestionPalette()}
                </div>
                
                <div class="palette-legend">
                    <div class="legend-item">
                        <div class="legend-color answered"></div>
                        <span>Answered</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color not-answered"></div>
                        <span>Not Answered</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color not-visited"></div>
                        <span>Not Visited</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color marked"></div>
                        <span>Marked for Review</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color answered-marked"></div>
                        <span>Answered & Marked for Review</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color current"></div>
                        <span>Current Question</span>
                    </div>
                </div>
                
                <button class="btn" onclick="submit()" style="width: 100%; margin-top: 20px;">Submit Exam</button>
            </div>
        </div>
    `;
    
    workArea.innerHTML = content;
    
    // Add event listeners for answer options
    addAnswerEventListeners();
}

function renderCurrentQuestion() {
    const idx = currentQuestion - 1;
    let questionContent = '';
    
    // Question header
    questionContent += `
        <div class="question-header">
            <h3>Question ${currentQuestion}</h3>
            <span>Question Type: ${getQuestionTypeLabel(questionTypes[idx])}</span>
        </div>
    `;
    
    // Question content
    if (questionScreenshots && questionScreenshots.length > 0) {
        // Screenshot mode
        questionContent += `
            <div class="question-image">
                <img src="${questionScreenshots[idx]}" alt="Question ${currentQuestion}" style="max-width: 100%; border-radius: 8px;">
            </div>
        `;
    }
    
    // Answer options based on question type
    questionContent += renderAnswerOptions(currentQuestion, questionTypes[idx]);
    
    return questionContent;
}

function renderAnswerOptions(qNum, type) {
    switch (type) {
        case "single-correct":
            return `
                <div class="answer-options">
                    <label class="answer-option">
                        <input type="radio" id="question-${qNum}-A" name="question-${qNum}" value="A" ${isOptionChecked(qNum, 'A') ? 'checked' : ''}>
                        <span>A</span>
                    </label>
                    <label class="answer-option">
                        <input type="radio" id="question-${qNum}-B" name="question-${qNum}" value="B" ${isOptionChecked(qNum, 'B') ? 'checked' : ''}>
                        <span>B</span>
                    </label>
                    <label class="answer-option">
                        <input type="radio" id="question-${qNum}-C" name="question-${qNum}" value="C" ${isOptionChecked(qNum, 'C') ? 'checked' : ''}>
                        <span>C</span>
                    </label>
                    <label class="answer-option">
                        <input type="radio" id="question-${qNum}-D" name="question-${qNum}" value="D" ${isOptionChecked(qNum, 'D') ? 'checked' : ''}>
                        <span>D</span>
                    </label>
                </div>
            `;
        case "multi-correct":
            return `
                <div class="answer-options">
                    <label class="answer-option">
                        <input type="checkbox" id="question-${qNum}-A" name="question-${qNum}" value="A" ${isOptionChecked(qNum, 'A') ? 'checked' : ''}>
                        <span>A</span>
                    </label>
                    <label class="answer-option">
                        <input type="checkbox" id="question-${qNum}-B" name="question-${qNum}" value="B" ${isOptionChecked(qNum, 'B') ? 'checked' : ''}>
                        <span>B</span>
                    </label>
                    <label class="answer-option">
                        <input type="checkbox" id="question-${qNum}-C" name="question-${qNum}" value="C" ${isOptionChecked(qNum, 'C') ? 'checked' : ''}>
                        <span>C</span>
                    </label>
                    <label class="answer-option">
                        <input type="checkbox" id="question-${qNum}-D" name="question-${qNum}" value="D" ${isOptionChecked(qNum, 'D') ? 'checked' : ''}>
                        <span>D</span>
                    </label>
                </div>
            `;
        case "numerical":
            return `
                <div class="answer-options">
                    <div class="numerical-input">
                        <input type="number" id="question-${qNum}" name="question-${qNum}" step="0.0001" placeholder="Enter numerical answer" value="${getNumericalAnswer(qNum)}">
                    </div>
                </div>
            `;
        default:
            return '';
    }
}

function isOptionChecked(qNum, option) {
    const element = document.getElementById(`question-${qNum}-${option}`);
    return element && element.checked;
}

function getNumericalAnswer(qNum) {
    const element = document.getElementById(`question-${qNum}`);
    return element ? element.value : '';
}

function getQuestionTypeLabel(type) {
    switch (type) {
        case "single-correct": return "Single Correct Option";
        case "multi-correct": return "Multiple Correct Options";
        case "numerical": return "Numerical Value";
        default: return type;
    }
}

function renderQuestionPalette() {
    let paletteHTML = '';
    
    for (let i = 1; i <= exam.questioncount; i++) {
        const status = questionStatus[i-1];
        const isCurrentQ = i === currentQuestion;
        
        paletteHTML += `
            <div class="palette-item ${status} ${isCurrentQ ? 'current' : ''}" 
                 onclick="goToQuestion(${i})">
                ${i}
            </div>
        `;
    }
    
    return paletteHTML;
}

function navigateQuestion(direction) {
    try {
        updateQuestionStatus();
        
        // Save analytics for current question
        endQuestionVisit(currentQuestion - 1);
        
        // Make sure to save the current response before navigating
        updateUserResponse();
    } catch (error) {
        console.error("Error saving question data:", error);
        // Continue with navigation even if there's an error with saving data
    }
    
    if (direction === 'next' && currentQuestion < exam.questioncount) {
        currentQuestion++;
        
        // If this question hasn't been visited yet, mark it as not-answered
        if (questionStatus[currentQuestion-1] === 'not-visited') {
            questionStatus[currentQuestion-1] = 'not-answered';
        }
    } else if (direction === 'prev' && currentQuestion > 1) {
        currentQuestion--;
    }
    
    // Start tracking new current question
    try {
        recordQuestionVisit(currentQuestion - 1);
    } catch (error) {
        console.error("Error recording question visit:", error);
    }
    
    renderExamInterface();
}

function goToQuestion(qNum) {
    if (qNum < 1 || qNum > exam.questioncount) return;
    
    updateQuestionStatus();
    
    // Save analytics for current question
    endQuestionVisit(currentQuestion - 1);
    
    // Make sure to save the current response before navigating
    updateUserResponse();
    
    currentQuestion = qNum;
    
    // If this question hasn't been visited yet, mark it as not-answered
    if (questionStatus[currentQuestion-1] === 'not-visited') {
        questionStatus[currentQuestion-1] = 'not-answered';
    }
    
    // Start tracking new current question
    recordQuestionVisit(currentQuestion - 1);
    
    renderExamInterface();
}

function markForReview() {
    // Check if the question is already answered
    const qType = questionTypes[currentQuestion-1];
    let hasAnswer = false;
    
    if (qType === 'single-correct' || qType === 'multi-correct') {
        const options = ['A', 'B', 'C', 'D'];
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element && element.checked) {
                hasAnswer = true;
                break;
            }
        }
    } else if (qType === 'numerical') {
        const element = document.getElementById(`question-${currentQuestion}`);
        hasAnswer = element && element.value !== '';
    }
    
    // Set appropriate status
    if (hasAnswer) {
        questionStatus[currentQuestion-1] = 'answered-marked';
    } else {
        questionStatus[currentQuestion-1] = 'marked';
    }
    
    renderExamInterface();
}

function updateQuestionStatus() {
    const qType = questionTypes[currentQuestion-1];
    let hasAnswer = false;
    
    if (qType === 'single-correct' || qType === 'multi-correct') {
        const options = ['A', 'B', 'C', 'D'];
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element && element.checked) {
                hasAnswer = true;
                break;
            }
        }
    } else if (qType === 'numerical') {
        const element = document.getElementById(`question-${currentQuestion}`);
        hasAnswer = element && element.value !== '';
    }
    
    // Only update if not marked for review and not the current status
    const currentStatus = questionStatus[currentQuestion-1];
    if (currentStatus !== 'marked' && currentStatus !== 'answered-marked') {
        questionStatus[currentQuestion-1] = hasAnswer ? 'answered' : 'not-answered';
    } else if (currentStatus === 'answered-marked' && !hasAnswer) {
        // If it was answered & marked but the answer was cleared, change to just marked
        questionStatus[currentQuestion-1] = 'marked';
    } else if (currentStatus === 'marked' && hasAnswer) {
        // If it was marked but now has an answer, change to answered & marked
        questionStatus[currentQuestion-1] = 'answered-marked';
    }
}

function addAnswerEventListeners() {
    const qType = questionTypes[currentQuestion-1];
    
    if (qType === 'single-correct' || qType === 'multi-correct') {
        const options = ['A', 'B', 'C', 'D'];
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element) {
                element.addEventListener('change', function() {
                    const currentStatus = questionStatus[currentQuestion-1];
                    if (currentStatus === 'marked') {
                        questionStatus[currentQuestion-1] = 'answered-marked';
                    } else if (currentStatus !== 'answered-marked') {
                        questionStatus[currentQuestion-1] = 'answered';
                    }
                    
                    // Update the userResponses for this question
                    updateUserResponse();
                });
            }
        }
    } else if (qType === 'numerical') {
        const element = document.getElementById(`question-${currentQuestion}`);
        if (element) {
            element.addEventListener('input', function() {
                const currentStatus = questionStatus[currentQuestion-1];
                const hasValue = this.value !== '';
                
                if (currentStatus === 'marked' && hasValue) {
                    questionStatus[currentQuestion-1] = 'answered-marked';
                } else if (currentStatus !== 'answered-marked') {
                    questionStatus[currentQuestion-1] = hasValue ? 'answered' : 'not-answered';
                } else if (currentStatus === 'answered-marked' && !hasValue) {
                    questionStatus[currentQuestion-1] = 'marked';
                }
                
                // Update the userResponses for this question
                updateUserResponse();
            });
        }
    }
}

function clearCurrentResponse() {
    const qType = questionTypes[currentQuestion-1];
    
    if (qType === 'single-correct' || qType === 'multi-correct') {
        const options = ['A', 'B', 'C', 'D'];
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element) {
                element.checked = false;
            }
        }
    } else if (qType === 'numerical') {
        const element = document.getElementById(`question-${currentQuestion}`);
        if (element) {
            element.value = '';
        }
    }
    
    // Update the userResponses to clear this question's response
    const qIndex = currentQuestion - 1;
    if (userResponses[qIndex]) {
        if (qType === 'single-correct') {
            userResponses[qIndex].answer = null;
        } else if (qType === 'multi-correct') {
            userResponses[qIndex].answers = [];
        } else if (qType === 'numerical') {
            userResponses[qIndex].value = '';
        }
    }
    
    // Update status based on whether it was marked or not
    if (questionStatus[currentQuestion-1] === 'answered-marked') {
        questionStatus[currentQuestion-1] = 'marked';
    } else if (questionStatus[currentQuestion-1] !== 'marked') {
        questionStatus[currentQuestion-1] = 'not-answered';
    }
    
    renderExamInterface();
}

function goBackFromStageOne() {
    var workArea = document.getElementById("work-area");
    workArea.innerHTML = `
    <div class="glass-card">
    <fieldset>
            <legend>Enter Examination Details</legend>
            
            <div class="form-group">
                <span class="instruction-text">Number of questions</span>
                <input type="number" min="1" id="question-count" placeholder="Enter number of questions">
            </div>
            
            <div class="form-group">
                <span class="instruction-text">Examination duration (minutes)</span>
                <input type="number" min="1" id="time" placeholder="Enter duration in minutes">
            </div>
            
            <div class="form-group">
                <span class="instruction-text">Examination name</span>
                <input type="text" id="exam-name" placeholder="Enter exam name">
            </div>
            
            <button id="exam-detail-submit" class="btn" onclick="testFormat()">Proceed</button>
            <button class="btn btn-outline" onclick="window.location.href='index.html'" style="margin-left: 10px;">Back</button>
        </fieldset>
    </div>`;
}

function submit() {
    // Update status and response for the last question
    updateQuestionStatus();
    updateUserResponse();
    
    // Show review screen
    showReviewScreen();
}

function showReviewScreen() {
    var workArea = document.getElementById("work-area");
    
    // Calculate statistics
    const answered = questionStatus.filter(s => s === 'answered').length;
    const notAnswered = questionStatus.filter(s => s === 'not-answered').length;
    const notVisited = questionStatus.filter(s => s === 'not-visited').length;
    const marked = questionStatus.filter(s => s === 'marked').length;
    const answeredMarked = questionStatus.filter(s => s === 'answered-marked').length;
    
    // Add CSS for the review screen
    const reviewStyles = `
        <style>
            .review-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                background: var(--card-bg-color, #fff);
                overflow: hidden;
            }
            
            .review-header {
                margin-bottom: 25px;
                border-bottom: 2px solid var(--primary-color, #3498db);
                padding-bottom: 15px;
                text-align: center;
            }
            
            .review-header h2 {
                margin: 0;
                color: var(--heading-color, #2c3e50);
                font-size: 1.8rem;
            }
            
            .review-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: var(--secondary-bg-color, #f5f9ff);
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: transform 0.2s;
                border-left: 4px solid transparent;
            }
            
            .stat-card:hover {
                transform: translateY(-3px);
            }
            
            .stat-card.answered {
                border-left-color: #4caf50;
            }
            
            .stat-card.not-answered {
                border-left-color: #f44336;
            }
            
            .stat-card.not-visited {
                border-left-color: #9e9e9e;
            }
            
            .stat-card.marked {
                border-left-color: #ff9800;
            }
            
            .stat-card.answered-marked {
                border-left-color: #9c27b0;
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                display: block;
                margin-bottom: 5px;
                color: var(--text-color, #333);
            }
            
            .stat-label {
                font-size: 0.9rem;
                color: var(--secondary-text-color, #666);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .review-questions-container {
                background: var(--secondary-bg-color, #f5f9ff);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
            }
            
            .review-questions-container h3 {
                margin-top: 0;
                margin-bottom: 15px;
                color: var(--heading-color, #2c3e50);
                font-size: 1.3rem;
                border-bottom: 1px solid var(--border-color, #eaeaea);
                padding-bottom: 10px;
            }
            
            .question-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 12px;
            }
            
            .question-status-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid var(--border-color, #eaeaea);
                position: relative;
                background: var(--card-bg-color, #fff);
            }
            
            .question-status-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            }
            
            .question-status-item.answered {
                background-color: rgba(76, 175, 80, 0.1);
                border-color: rgba(76, 175, 80, 0.3);
            }
            
            .question-status-item.not-answered {
                background-color: rgba(244, 67, 54, 0.1);
                border-color: rgba(244, 67, 54, 0.3);
            }
            
            .question-status-item.not-visited {
                background-color: rgba(158, 158, 158, 0.1);
                border-color: rgba(158, 158, 158, 0.3);
            }
            
            .question-status-item.marked {
                background-color: rgba(255, 152, 0, 0.1);
                border-color: rgba(255, 152, 0, 0.3);
            }
            
            .question-status-item.answered-marked {
                background-color: rgba(156, 39, 176, 0.1);
                border-color: rgba(156, 39, 176, 0.3);
            }
            
            .question-number {
                font-weight: bold;
                font-size: 1.2rem;
                margin-bottom: 5px;
                color: var(--heading-color, #2c3e50);
            }
            
            .question-response {
                font-size: 0.9rem;
                color: var(--secondary-text-color, #666);
                text-align: center;
                word-break: break-word;
            }
            
            .review-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 25px;
            }
            
            .review-actions .btn {
                min-width: 150px;
                padding: 12px 20px;
                font-weight: 500;
            }
            
            .btn-primary {
                background-color: var(--primary-color, #3498db);
                color: white;
            }
            
            .btn-secondary {
                background-color: var(--secondary-color, #2c3e50);
                color: white;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid var(--primary-color, #3498db);
                color: var(--primary-color, #3498db);
            }
            
            .status-indicator {
                width: 10px;
                height: 10px;
                position: absolute;
                top: 5px;
                right: 5px;
                border-radius: 50%;
            }
            
            .status-indicator.answered {
                background-color: #4caf50;
            }
            
            .status-indicator.not-answered {
                background-color: #f44336;
            }
            
            .status-indicator.not-visited {
                background-color: #9e9e9e;
            }
            
            .status-indicator.marked {
                background-color: #ff9800;
            }
            
            .status-indicator.answered-marked {
                background-color: #9c27b0;
            }
            
            /* Dark mode compatibility */
            body[data-theme="dark"] .review-container {
                background: var(--card-bg-color, #2d2d2d);
            }
            
            body[data-theme="dark"] .review-header h2 {
                color: var(--heading-color, #e0e0e0);
            }
            
            body[data-theme="dark"] .stat-card {
                background: var(--secondary-bg-color, #3d3d3d);
            }
            
            body[data-theme="dark"] .stat-value {
                color: var(--text-color, #e0e0e0);
            }
            
            body[data-theme="dark"] .stat-label {
                color: var(--secondary-text-color, #aaa);
            }
            
            body[data-theme="dark"] .review-questions-container {
                background: var(--secondary-bg-color, #3d3d3d);
            }
            
            body[data-theme="dark"] .question-status-item {
                background: var(--card-bg-color, #2d2d2d);
                border-color: var(--border-color, #444);
            }
            
            body[data-theme="dark"] .question-number {
                color: var(--heading-color, #e0e0e0);
            }
            
            body[data-theme="dark"] .question-response {
                color: var(--secondary-text-color, #aaa);
            }
        </style>
    `;
    
    var content = reviewStyles + `
        <div class="review-container">
            <div class="review-header">
                <h2>Review Your Answers</h2>
            </div>
            
            <div class="review-stats-grid">
                <div class="stat-card answered">
                    <span class="stat-value">${answered}</span>
                    <span class="stat-label">Answered</span>
                </div>
                <div class="stat-card not-answered">
                    <span class="stat-value">${notAnswered}</span>
                    <span class="stat-label">Not Answered</span>
                </div>
                <div class="stat-card not-visited">
                    <span class="stat-value">${notVisited}</span>
                    <span class="stat-label">Not Visited</span>
                </div>
                <div class="stat-card marked">
                    <span class="stat-value">${marked}</span>
                    <span class="stat-label">Marked for Review</span>
                </div>
                <div class="stat-card answered-marked">
                    <span class="stat-value">${answeredMarked}</span>
                    <span class="stat-label">Answered & Marked</span>
                </div>
            </div>
            
            <div class="review-questions-container">
                <h3>Question Status</h3>
                <div class="question-grid review-questions">
    `;
    
    // Add question status grid
    for (var i = 0; i < exam.questioncount; i++) {
        const qNum = i + 1;
        const status = questionStatus[i];
        const response = userResponses[i];
        
        content += `
            <div class="question-status-item ${status}" onclick="returnToQuestion(${qNum})">
                <div class="status-indicator ${status}"></div>
                <span class="question-number">${qNum}</span>
                <span class="question-response">
        `;
        
        if (response) {
            if (response.type === 'single-correct' && response.answer) {
                content += response.answer;
            } else if (response.type === 'multi-correct' && response.answers && response.answers.length > 0) {
                content += response.answers.join(', ');
            } else if (response.type === 'numerical' && response.value) {
                content += response.value;
            } else {
                content += 'Not Attempted';
            }
        } else {
            content += 'Not Attempted';
        }
        
        content += `
                </span>
            </div>
        `;
    }
    
    content += `
                </div>
            </div>
            
            <div class="review-actions">
                <button class="btn btn-outline" onclick="returnToExam()">Return to Exam</button>
                <button class="btn btn-primary" onclick="submitFinal()">Submit Exam</button>
            </div>
        </div>
    `;
    
    workArea.innerHTML = content;
}

function returnToQuestion(qNum) {
    currentQuestion = qNum;
    renderExamInterface();
}

function returnToExam() {
    renderExamInterface();
}

// Rename the existing submit function to submitFinal
function submitFinal() {
    clearInterval(timerInterval);
    
    // Generate analytics report
    const analyticsReport = generateAnalyticsReport();
    
    var workArea = document.getElementById("work-area");
    
    // Create a variable to store the summary content for export
    let summaryContent = `Exam: ${exam.name}\n`;
    summaryContent += `Total Questions: ${exam.questioncount}\n`;
    
    // Add stats
    const answered = questionStatus.filter(s => s === 'answered').length;
    const notAnswered = questionStatus.filter(s => s === 'not-answered').length;
    const notVisited = questionStatus.filter(s => s === 'not-visited').length;
    const marked = questionStatus.filter(s => s === 'marked').length;
    const answeredMarked = questionStatus.filter(s => s === 'answered-marked').length;
    
    summaryContent += `Answered: ${answered}\n`;
    summaryContent += `Not Answered: ${notAnswered}\n`;
    summaryContent += `Not Visited: ${notVisited}\n`;
    summaryContent += `Marked for Review: ${marked}\n`;
    summaryContent += `Answered & Marked for Review: ${answeredMarked}\n\n`;
    summaryContent += `YOUR RESPONSES:\n`;
    
    // HTML for display
    var summaryHTML = `<div class="glass-card"><h2>Exam Submission Summary</h2>`;
    
    summaryHTML += `
        <div style="margin-bottom: 20px;">
            <p><strong>Exam:</strong> ${exam.name}</p>
            <p><strong>Total Questions:</strong> ${exam.questioncount}</p>
            <p><strong>Answered:</strong> ${answered}</p>
            <p><strong>Not Answered:</strong> ${notAnswered}</p>
            <p><strong>Not Visited:</strong> ${notVisited}</p>
            <p><strong>Marked for Review:</strong> ${marked}</p>
            <p><strong>Answered & Marked for Review:</strong> ${answeredMarked}</p>
        </div>
        <h3>Your Responses</h3>
    `;
    
    // Add individual responses using the userResponses array
    for (var i = 0; i < exam.questioncount; i++) {
        const qNum = i + 1;
        const qType = questionTypes[i];
        const response = userResponses[i];
        
        summaryHTML += `<div class="response-item"><b>Question ${qNum}: </b>`;
        summaryContent += `Question ${qNum}: `;
        
        if (qType === "single-correct") {
            if (response && response.answer) {
                summaryHTML += `<span class="response-answer">${response.answer}</span>`;
                summaryContent += `${response.answer}\n`;
            } else {
                summaryHTML += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            }
        } else if (qType === "multi-correct") {
            if (response && response.answers && response.answers.length > 0) {
                const answerStr = response.answers.join(' ');
                summaryHTML += `<span class="response-answer">${answerStr}</span>`;
                summaryContent += `${answerStr}\n`;
            } else {
                summaryHTML += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            }
        } else if (qType === "numerical") {
            if (response && response.value && response.value !== '') {
                summaryHTML += `<span class="response-answer">${response.value}</span>`;
                summaryContent += `${response.value}\n`;
            } else {
                summaryHTML += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            }
        }
        
        summaryHTML += "</div>";
    }
    
    // Add exam analytics visualization
    summaryHTML += createAnalyticsVisualization(analyticsReport);
    
    // Add buttons for home and saving summary
    summaryHTML += `
        <div class="form-actions" style="margin-top: 20px;">
            <button class="btn" onclick="window.location.href='index.html'">Back to Home</button>
            <button class="btn" onclick="saveAsPDF()">Save as PDF</button>
        </div>
    </div>`;
    
    // Add analytics to the summary content for PDF
    summaryContent += `\nEXAM ANALYTICS:\n`;
    summaryContent += `Total Duration: ${analyticsReport.totalDuration} seconds\n`;
    summaryContent += `Average Time Per Question: ${analyticsReport.averageTimePerQuestion} seconds\n`;
    summaryContent += `Question Taking Most Time: Question ${analyticsReport.longestQuestion.number} (${analyticsReport.longestQuestion.time} seconds)\n`;
    summaryContent += `Most Revisited Question: Question ${analyticsReport.mostRevisited.number} (${analyticsReport.mostRevisited.visits} visits)\n`;
    summaryContent += `Total Answer Changes: ${analyticsReport.totalAnswerChanges}\n`;
    
    if (analyticsReport.tabSwitches > 0) {
        summaryContent += `Tab Switches Detected: ${analyticsReport.tabSwitches}\n`;
    }
    
    // Store summary content in a global variable for the export functions
    window.exportSummaryContent = summaryContent;
    window.exportSummaryTitle = exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'exam_summary';
    
    workArea.innerHTML = summaryHTML;
}

function clearResponse(k, questionType) {
    switch (questionType) {
        case "single-correct":
        case "multi-correct":
            document.getElementById(`question-${k}-A`).checked = false;
            document.getElementById(`question-${k}-B`).checked = false;
            document.getElementById(`question-${k}-C`).checked = false;
            document.getElementById(`question-${k}-D`).checked = false;
            break;
        case "numerical":
            if (document.getElementById(`question-${k}`))
                document.getElementById(`question-${k}`).value = "";
            break;
    }
}

function startTimer(duration) {
    var timer = duration * 60,
        minutes, seconds;
    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        document.getElementById('time-display').textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            timer = duration * 60;
            alert("Time's up! Your responses will no longer be accepted.");
            submit(); // Automatically submit the form when time is up
        }
    }, 1000);
}

function handleTypes() {
    // Initialize question status array
    questionStatus = Array(exam.questioncount).fill('not-visited');
    questionStatus[0] = 'not-answered'; // First question starts as not-answered
    
    // Get question types from form
    questionTypes = [];
    for (var i = 1; i <= exam.questioncount; ++i) {
        var drop = document.getElementById("question-" + i).value;
        questionTypes.push(drop);
    }
    
    // Set first question as current
    currentQuestion = 1;
    
    // Initialize analytics
    initializeAnalytics();
    recordQuestionVisit(0); // Start tracking first question
    
    if (questionScreenshots && questionScreenshots.length > 0) {
        // Screenshot mode - don't start timer yet as it's already started in displayScreenshotExam
        displayScreenshotExam();
    } else {
        // Manual mode - start the exam timer
        startTimer(exam.time);
        renderExamInterface();
    }
}

function typeSelector() {
    var workArea = document.getElementById("work-area");
    var content = `<div class="glass-card">
        <h2>Select Question Types</h2>
        <p class="instruction-text">Choose the appropriate type for each question</p>`;
        
    for (var i = 1; i <= exam.questioncount; ++i) {
        content += `
            <div class="form-group">
                <span class="instruction-text">Question ${i}</span>
                <select name="question-${i}" id="question-${i}" class="question-type-select">
            <option value="single-correct">Single Option Correct</option>
            <option value="multi-correct">Multiple Options Correct</option>
            <option value="numerical">Numerical</option>
        </select>
            </div>`;
    }
    
    content += `
        <button id="type-submit" onclick="handleTypes()" class="btn">Generate Exam</button>
        <button id="go-back-stage-1" onclick="goBackFromStageOne()" class="btn btn-outline" style="margin-left: 10px;">Go Back</button>
    </div>`;
    
    workArea.innerHTML = content;
}
// Function to save summary as PDF using jsPDF with enhanced visuals
function saveAsPDF() {
    // First check if we need to load libraries
    if (typeof jspdf === 'undefined' || typeof Chart === 'undefined' || typeof html2canvas === 'undefined') {
        loadPDFDependencies().then(() => {
            generateVisualPDF();
        }).catch(error => {
            console.error('Error loading dependencies:', error);
            alert('Failed to load PDF libraries. Please try again later.');
        });
    } else {
        // Libraries already loaded
        generateVisualPDF();
    }
}

// Function to load all required libraries for visual PDF
function loadPDFDependencies() {
    return new Promise((resolve, reject) => {
        let loaded = 0;
        const requiredLibs = 3; // jspdf, Chart.js, html2canvas
        
        // Load jsPDF if needed
        if (typeof jspdf === 'undefined') {
            const jsPdfScript = document.createElement('script');
            jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jsPdfScript.onload = () => { if (++loaded === requiredLibs) resolve(); };
            jsPdfScript.onerror = reject;
            document.body.appendChild(jsPdfScript);
        } else {
            loaded++;
        }
        
        // Load Chart.js if needed
        if (typeof Chart === 'undefined') {
            const chartScript = document.createElement('script');
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            chartScript.onload = () => { if (++loaded === requiredLibs) resolve(); };
            chartScript.onerror = reject;
            document.body.appendChild(chartScript);
        } else {
            loaded++;
        }
        
        // Load html2canvas if needed
        if (typeof html2canvas === 'undefined') {
            const canvasScript = document.createElement('script');
            canvasScript.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            canvasScript.onload = () => { if (++loaded === requiredLibs) resolve(); };
            canvasScript.onerror = reject;
            document.body.appendChild(canvasScript);
        } else {
            loaded++;
        }
        
        // If all libraries are already loaded
        if (loaded === requiredLibs) {
            resolve();
        }
    });
}

// Main function to generate visual PDF
function generateVisualPDF() {
    try {
        // Get the analytics report data first
        const analyticsData = generateAnalyticsReport();
        
        // Create container for charts
        const chartsContainer = document.createElement('div');
        chartsContainer.style.position = 'absolute';
        chartsContainer.style.left = '-9999px';
        chartsContainer.style.width = '600px';
        chartsContainer.innerHTML = `
            <div id="timeChart" style="width:600px;height:300px;background:white;">
                <canvas id="timeDistribution" width="600" height="300"></canvas>
            </div>
            <div id="visitsChart" style="width:600px;height:300px;margin-top:20px;background:white;">
                <canvas id="questionVisits" width="600" height="300"></canvas>
            </div>
        `;
        document.body.appendChild(chartsContainer);
        
        // Create data for time distribution chart
        const timeLabels = [];
        const timeData = [];
        
        // Check if examAnalytics.questions exists and has data before using it
        if (examAnalytics.questions && examAnalytics.questions.length > 0) {
            examAnalytics.questions.forEach((q, i) => {
                timeLabels.push('Q' + (i+1));
                timeData.push(Math.round(q.timeSpent * 10) / 10);
            });
            
            // Create time distribution chart
            const timeCtx = document.getElementById('timeDistribution').getContext('2d');
            const timeChart = new Chart(timeCtx, {
                type: 'bar',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'Time spent (seconds)',
                        data: timeData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Time Spent Per Question',
                            font: { size: 16 }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Seconds'
                            }
                        }
                    }
                }
            });
            
            // Create data for visits chart
            const visitLabels = [];
            const visitData = [];
            const changeData = [];
            examAnalytics.questions.forEach((q, i) => {
                visitLabels.push('Q' + (i+1));
                visitData.push(q.visits);
                changeData.push(q.answerChanges);
            });
            
            // Create visits chart
            const visitsCtx = document.getElementById('questionVisits').getContext('2d');
            const visitsChart = new Chart(visitsCtx, {
                type: 'bar',
                data: {
                    labels: visitLabels,
                    datasets: [
                        {
                            label: 'Visits',
                            data: visitData,
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Answer Changes',
                            data: changeData,
                            backgroundColor: 'rgba(255, 159, 64, 0.7)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Question Visits & Answer Changes',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count'
                            }
                        }
                    }
                }
            });
            
            // Wait for charts to render, then create PDF
            setTimeout(() => {
                // We'll create the PDF after the charts have been rendered
                createPDFWithCharts(chartsContainer, analyticsData);
            }, 200);
        } else {
            console.error("No analytics data available for charts");
            // Create a simpler PDF without charts
            createPDFWithoutCharts(analyticsData);
        }
    } catch (error) {
        console.error("Error generating visual PDF:", error);
        alert("Error generating visual PDF. Creating a simpler version instead.");
        try {
            // Create a simpler PDF without charts
            createSimplePDF();
        } catch (simpleError) {
            console.error("Could not create PDF:", simpleError);
            alert("Failed to create PDF. Please try again.");
        }
    }
}

// Function to create PDF with charts
function createPDFWithCharts(chartsContainer, analyticsData) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const title = window.exportSummaryTitle || 'exam_summary';
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(33, 150, 243); // Blue header
        doc.text('Exam Summary Report', 105, 15, { align: 'center' });
        
        // Add exam details
        doc.setFontSize(12);
        doc.setTextColor(68, 68, 68); // Dark gray
        doc.text(`Exam: ${exam.name}`, 15, 25);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
        doc.text(`Total Questions: ${exam.questioncount}`, 15, 35);
        
        // Add response summary
        doc.setFontSize(16);
        doc.setTextColor(33, 150, 243);
        doc.text('Response Summary', 15, 45);
        
        // Calculate stats
        const answered = questionStatus.filter(s => s === 'answered').length;
        const notAnswered = questionStatus.filter(s => s === 'not-answered').length;
        const notVisited = questionStatus.filter(s => s === 'not-visited').length;
        const marked = questionStatus.filter(s => s === 'marked').length;
        const answeredMarked = questionStatus.filter(s => s === 'answered-marked').length;
        
        // Add stats in a box
        doc.setDrawColor(220, 220, 220); // Light gray border
        doc.setFillColor(248, 248, 248); // Light background
        doc.roundedRect(15, 50, 180, 40, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setTextColor(68, 68, 68);
        doc.text(`Answered: ${answered}`, 25, 60);
        doc.text(`Not Answered: ${notAnswered}`, 25, 67);
        doc.text(`Not Visited: ${notVisited}`, 25, 74);
        doc.text(`Marked for Review: ${marked}`, 105, 60);
        doc.text(`Answered & Marked: ${answeredMarked}`, 105, 67);
        
        // Add time analysis section
        doc.setFontSize(16);
        doc.setTextColor(33, 150, 243);
        doc.text('Time Analysis', 15, 100);
        
        // Convert time chart to image
        html2canvas(document.getElementById('timeChart')).then(canvas => {
            // Add time distribution chart
            const timeImgData = canvas.toDataURL('image/png');
            doc.addImage(timeImgData, 'PNG', 15, 105, 180, 90);
            
            // Add statistics text below chart
            doc.setFontSize(11);
            doc.setTextColor(68, 68, 68);
            
            // Format total duration properly using the analytics data
            const totalMinutes = Math.floor(analyticsData.totalDuration / 60);
            const totalSeconds = analyticsData.totalDuration % 60;
            doc.text(`Total Duration: ${totalMinutes} minutes ${totalSeconds} seconds`, 15, 200);
            
            // Average time per question (from analytics data)
            doc.text(`Average Time Per Question: ${analyticsData.averageTimePerQuestion} seconds`, 15, 206);
            
            // Question that took the most time
            doc.text(`Question Taking Most Time: Question ${analyticsData.longestQuestion.number} (${analyticsData.longestQuestion.time} seconds)`, 15, 212);
            
            // Add second page
            doc.addPage();
            
            // Add visit analysis header on second page
            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.text('Question Interaction Analysis', 15, 15);
            
            // Convert visits chart to image
            html2canvas(document.getElementById('visitsChart')).then(visitsCanvas => {
                // Add visits chart
                const visitsImgData = visitsCanvas.toDataURL('image/png');
                doc.addImage(visitsImgData, 'PNG', 15, 20, 180, 90);
                
                // Add security section if applicable
                if (securityViolations.tabSwitches > 0) {
                    doc.setFontSize(16);
                    doc.setTextColor(244, 67, 54); // Red for security
                    doc.text('Security Log', 15, 120);
                    
                    doc.setFillColor(255, 243, 224); // Light warning background
                    doc.roundedRect(15, 125, 180, 15 + (securityViolations.logs.length * 7), 3, 3, 'F');
                    
                    doc.setFontSize(11);
                    doc.setTextColor(68, 68, 68);
                    doc.text(`Tab switches detected: ${securityViolations.tabSwitches}`, 20, 135);
                    
                    // Add security log entries
                    let yPos = 142;
                    securityViolations.logs.forEach(log => {
                        doc.text(`${log.time} - ${log.type} on Question ${log.question}`, 20, yPos);
                        yPos += 7;
                    });
                }
                
                // Add individual responses section
                doc.setFontSize(16);
                doc.setTextColor(33, 150, 243);
                doc.text('Question Responses', 15, 170);
                
                // Create a simplified table of responses
                let responseY = 180;
                let responsesPerPage = 25;
                let responseCount = 0;
                
                for (let i = 0; i < exam.questioncount; i++) {
                    if (responseCount >= responsesPerPage) {
                        doc.addPage();
                        responseY = 20;
                        responseCount = 0;
                    }
                    
                    const qNum = i + 1;
                    const qType = questionTypes[i];
                    const response = userResponses[i];
                    let responseText = 'NOT ATTEMPTED';
                    
                    if (qType === "single-correct" && response && response.answer) {
                        responseText = response.answer;
                    } else if (qType === "multi-correct" && response && response.answers && response.answers.length > 0) {
                        responseText = response.answers.join(' ');
                    } else if (qType === "numerical" && response && response.value) {
                        responseText = response.value;
                    }
                    
                    // Alternate background for better readability
                    if (responseCount % 2 === 0) {
                        doc.setFillColor(248, 248, 248);
                        doc.rect(15, responseY - 4, 180, 7, 'F');
                    }
                    
                    doc.setFontSize(10);
                    doc.setTextColor(68, 68, 68);
                    doc.text(`Q${qNum}`, 20, responseY);
                    doc.text(getQuestionTypeLabel(qType), 40, responseY);
                    doc.text(responseText, 100, responseY);
                    doc.text(questionStatus[i], 160, responseY);
                    
                    responseY += 7;
                    responseCount++;
                }
                
                // Clean up
                document.body.removeChild(chartsContainer);
                
                // Save the PDF
                doc.save(`${title}.pdf`);
            });
        });
    } catch (error) {
        console.error('Error creating PDF with charts:', error);
        alert('Could not create visual PDF. Creating a simpler version instead.');
        // Try creating a PDF without charts as fallback
        createPDFWithoutCharts(analyticsData);
    }
}

// Function to create a simple PDF without charts when analytics data is missing
function createPDFWithoutCharts(analyticsData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const title = window.exportSummaryTitle || 'exam_summary';
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243); // Blue header
    doc.text('Exam Summary Report', 105, 15, { align: 'center' });
    
    // Add exam details
    doc.setFontSize(12);
    doc.setTextColor(68, 68, 68); // Dark gray
    doc.text(`Exam: ${exam.name}`, 15, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
    doc.text(`Total Questions: ${exam.questioncount}`, 15, 35);
    
    // Add response summary
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text('Response Summary', 15, 45);
    
    // Calculate stats
    const answered = questionStatus.filter(s => s === 'answered').length;
    const notAnswered = questionStatus.filter(s => s === 'not-answered').length;
    const notVisited = questionStatus.filter(s => s === 'not-visited').length;
    const marked = questionStatus.filter(s => s === 'marked').length;
    const answeredMarked = questionStatus.filter(s => s === 'answered-marked').length;
    
    // Add stats in a box
    doc.setDrawColor(220, 220, 220); // Light gray border
    doc.setFillColor(248, 248, 248); // Light background
    doc.roundedRect(15, 50, 180, 40, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(68, 68, 68);
    doc.text(`Answered: ${answered}`, 25, 60);
    doc.text(`Not Answered: ${notAnswered}`, 25, 67);
    doc.text(`Not Visited: ${notVisited}`, 25, 74);
    doc.text(`Marked for Review: ${marked}`, 105, 60);
    doc.text(`Answered & Marked: ${answeredMarked}`, 105, 67);
    
    // Add time analysis section
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text('Time Analysis', 15, 100);
    
    // Convert time chart to image
    html2canvas(document.getElementById('timeChart')).then(canvas => {
        // Add time distribution chart
        const timeImgData = canvas.toDataURL('image/png');
        doc.addImage(timeImgData, 'PNG', 15, 105, 180, 90);
        
        // Add statistics text below chart
        doc.setFontSize(11);
        doc.setTextColor(68, 68, 68);
        
        // Format total duration properly using the analytics data
        const totalMinutes = Math.floor(analyticsData.totalDuration / 60);
        const totalSeconds = analyticsData.totalDuration % 60;
        doc.text(`Total Duration: ${totalMinutes} minutes ${totalSeconds} seconds`, 15, 200);
        
        // Average time per question (from analytics data)
        doc.text(`Average Time Per Question: ${analyticsData.averageTimePerQuestion} seconds`, 15, 206);
        
        // Question that took the most time
        doc.text(`Question Taking Most Time: Question ${analyticsData.longestQuestion.number} (${analyticsData.longestQuestion.time} seconds)`, 15, 212);
        
        // Add second page
        doc.addPage();
        
        // Add visit analysis header on second page
        doc.setFontSize(16);
        doc.setTextColor(33, 150, 243);
        doc.text('Question Interaction Analysis', 15, 15);
        
        // Convert visits chart to image
        html2canvas(document.getElementById('visitsChart')).then(visitsCanvas => {
            // Add visits chart
            const visitsImgData = visitsCanvas.toDataURL('image/png');
            doc.addImage(visitsImgData, 'PNG', 15, 20, 180, 90);
            
            // Add security section if applicable
            if (securityViolations.tabSwitches > 0) {
                doc.setFontSize(16);
                doc.setTextColor(244, 67, 54); // Red for security
                doc.text('Security Log', 15, 120);
                
                doc.setFillColor(255, 243, 224); // Light warning background
                doc.roundedRect(15, 125, 180, 15 + (securityViolations.logs.length * 7), 3, 3, 'F');
                
                doc.setFontSize(11);
                doc.setTextColor(68, 68, 68);
                doc.text(`Tab switches detected: ${securityViolations.tabSwitches}`, 20, 135);
                
                // Add security log entries
                let yPos = 142;
                securityViolations.logs.forEach(log => {
                    doc.text(`${log.time} - ${log.type} on Question ${log.question}`, 20, yPos);
                    yPos += 7;
                });
            }
            
            // Add individual responses section
            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.text('Question Responses', 15, 170);
            
            // Create a simplified table of responses
            let responseY = 180;
            let responsesPerPage = 25;
            let responseCount = 0;
            
            for (let i = 0; i < exam.questioncount; i++) {
                if (responseCount >= responsesPerPage) {
                    doc.addPage();
                    responseY = 20;
                    responseCount = 0;
                }
                
                const qNum = i + 1;
                const qType = questionTypes[i];
                const response = userResponses[i];
                let responseText = 'NOT ATTEMPTED';
                
                if (qType === "single-correct" && response && response.answer) {
                    responseText = response.answer;
                } else if (qType === "multi-correct" && response && response.answers && response.answers.length > 0) {
                    responseText = response.answers.join(' ');
                } else if (qType === "numerical" && response && response.value) {
                    responseText = response.value;
                }
                
                // Alternate background for better readability
                if (responseCount % 2 === 0) {
                    doc.setFillColor(248, 248, 248);
                    doc.rect(15, responseY - 4, 180, 7, 'F');
                }
                
                doc.setFontSize(10);
                doc.setTextColor(68, 68, 68);
                doc.text(`Q${qNum}`, 20, responseY);
                doc.text(getQuestionTypeLabel(qType), 40, responseY);
                doc.text(responseText, 100, responseY);
                doc.text(questionStatus[i], 160, responseY);
                
                responseY += 7;
                responseCount++;
            }
            
            // Clean up
            document.body.removeChild(chartsContainer);
            
            // Save the PDF
            doc.save(`${title}.pdf`);
        });
    });
}

// Function to create a very simple PDF when everything else fails
function createSimplePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const title = window.exportSummaryTitle || 'exam_summary';
    
    doc.setFontSize(16);
    doc.text('Exam Summary', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Exam: ${exam.name}`, 20, 30);
    doc.text(`Total Questions: ${exam.questioncount}`, 20, 40);
    
    // Add simple list of responses
    doc.text('Your Responses:', 20, 50);
    let y = 60;
    
    for (let i = 0; i < exam.questioncount; i++) {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        const qNum = i + 1;
        const response = userResponses[i];
        let responseText = 'NOT ATTEMPTED';
        
        if (response) {
            if (response.type === 'single-correct' && response.answer) {
                responseText = response.answer;
            } else if (response.type === 'multi-correct' && response.answers && response.answers.length > 0) {
                responseText = response.answers.join(' ');
            } else if (response.type === 'numerical' && response.value) {
                responseText = response.value;
            }
        }
        
        doc.text(`Question ${qNum}: ${responseText}`, 20, y);
        y += 10;
    }
    
    doc.save(`${title}.pdf`);
}

// New function to set up the question upload process
function setupScreenshotQuestions() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    exam.mode = 'screenshot'; // Set mode to screenshot
    
    // Validate inputs
    if (!exam.name || isNaN(exam.time) || isNaN(exam.questioncount) || exam.questioncount <= 0 || exam.time <= 0) {
        alert("Please fill in all fields with valid values");
        return;
    }
    
    // Initialize variables for question upload
    totalQuestionsToUpload = exam.questioncount;
    currentUploadQuestion = 1;
    questionScreenshots = [];
    questionTypes = [];
    questionStatus = Array(exam.questioncount).fill('not-visited');
    userResponses = Array(exam.questioncount).fill(null);
    
    // Show the upload interface for the first question
    showQuestionUploadInterface();
}

// Function to show the upload interface for the current question
function showQuestionUploadInterface() {
    var workArea = document.getElementById("work-area");
    
    var content = `
        <div class="glass-card">
            <h2>Upload Question ${currentUploadQuestion} of ${totalQuestionsToUpload}</h2>
            
            <div class="form-group">
                <span class="instruction-text">Question Type</span>
                <select id="current-question-type" class="question-type-select">
            <option value="single-correct">Single Option Correct</option>
            <option value="multi-correct">Multiple Options Correct</option>
            <option value="numerical">Numerical</option>
        </select>
            </div>
            
            <div class="form-group">
                <span class="instruction-text">Upload Question Screenshot</span>
                <input type="file" id="current-question-screenshot" accept="image/*">
            </div>
            
            <div id="image-preview-container" style="margin: 15px 0; display: none;">
                <p class="instruction-text">Preview:</p>
                <img id="image-preview" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color);">
            </div>
            
            <div class="form-actions">
                <button class="btn" onclick="uploadCurrentQuestion()">Next Question</button>
                <button class="btn btn-outline" onclick="window.location.href='index.html'">Cancel</button>
            </div>
        </div>
    `;
    
    workArea.innerHTML = content;
    
    // Add event listener for image preview
    document.getElementById('current-question-screenshot').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('image-preview').src = event.target.result;
                document.getElementById('image-preview-container').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// Function to handle uploading the current question
function uploadCurrentQuestion() {
    const fileInput = document.getElementById('current-question-screenshot');
    const questionType = document.getElementById('current-question-type').value;
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Please select a screenshot for this question");
        return;
    }
    
    const file = fileInput.files[0];
    
    if (!file.type.match('image.*')) {
        alert('Please upload only image files');
        return;
    }
    
    // Read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        // Store the question data
        questionScreenshots.push(e.target.result);
        questionTypes.push(questionType);
        
        // Check if we're done or move to the next question
        if (currentUploadQuestion >= totalQuestionsToUpload) {
            finishQuestionUpload();
        } else {
            currentUploadQuestion++;
            showQuestionUploadInterface();
        }
    };
    reader.readAsDataURL(file);
}

// Function to finish the upload process and start the exam
function finishQuestionUpload() {
    // Make sure all questions were uploaded
    if (questionScreenshots.length !== totalQuestionsToUpload) {
        alert("Error: Not all questions were uploaded. Please try again.");
        return;
    }
    
    // Set first question as current
    currentQuestion = 1;
    questionStatus[0] = 'not-answered';
    
    // Make sure analytics are properly initialized
    try {
        initializeAnalytics();
        recordQuestionVisit(0); // Start tracking first question
    } catch (error) {
        console.error("Error initializing analytics:", error);
    }
    
    // Start the exam timer
    startTimer(exam.time);
    
    // Render the exam interface
    renderExamInterface();
}

// Add this new function to update the user response for the current question
function updateUserResponse() {
    const qType = questionTypes[currentQuestion-1];
    const qIndex = currentQuestion - 1;
    
    // Initialize the response object if it doesn't exist
    if (!userResponses[qIndex]) {
        userResponses[qIndex] = {};
    }
    
    // Track previous response for change detection
    const previousResponse = JSON.stringify(userResponses[qIndex]);
    
    if (qType === 'single-correct') {
        // For single correct, store the selected option
        const options = ['A', 'B', 'C', 'D'];
        userResponses[qIndex].type = 'single-correct';
        userResponses[qIndex].answer = null;
        
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element && element.checked) {
                userResponses[qIndex].answer = option;
                break;
            }
        }
    } else if (qType === 'multi-correct') {
        // For multi-correct, store all selected options
        const options = ['A', 'B', 'C', 'D'];
        const selectedOptions = [];
        
        for (let option of options) {
            const element = document.getElementById(`question-${currentQuestion}-${option}`);
            if (element && element.checked) {
                selectedOptions.push(option);
            }
        }
        
        userResponses[qIndex].type = 'multi-correct';
        userResponses[qIndex].answers = selectedOptions;
    } else if (qType === 'numerical') {
        // For numerical, store the input value
        const element = document.getElementById(`question-${currentQuestion}`);
        
        userResponses[qIndex].type = 'numerical';
        userResponses[qIndex].value = element ? element.value : '';
    }
    
    // Check if response changed and record analytics if it did
    const currentResponse = JSON.stringify(userResponses[qIndex]);
    if (previousResponse !== currentResponse) {
        recordResponseChange(qIndex, userResponses[qIndex]);
    }
}

// Function to save summary as text file
function saveAsText() {
    const title = window.exportSummaryTitle || 'exam_summary';
    const content = window.exportSummaryContent || '';
    
    // Create blob and download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

