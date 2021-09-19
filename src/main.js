console.log('Problem opened');
window.addEventListener("load", onLoadPage, false);

const DIFFICULTY = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    UNKNOWN: "Unknown"
}

function getProblemURL() {
    return window.location.href;
}

//null or a text value
function getProblemName() {
    return document.querySelector('[data-cy="question-title"]').innerText;
}

function getDifficulty() {
    if (document.querySelectorAll('[diff="easy"]').length == 1) {
        return DIFFICULTY.EASY;
    } else if (document.querySelectorAll('[diff="medium"]').length == 1) {
        return DIFFICULTY.MEDIUM;
    } else if (document.querySelectorAll('[diff="hard"]').length == 1) {
        return DIFFICULTY.HARD;
    } else {
        return DIFFICULTY.UNKNOWN;
    }
}

const submissionResultElement = "[class*='result__']";
const submissionSuccessElement = "[class*='success__']";
const submissionErrorElement = "[class*='error__']";

function waitForSubmitResponse() {
    let success = document.querySelector("[class*='result__']").querySelector("[class*='success__']");
    
    //WrongAnswer, Time Limit Exceeded, Compile Error
    let error = document.querySelector("[class*='result__']").querySelector("[class*='error__']");

    if (success != null) {
        //stop the problem timer, save the problem data.
        console.log("SubmitResponse success, writing data")
        pauseTimer();
        let time = timerDisplay.innerText;
        currentSession["successTime"] = time;
        clearInterval(submitTimer);
        chrome.storage.local.get(['history'], function(data) {
            let history = data.history;
            if (history == null) {
                history = []
            }
            history.push(currentSession);
            chrome.storage.local.set({'history':history});
        })

    } else if (error != null) {
        //increment the error counter for this problem.
        console.log("SubmitResponse error, incrementing errors")
        currentSession["errors"] += 1;
        clearInterval(submitTimer);

    }
    //else we poll again some time later.


}

var submitTimer;

function addClickListenerToSubmitButton() {
    document.querySelector('[data-cy="submit-code-btn"]').onclick = () => {
        console.log("submitted");
        submitTimer = setInterval(waitForSubmitResponse, 250);
    }
}

function setupTimer() {        
    //init timer
    let referenceNode = document.querySelector("[data-cy='run-code-btn']");
    timerDisplay = document.createElement("label");
    timerDisplay.classList.add('timer');
    timerDisplay.innerText = "00:00:00";
    timerDisplay.style.marginRight = "16px";
    
    //start button
    startTimerButton = document.createElement("button");
    startTimerButton.classList.add('startTimer')
    startTimerButton.innerText = "Start Timer"
    startTimerButton.style.marginRight = "16px";
    startTimerButton.onclick = startTimer;
    
    //pause button
    pauseTimerButton = document.createElement("button");
    pauseTimerButton.classList.add('pauseTimer')
    pauseTimerButton.innerText = "Pause Timer"
    pauseTimerButton.style.marginRight = "16px";
    pauseTimerButton.onclick = pauseTimer;

    referenceNode.parentNode.insertBefore(startTimerButton, referenceNode);
    referenceNode.parentNode.insertBefore(pauseTimerButton, referenceNode);
    referenceNode.parentNode.insertBefore(timerDisplay, referenceNode);

    resetTimer();
}

var currentProblem = "";
var currentSession = {};

function detectChanges() {
    let title = getProblemName();

    if(title != currentProblem) {
        console.log("Problem Changed");
        //New problem has been loaded.
        currentProblem = title;

        //Setup timer and buttons
        setupTimer();
        //init code editor listener to start timer automatically if paused but typing.

        //Setup submit listener
        addClickListenerToSubmitButton();
        clearInterval(submitTimer);

        //setup data object for this session

        let difficulty = getDifficulty();
        let url = getProblemURL();
        let date = new Date();

        currentSession = {
            "problem": title,
            "difficulty": difficulty,
            "url": url,
            "date": date.toISOString(),
            "errors": 0
        }
        
    }


}

var currentProblem = null;
// Main onLoadPage function, starts the cycles needed to discover the elements inside the page
// and to attach listeners to them
function onLoadPage (evt) {

    setInterval(detectChanges,500);
    console.log("page loaded");

    chrome.storage.local.get(['history'], function(data) {
        let history = data.history;
        console.log(JSON.stringify(history));
    });

}