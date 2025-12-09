// --- 1. Global State Variables ---
let elapsedTimeMs = 0; 
let timerIntervalId = null; 
const UPDATE_INTERVAL = 10;
let currentPresetMarkers = { green: 0, yellow: 0, red: 0 };
let timerWindow = null;
let initialWindowContent = ''; // Stores the popup HTML/CSS template

// --- Weather Data (Fetched) ---
const LOCATION_NAME = 'Mandaluyong City, Philippines';
const WEATHER_DATA = '24°C, 90% humidity, Wind 3 mph N'; // Static data from search result

// --- Colors and Styles ---
const COLOR_DEFAULT_BG = '#FFFFFF';
const COLOR_DEFAULT_DIGIT = '#000000';
const COLOR_CHARCOAL = '#333333';
const COLOR_GREEN = '#4CAF50';
const COLOR_YELLOW = '#FFEB3B';
const COLOR_RED = '#F44336';
const COLOR_WHITE = '#FFFFFF';
const COLOR_BLACK = '#000000';

// --- 2. DOM Elements (Main Window) ---
const display = document.getElementById('timer-display'); 
const sessionNameInput = document.getElementById('session-name-input');
const timerDisplayArea = document.querySelector('.timer-display-area'); 
const timeWeatherDisplay = document.getElementById('time-weather-display'); // NEW REFERENCE

// Manual Controls
const startStopBtn = document.getElementById('start-stop-btn');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const resetBtn = document.getElementById('reset-btn');
const openSignalBtn = document.getElementById('open-signal-btn');

// Records Toggle
const recordsSidebar = document.getElementById('records-sidebar');
const clearRecordsBtn = document.getElementById('clear-records-btn');

// Custom Inputs (Part 2C)
const customInputs = {
    greenMin: document.getElementById('custom-g-min'), greenSec: document.getElementById('custom-g-sec'),
    yellowMin: document.getElementById('custom-y-min'), yellowSec: document.getElementById('custom-y-sec'),
    redMin: document.getElementById('custom-r-min'), redSec: document.getElementById('custom-r-sec'),
};

// Preset Containers (Part 2B)
const speechPresetsDiv = document.getElementById('speech-presets');
const evaluationPresetsDiv = document.getElementById('evaluation-presets');
const breaksPresetsDiv = document.getElementById('breaks-presets');
const ttEvalButton = document.getElementById('tt-eval-btn');

// Record History (Part 3)
const recordsList = document.getElementById('records-list');

// --- 3. Utility Functions ---

function toMs(min, sec) {
    return (min * 60 + sec) * 1000;
}

function toMinSec(totalSec) {
    return { min: Math.floor(totalSec / 60), sec: totalSec % 60 };
}

