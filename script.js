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

function testFormat() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    
    // Validate inputs
    if (!exam.name || isNaN(exam.time) || isNaN(exam.questioncount) || exam.questioncount <= 0 || exam.time <= 0) {
        alert("Please fill in all fields with valid values");
        return;
    }
    
    // Initialize question status array
    questionStatus = Array(exam.questioncount).fill('not-visited');
    
    // Initialize user responses array
    userResponses = Array(exam.questioncount).fill(null);
    
    typeSelector();
}

function processScreenshots() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    
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
    updateQuestionStatus();
    
    // Make sure to save the current response before navigating
    updateUserResponse();
    
    if (direction === 'next' && currentQuestion < exam.questioncount) {
        currentQuestion++;
        
        // If this question hasn't been visited yet, mark it as not-answered
        if (questionStatus[currentQuestion-1] === 'not-visited') {
            questionStatus[currentQuestion-1] = 'not-answered';
        }
    } else if (direction === 'prev' && currentQuestion > 1) {
        currentQuestion--;
    }
    
    renderExamInterface();
}

function goToQuestion(qNum) {
    if (qNum < 1 || qNum > exam.questioncount) return;
    
    updateQuestionStatus();
    
    // Make sure to save the current response before navigating
    updateUserResponse();
    
    currentQuestion = qNum;
    
    // If this question hasn't been visited yet, mark it as not-answered
    if (questionStatus[currentQuestion-1] === 'not-visited') {
        questionStatus[currentQuestion-1] = 'not-answered';
    }
    
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
    clearInterval(timerInterval);
    
    // Update status and response for the last question
    updateQuestionStatus();
    updateUserResponse();
    
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
    
    // Add buttons for home and saving summary
    summaryHTML += `
        <div class="form-actions" style="margin-top: 20px;">
            <button class="btn" onclick="window.location.href='index.html'">Back to Home</button>
            <button class="btn" onclick="saveAsPDF()">Save as PDF</button>
        </div>
    </div>`;
    
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

// Function to save summary as PDF using jsPDF
function saveAsPDF() {
    // Check if jsPDF is already loaded
    if (typeof jspdf === 'undefined') {
        // If not loaded, dynamically load jsPDF library
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
            // Once loaded, create the PDF
            createAndDownloadPDF();
        };
        script.onerror = function() {
            alert('Failed to load PDF library. Please try the text option instead.');
        };
        document.body.appendChild(script);
    } else {
        // If already loaded, create the PDF directly
        createAndDownloadPDF();
    }
}

function createAndDownloadPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const title = window.exportSummaryTitle || 'exam_summary';
        const content = window.exportSummaryContent || '';
        const lines = content.split('\n');
        
        // Add title
        doc.setFontSize(16);
        doc.text('Exam Summary', 20, 20);
        
        // Add content
        doc.setFontSize(12);
        let y = 30;
        for (let line of lines) {
            // Check if we need a new page
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, 20, y);
            y += 7;
        }
        
        // Save the PDF
        doc.save(`${title}.pdf`);
    } catch (error) {
        console.error('Error creating PDF:', error);
        alert('Could not create PDF. Falling back to text download.');
        saveAsText();
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

// New function to set up the question upload process
function setupScreenshotQuestions() {
    exam.name = document.getElementById("exam-name").value;
    exam.time = parseInt(document.getElementById("time").value);
    exam.questioncount = parseInt(document.getElementById("question-count").value);
    
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
}
