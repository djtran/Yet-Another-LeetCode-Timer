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
    let success = document.querySelector("[class*='result__']").querySelector("[class*='success__']").innerText;
    
    //WrongAnswer, Time Limit Exceeded, Compile Error
    let error = document.querySelector("[class*='result__']").querySelector("[class*='error__']").innerText;

    if (success != null) {
        //stop the problem timer, save the problem data.
        clearInterval(submitTimer);
    } else if (error != null) {
        //increment the error counter for this problem.
        clearInterval(submitTimer);
    }
    //else we poll again some time later.


}

var submitTimer;

function addClickListenerToSubmitButton() {
    document.querySelector('[data-cy="submit-code-btn"]').onclick = function checkSubmission() {
        setInterval(()=>{
            
        }, 250)
    }
}
var currentProblem = "";

function detectChanges() {
    let title = getProblemName();
    let difficulty = getDifficulty();
    let url = getProblemURL();

    if(title != currentProblem) {
        currentProblem = title;
        console.log("new problem, adding timer for " + title);
        
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

        //init code editor listener to start timer automatically if paused but typing.
    }


}

var currentProblem = null;
// Main onLoadPage function, starts the cycles needed to discover the elements inside the page
// and to attach listeners to them
function onLoadPage (evt) {

    setInterval(detectChanges,500);
    console.log("page loaded");




}