function formatTime(totalMilliseconds) {
    const safeMilliseconds = Math.max(0, totalMilliseconds);
    const totalSeconds = Math.floor(safeMilliseconds / 1000);
    const milliseconds = safeMilliseconds % 1000;
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor(milliseconds / 10); 

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedHundredths = String(hundredths).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}.<span class="ms-small">${formattedHundredths}</span>`;
}

function updateColorState() {
    let newBgColor = COLOR_CHARCOAL; 
    let newFgColor = COLOR_WHITE;
    let newText = "TIMER";
    
    const elapsed = elapsedTimeMs;
    const { green: gMs, yellow: yMs, red: rMs } = currentPresetMarkers;

    let digitColor = COLOR_DEFAULT_DIGIT; 

    // Check Markers
    if (rMs > 0 && elapsed >= rMs) {
        newBgColor = COLOR_RED;
        newText = "RED";
        digitColor = COLOR_RED; 
    } else if (yMs > 0 && elapsed >= yMs) {
        newBgColor = COLOR_YELLOW;
        newText = "YELLOW";
        newFgColor = COLOR_BLACK; 
        digitColor = COLOR_YELLOW; 
    } else if (gMs > 0 && elapsed >= gMs) {
        newBgColor = COLOR_GREEN;
        newText = "GREEN";
        digitColor = COLOR_GREEN; 
    } else {
        newBgColor = COLOR_CHARCOAL;
        newText = "TIMER";
    }
    
    // Determine status text for the popup
    if (elapsedTimeMs > 0 && newText === "TIMER" && timerIntervalId !== null) {
        newText = "RUNNING"; 
    }
    if (elapsedTimeMs > 0 && timerIntervalId === null) {
        newText = "PAUSED";
    }
    if (elapsedTimeMs === 0 && timerIntervalId === null) {
        newText = "TIMER";
    }

    // Part 1: Main display digit color logic
    display.style.color = digitColor; 

    // Determine Popup Text Color 
    if (newBgColor === COLOR_YELLOW) {
         newFgColor = COLOR_BLACK;
    } else {
         newFgColor = COLOR_WHITE;
    }


    // Timer Window (Popup) Updates 
    if (timerWindow && !timerWindow.closed) {
        const doc = timerWindow.document;
        doc.body.style.backgroundColor = newBgColor;
        
        const h1 = doc.getElementById('popup-text');
        if (h1) {
            h1.textContent = newText;
            h1.style.color = newFgColor;
        }
    }
}


// --- 4. Core Timing Logic (The Tick) ---
function tick() {
    elapsedTimeMs += UPDATE_INTERVAL; 
    
    if (timerWindow && timerWindow.closed) {
        pauseTimer();
        timerWindow = null;
    }

    display.innerHTML = formatTime(elapsedTimeMs); 
    updateColorState(); 
}


// --- 5. Part 2E: Manual Controls ---

function setPresetAndCustomInputStates(disabled) {
    document.querySelectorAll('.preset-btn, .custom-input').forEach(el => {
        el.disabled = disabled;
        el.style.opacity = disabled ? 0.5 : 1;
    });
}

function updateButtonStates(state) {
    if (state === "running") {
        startStopBtn.textContent = "STOP";
        startStopBtn.disabled = false;
        pauseResumeBtn.textContent = "PAUSE";
        pauseResumeBtn.disabled = false;
        setPresetAndCustomInputStates(true);
    } else if (state === "paused") {
        startStopBtn.textContent = "STOP";
        startStopBtn.disabled = false;
        pauseResumeBtn.textContent = "RESUME";
        pauseResumeBtn.disabled = false;
        setPresetAndCustomInputStates(true);
    } else { // "stopped"
        startStopBtn.textContent = "START";
        pauseResumeBtn.textContent = "PAUSE";
        pauseResumeBtn.disabled = true;
        setPresetAndCustomInputStates(false);
    }
}

function startStopTimer() {
    if (startStopBtn.textContent === "STOP") {
        stopTimer(); 
    } else {
        startTimer(); 
    }
}

function pauseResumeTimer() {
    if (pauseResumeBtn.textContent === "PAUSE") {
        pauseTimer(); 
    } else {
        startTimer(); 
    }
}

function startTimer() {
    if (timerIntervalId !== null) return;

    openTimerWindow(COLOR_CHARCOAL); 
    timerIntervalId = setInterval(tick, UPDATE_INTERVAL);
    
    updateButtonStates("running");
}

function stopTimer() {
    if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }

    const timeRecordedMs = elapsedTimeMs;
    
    let presetElement = document.querySelector('.preset-btn.active');
    let presetName = presetElement ? presetElement.textContent : 'Custom';
    
    createRecord(sessionNameInput.value || 'Untitled Speaker', formatTime(timeRecordedMs), presetName);

    resetTimer(); 
}

function pauseTimer() {
    if (timerIntervalId === null) return;
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    updateButtonStates("paused");
    
    updateColorState(); 
}

function resetTimer() {
    if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    
    Object.values(customInputs).forEach(input => input.value = 0);
    
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    
    currentPresetMarkers = { green: 0, yellow: 0, red: 0 };
    elapsedTimeMs = 0; 
    
    display.innerHTML = formatTime(elapsedTimeMs); 
    display.style.color = COLOR_DEFAULT_DIGIT;
    timerDisplayArea.style.backgroundColor = COLOR_DEFAULT_BG;
    
    if (timerWindow && !timerWindow.closed) {
        timerWindow.document.body.style.backgroundColor = COLOR_CHARCOAL;
        const h1 = timerWindow.document.getElementById('popup-text');
        if (h1) {
            h1.textContent = "TIMER";
            h1.style.color = COLOR_WHITE;
        }
    }
    
    updateButtonStates("stopped");
}

function openSignalWindowHandler() {
    openTimerWindow(COLOR_CHARCOAL); 
    
    if (timerWindow && !timerWindow.closed) {
        updateColorState();
    }
}
openSignalBtn.addEventListener('click', openSignalWindowHandler);


// --- NEW HANDLER for Clear All Records Button (Part 3) ---

function clearRecords() {
    if (confirm("Are you sure you want to clear ALL session records? This action cannot be undone.")) {
        recordsList.innerHTML = ''; 
        alert("All session records have been cleared.");
    }
}
clearRecordsBtn.addEventListener('click', clearRecords);


// --- 6. Part 2A: Temporary Background Color Change ---

const tempColorChange = {
    timeoutId: null,
};

function flashDisplayDigits(color, text) {
    clearTimeout(tempColorChange.timeoutId);
    
    display.style.color = color;
    
    // 2. Flash the TimerWindow (meeting the requirement)
    if (timerWindow && !timerWindow.closed) {
        const doc = timerWindow.document;
        // Determine the text color (Black for Yellow, White for others)
        let fgColor = (color === COLOR_YELLOW) ? COLOR_BLACK : COLOR_WHITE;

        doc.body.style.backgroundColor = color;
        const h1 = doc.getElementById('popup-text');
        if (h1) {
            h1.textContent = text.toUpperCase(); // Text is the color name (GREEN, YELLOW, RED)
            h1.style.color = fgColor;
        }
    }
    
    tempColorChange.timeoutId = setTimeout(() => {
        updateColorState();
    }, 5000);
}

document.getElementById('flash-green-btn').addEventListener('click', (e) => 
    flashDisplayDigits(COLOR_GREEN, e.target.textContent)
);
document.getElementById('flash-yellow-btn').addEventListener('click', (e) => 
    flashDisplayDigits(COLOR_YELLOW, e.target.textContent)
);
document.getElementById('flash-red-btn').addEventListener('click', (e) => 
    flashDisplayDigits(COLOR_RED, e.target.textContent)
);


// --- 7. Part 2B: Preset Logic ---

const PRESETS = {
    speech: [
        { name: "Prepared Speech", green: 5 * 60, yellow: 6 * 60, red: 7 * 60 },
        { name: "Table Topics", green: 60, yellow: 90, red: 120 },
        { name: "Capstone 10-12 mins", green: 10 * 60, yellow: 11 * 60, red: 12 * 60 },
        { name: "Keynote 18-22 mins", green: 18 * 60, yellow: 20 * 60, red: 22 * 60 },
    ],
    evaluation: [
        { name: "Speech Evaluation", green: 120, yellow: 150, red: 180 },
    ],
    breaks: [
        { name: "1 min", green: 40, yellow: 50, red: 60 },
        { name: "5 mins", green: 3 * 60, yellow: 4 * 60, red: 5 * 60 },
        { name: "10 mins", green: 8 * 60, yellow: 9 * 60, red: 10 * 60 },
        { name: "15 mins", green: 10 * 60, yellow: 13 * 60, red: 15 * 60 },
    ]
};

function loadPreset(gSec, ySec, rSec) {
    // ALWAYS reset the timer first
    resetTimer();
    
    updateCustomInputs(gSec, ySec, rSec);

    currentPresetMarkers = {
        green: gSec * 1000,
        yellow: ySec * 1000,
        red: rSec * 1000
    };
    
    elapsedTimeMs = 0; 
    display.innerHTML = formatTime(elapsedTimeMs);
    display.style.color = COLOR_DEFAULT_DIGIT;
    
    startTimer(); 
}

// 7.1 Dynamic Table Topics Evaluation Logic
ttEvalButton.addEventListener('click', () => {
    setPresetAndCustomInputStates(true);
    let numSpeakers = parseInt(prompt("Enter number of Table Topics speakers (1-10):"), 10);
    setPresetAndCustomInputStates(false);

    if (isNaN(numSpeakers) || numSpeakers < 1 || numSpeakers > 10) {
        alert("Invalid number of speakers. Must be between 1 and 10.");
        return;
    }

    let gSec, ySec, rSec;
    const MINUTE = 60;

    if (numSpeakers === 1) {
        // N=1 Speaker: Fixed limits
        gSec = 2 * MINUTE;      // 120 seconds (2:00)
        ySec = 2.5 * MINUTE;    // 150 seconds (2:30)
        rSec = 3 * MINUTE;      // 180 seconds (3:00)
    } else {
        // N >= 2 Speakers: Scaled limits
        // R = 2 mins + N mins
        rSec = (2 * MINUTE) + (numSpeakers * MINUTE);
        // Y = R - 1 min
        ySec = rSec - MINUTE;
        // G = Y - 1 min
        gSec = ySec - MINUTE;
    }
    
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    ttEvalButton.classList.add('active');

    loadPreset(gSec, ySec, rSec);
});

// 7.2 Render and Attach Preset Buttons
function renderPresets() {
    ['speech', 'evaluation', 'breaks'].forEach(type => {
        PRESETS[type].forEach(preset => {
            if (preset.name === "Speech Evaluation") return; 
            
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.name;
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                loadPreset(preset.green, preset.yellow, preset.red);
            });
            
            document.getElementById(`${type}-presets`).appendChild(btn);
        });
    });
    
    document.querySelector('.preset-group:has(#tt-eval-btn) button:not(#tt-eval-btn)').addEventListener('click', (e) => {
        const preset = PRESETS.evaluation.find(p => p.name === "Speech Evaluation");
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadPreset(preset.green, preset.yellow, preset.red);
    });
}
renderPresets();


// --- 8. Part 2C: Custom Input Logic ---

function updateCustomInputs(gSec, ySec, rSec) {
    let g = toMinSec(gSec);
    customInputs.greenMin.value = g.min;
    customInputs.greenSec.value = g.sec;
    let y = toMinSec(ySec);
    customInputs.yellowMin.value = y.min;
    customInputs.yellowSec.value = y.sec;
    let r = toMinSec(rSec);
    customInputs.redMin.value = r.min;
    customInputs.redSec.value = r.sec;
}

document.querySelectorAll('.custom-input').forEach(input => {
    input.addEventListener('input', () => {
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        
        const gMs = toMs(parseInt(customInputs.greenMin.value) || 0, parseInt(customInputs.greenSec.value) || 0);
        const yMs = toMs(parseInt(customInputs.yellowMin.value) || 0, parseInt(customInputs.yellowSec.value) || 0);
        const rMs = toMs(parseInt(customInputs.redMin.value) || 0, parseInt(customInputs.redSec.value) || 0);

        if (rMs < yMs || yMs < gMs) {
            alert("Custom marker times must be in order: Green <= Yellow <= Red.");
            currentPresetMarkers = { green: 0, yellow: 0, red: 0 };
            elapsedTimeMs = 0;
            display.textContent = formatTime(0);
            return;
        }

        currentPresetMarkers = { green: gMs, yellow: yMs, red: rMs };
        
        if (timerIntervalId === null) {
            elapsedTimeMs = 0; 
            display.innerHTML = formatTime(elapsedTimeMs); 
            updateColorState(); 
        }
    });
});


// --- 9. Part 3: Record History ---

function createRecord(name, time, preset) {
    const recordText = `Speaker: ${name} | Time: ${time} | Preset: ${preset}`;
    
    const li = document.createElement('li');
    li.className = 'record-item';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = recordText;
    li.appendChild(textSpan);
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.onclick = () => copyRecordToClipboard(recordText, copyBtn);
    
    li.appendChild(copyBtn);
    recordsList.prepend(li);
}

function copyRecordToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = '✅ Copied!';
        setTimeout(() => {
            button.textContent = '📋 Copy';
        }, 1500);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        button.textContent = '❌ Failed';
    });
}


// --- NEW: Date/Time/Weather Update Logic ---

function updateDateTimeWeather() {
    const now = new Date();
    
    // Format Date (e.g., Wednesday, Dec 10, 2025)
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', optionsDate);

    // Format Time (e.g., 05:46:58 AM)
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedTime = now.toLocaleTimeString('en-US', optionsTime);

    // Combine output
    const output = `
        <p>${formattedDate} | ${formattedTime}</p>
        <p>Location: ${LOCATION_NAME}</p>
        <p>Weather: ${WEATHER_DATA}</p>
    `;

    if (timeWeatherDisplay) {
        timeWeatherDisplay.innerHTML = output;
    }
}
setInterval(updateDateTimeWeather, 1000); // Update every second


// --- 10. Inter-Window Communication (Popup) ---

function openTimerWindow(initialBgColor) {
    // 1. Define the initial content only once
    if (initialWindowContent === '') {
        initialWindowContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Active Timer Signal</title>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: ${initialBgColor}; 
                        font-family: 'Poppins', Arial, sans-serif; 
                        overflow: hidden;
                        transition: background-color 0.3s;
                    }
                    h1 {
                        color: ${COLOR_WHITE};
                        font-size: 15vw; 
                        font-weight: bold;
                        letter-spacing: 5px;
                        text-transform: uppercase;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                        transition: color 0.3s;
                        white-space: nowrap; 
                    }
                </style>
            </head>
            <body>
                <h1 id="popup-text"></h1>
            </body>
            </html>
        `;
    }

    // 2. CREATE or REUSE the window
    if (!timerWindow || timerWindow.closed) {
        // Create new window
        timerWindow = window.open(
            '', 
            'TimerSignal', 
            'width=300,height=150,resizable=yes,scrollbars=no' 
        );
        
        // Write content to the new window
        if (timerWindow) {
            timerWindow.document.write(initialWindowContent);
            timerWindow.document.close();
            
            // PROTECTION AGAINST ACCIDENTAL CLOSURE:
            timerWindow.onbeforeunload = () => {
                if (timerIntervalId !== null) {
                    // Returning a string triggers the confirmation prompt
                    return "The timer is currently running. Closing this window will pause the main timer."; 
                }
            };
        }
    } else {
        // If window exists, just bring it to the front 
        timerWindow.focus();
    }
}


// --- 11. Event Listeners and Initialization ---
startStopBtn.addEventListener('click', startStopTimer);
pauseResumeBtn.addEventListener('click', pauseResumeTimer);
resetBtn.addEventListener('click', resetTimer);
openSignalBtn.addEventListener('click', openSignalWindowHandler);


document.addEventListener('DOMContentLoaded', () => {
    display.innerHTML = formatTime(0); 
    updateButtonStates("stopped");
    
    // Initial call to set the time/weather display
    updateDateTimeWeather(); 
    
    openTimerWindow(COLOR_CHARCOAL);
    
    if (timerWindow && !timerWindow.closed) {
        const h1 = timerWindow.document.getElementById('popup-text');
        if (h1) {
            h1.textContent = "TIMER"; 
            h1.style.color = COLOR_WHITE;
            timerWindow.document.body.style.backgroundColor = COLOR_CHARCOAL;
        }
    }
});