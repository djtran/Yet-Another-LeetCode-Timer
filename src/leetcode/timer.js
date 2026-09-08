/**
 * Timer implementation provided from https://olinations.medium.com/an-accurate-vanilla-js-stopwatch-script-56ceb5c6f45b, which I found through the LeetPlug project.
 * Modified to remove the styling, change default texts, remove pause toggle behavior, and operate on seconds rather than intervals.
 */

var startTimerButton = document.querySelector('.startTimer');
var pauseTimerButton = document.querySelector('.pauseTimer');
var timerDisplay = document.querySelector('.timer');
var startTime;
var updatedTime;
var difference;
var tInterval;
var savedTime;
var paused = 0;
var running = 0;
function startTimer() {
    if (!running) {
        startTime = new Date().getTime();
        tInterval = setInterval(getShowTime, 1000);
        paused = 0;
        running = 1;
        if (timerDisplay) timerDisplay.style.background = "#C7F1C7";
        if (startTimerButton) startTimerButton.style.cursor = "auto";
        if (pauseTimerButton) pauseTimerButton.style.cursor = "pointer";
    }
}
function pauseTimer() {
    if (!difference) {
        // if timer never started, don't allow pause button to do anything
    } else if (!paused) {
        clearInterval(tInterval);
        savedTime = difference;
        paused = 1;
        running = 0;
        if (timerDisplay) timerDisplay.style.background = "";
        if (startTimerButton) startTimerButton.style.cursor = "pointer";
        if (pauseTimerButton) pauseTimerButton.style.cursor = "auto";
    }
}
function resetTimer() {
    if (timerDisplay) {
        console.log("YALT: Time before clearing: " + timerDisplay.innerHTML);
        timerDisplay.innerHTML = '00:00:00';
        timerDisplay.style.background = "";
    }
    clearInterval(tInterval);
    savedTime = 0;
    difference = 0;
    paused = 0;
    running = 0;
    if (startTimerButton) startTimerButton.style.cursor = "pointer";
    if (pauseTimerButton) pauseTimerButton.style.cursor = "auto";
}
function getShowTime() {
    updatedTime = new Date().getTime();
    if (savedTime) {
        difference = (updatedTime - startTime) + savedTime;
    } else {
        difference = updatedTime - startTime;
    }
    // var days = Math.floor(difference / (1000 * 60 * 60 * 24));
    var hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((difference % (1000 * 60)) / 1000);
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    if (timerDisplay) timerDisplay.innerHTML = hours + ':' + minutes + ':' + seconds;
}