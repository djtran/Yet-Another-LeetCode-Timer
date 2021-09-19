console.log('Problem opened');
window.addEventListener("load", onLoadPage, false);

const DIFFICULTY = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    UNKNOWN: "Unknown"
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

// Main onLoadPage function, starts the cycles needed to discover the elements inside the page
// and to attach listeners to them
function onLoadPage (evt) {
    // insert the styles for the custom components
    // var styleSheet = document.createElement("style")
    // styleSheet.type = "text/css"
    // styleSheet.innerText = timerStyle
    // document.head.appendChild(styleSheet)

    // setInterval(checkForMutations, 500);
    console.log("Difficulty: " + getDifficulty());


}