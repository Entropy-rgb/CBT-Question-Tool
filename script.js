var exam = {
    name: "",
    time: 0,
    questioncount: 0
};
var questionTypes = [];
var questionScreenshots = [];
var currentQuestion = 1;
var questionStatus = []; // Tracks status: 'not-visited', 'answered', 'not-answered', 'marked', 'answered-marked'
var timerInterval;

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
    
    // Update status for last question if needed
    updateQuestionStatus();
    
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
    var responses = `<div class="glass-card"><h2>Exam Submission Summary</h2>`;
    
    responses += `
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
    
    // Add individual responses
    for (var i = 0; i < exam.questioncount; i++) {
        const qNum = i + 1;
        const qType = questionTypes[i];
        
        responses += `<div class="response-item"><b>Question ${qNum}: </b>`;
        summaryContent += `Question ${qNum}: `;
        
        if (qType === "single-correct") {
            let answered = false;
            const options = ['A', 'B', 'C', 'D'];
            
            for (let option of options) {
                try {
                    const element = document.getElementById(`question-${qNum}-${option}`);
                    if (element && element.checked) {
                        responses += `<span class="response-answer">${option}</span>`;
                        summaryContent += `${option}\n`;
                        answered = true;
                        break;
                    }
                } catch (error) {
                    console.log(`Error accessing question ${qNum} option ${option}:`, error);
                }
            }
            
            if (!answered) {
                responses += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            }
        } else if (qType === "multi-correct") {
            let answered = false;
            const options = ['A', 'B', 'C', 'D'];
            let answerText = '';
            
            for (let option of options) {
                try {
                    const element = document.getElementById(`question-${qNum}-${option}`);
                    if (element && element.checked) {
                        responses += `<span class="response-answer">${option} </span>`;
                        answerText += `${option} `;
                        answered = true;
                    }
                } catch (error) {
                    console.log(`Error accessing question ${qNum} option ${option}:`, error);
                }
            }
            
            if (!answered) {
                responses += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            } else {
                summaryContent += `${answerText.trim()}\n`;
            }
        } else if (qType === "numerical") {
            try {
                const element = document.getElementById(`question-${qNum}`);
                if (element && element.value !== "") {
                    responses += `<span class="response-answer">${element.value}</span>`;
                    summaryContent += `${element.value}\n`;
                } else {
                    responses += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                    summaryContent += 'NOT ATTEMPTED\n';
                }
            } catch (error) {
                console.log(`Error accessing numerical question ${qNum}:`, error);
                responses += '<span class="response-unanswered">NOT ATTEMPTED</span>';
                summaryContent += 'NOT ATTEMPTED\n';
            }
        }
        
        responses += "</div>";
    }
    
    // Add buttons for home and saving summary
    responses += `
        <div class="form-actions" style="margin-top: 20px;">
            <button class="btn" onclick="window.location.href='index.html'">Back to Home</button>
            <button class="btn" onclick="saveAsPDF()">Save as PDF</button>
        </div>
    </div>`;
    
    // Store summary content in a global variable for the export functions
    window.exportSummaryContent = summaryContent;
    window.exportSummaryTitle = exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'exam_summary';
    
    workArea.innerHTML = responses;
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
