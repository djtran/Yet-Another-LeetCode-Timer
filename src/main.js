window.addEventListener("load", onLoadPage, false);

const DIFFICULTY = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    UNKNOWN: "N/A"
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
        successfulCompletion = true;
        //stop the problem timer, save the problem data.
        pauseTimer();
        let time = timerDisplay.innerText;
        currentSession["time"] = time;
        clearInterval(submitTimer);
        chrome.storage.local.get(['history'], function (data) {
            let historyData = data.history;
            if (historyData == null) {
                historyData = []
            }
            historyData.push(currentSession);
            chrome.storage.local.set({ 'history': historyData });
        });

        chrome.storage.local.get(['aggregate'], function (data) {
            let agg = data.aggregate;
            if (agg == null) {
                agg = []
            }
            let reduced = {
                "diff": currentSession["difficulty"],
                "err": currentSession["errors"],
                "time": currentSession["time"],
                "date": currentSession["date"]
            }
            agg.push(reduced);
            chrome.storage.local.set({
                "aggregate": agg
            });
            console.log("saving aggregate")
        })

    } else if (error != null) {
        //increment the error counter for this problem.
        currentSession["errors"] += 1;
        clearInterval(submitTimer);

    }
    //else we poll again some time later.


}

var submitTimer;

function addClickListenerToSubmitButton() {
    document.querySelector('[data-cy="submit-code-btn"]').onclick = () => {
        submitTimer = setInterval(waitForSubmitResponse, 250);
    }
}

var successfulCompletion = false;
//If the code area changes, e.g. typing, and we haven't completed the problem start the timer if it hasn't already started.
function addCodeMutationObserver() {
    //More Details https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    // select the target node
    var target = document.querySelector('.CodeMirror')
    // create an observer instance
    var observer = new MutationObserver(function (mutations) {
        if (!successfulCompletion) {
            startTimer();
        }
    });
    // configuration of the observer:
    var config = { subtree: true, childList: true };
    // pass in the target node, as well as the observer options
    observer.observe(target, config);

}

function setupTimer() {

    let checkForExisting = document.querySelector(".timer");
    if (checkForExisting != null) {
        //do nothing
        return;
    }

    //init timer
    let referenceNode = document.querySelector("[data-cy='run-code-btn']");
    timerDisplay = document.createElement("label");
    timerDisplay.classList.add('timer');
    timerDisplay.innerText = "00:00:00";
    timerDisplay.style.marginRight = "16px";
    timerDisplay.style.padding = "8px";

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
}

var currentProblem = "";
var currentSession = {};

function detectChanges() {
    let title = getProblemName();

    if (title != currentProblem) {
        console.log("Problem Changed from " + currentProblem + " to " + title);
        //New problem has been loaded.
        currentProblem = title;

        //Setup timer and buttons
        setupTimer();
        resetTimer();
        //init code editor listener to start timer automatically if paused but typing.
        //Do with a delay to let the code editor populate first, otherwise the mutation observer will watch for it.
        successfulCompletion = false;
        setTimeout(addCodeMutationObserver, 1000);
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
function onLoadPage(evt) {
    setInterval(detectChanges, 500);
}