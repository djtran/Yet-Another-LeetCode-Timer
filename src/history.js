console.log('History opened');
window.addEventListener("load", onLoadPage, false);


function onLoadPage (evt) {

    chrome.storage.local.get(['history'], function(data) {
        let history = data.history;
        console.log(JSON.stringify(history));
        let table = document.querySelector(".history-data");
        history.forEach(element => {
            let newRow = table.insertRow(-1);

            let prob = newRow.insertCell(0);
            let probLink = document.createElement('a');
            let probText = document.createTextNode(element["problem"]);
            probLink.appendChild(probText);
            probLink.title = element["problem"];
            probLink.href = element["url"]
            prob.appendChild(probLink);
            
            let diff = newRow.insertCell(1);
            let diffText = document.createTextNode(element["difficulty"]);
            diff.appendChild(diffText);

            let errors = newRow.insertCell(2);
            let errorsText = document.createTextNode(element["errors"]);
            errors.appendChild(errorsText);

            let time = newRow.insertCell(3);
            let timeText = document.createTextNode(element["time"]);
            time.appendChild(timeText);

            let date = newRow.insertCell(4);
            let dateText = document.createTextNode(element["date"]);
            date.appendChild(dateText);
            
        });
    });


    chrome.storage.sync.get(['aggregate'], function(data) {
        let agg = data.aggregate;

        let easyTimeAvg, easyTimeMax, easyTimeMin, medTimeAvg, medTimeMax, medTimeMin, hardTimeAvg, hardTimeMax, hardTimeMin;
        let easyDiff, medDiff, hardDiff, unkDiff;
        let easyAttempts, medAttempts, hardAttempts, unkAttempts;
        easyTimeAvg = easyTimeMax = easyTimeMin = medTimeAvg = medTimeMax = medTimeMin = hardTimeAvg = hardTimeMax = hardTimeMin = -1;
        easyDiff = medDiff = hardDiff = unkDiff = easyAttempts = medAttempts = hardAttempts = unkAttempts = 0;
        agg.forEach(element => {
            let diff = element["diff"]
            let errors = element["err"]
            let time = convertTimeToComparableValueInSeconds(element["time"])
            let date = element["date"] //to be used later for seeing growth/improvements.

            if (diff == 'Easy') {
                easyDiff++;
                easyAttempts += errors + 1;
                if (easyTimeAvg == -1) {
                    easyTimeAvg = time;
                    easyTimeMin = time;
                    easyTimeMax = time;
                } else {
                    easyTimeAvg += time;
                    easyTimeMin = Math.min(time, easyTimeMin);
                    easyTimeMax = Math.max(time, easyTimeMax);
                }

            } else if (diff == 'Medium') {
                medDiff++;
                medAttempts += errors + 1;
                if (medTimeAvg == -1) {
                    medTimeAvg = time;
                    medTimeMin = time;
                    medTimeMax = time;
                } else {
                    medTimeAvg += time;
                    medTimeMin = Math.min(time, medTimeMin);
                    medTimeMax = Math.max(time, medTimeMax);
                }

            } else if (diff == 'Hard') {
                hardDiff++;
                hardAttempts += errors + 1;
                if (hardTimeAvg == -1) {
                    hardTimeAvg = time;
                    hardTimeMin = time;
                    hardTimeMax = time;
                } else {
                    hardTimeAvg += time;
                    hardTimeMin = Math.min(time, hardTimeMin);
                    hardTimeMax = Math.max(time, hardTimeMax);
                }

            } else {
                unkDiff++;
                unkAttempts += errors + 1;
            }

        });

        easyTimeAvg = easyTimeAvg / easyDiff;
        medTimeAvg = medTimeAvg / medDiff;
        hardTimeAvg = hardTimeAvg / hardDiff;

        //Easy
        if (easyDiff > 0) {
            let nodeEasyTime = document.querySelector(".easyTime");
            nodeEasyTime.appendChild(document.createTextNode("Avg Easy Time: " + convertSecondsToTime(easyTimeAvg)));
            lineBreak(nodeEasyTime);
            nodeEasyTime.appendChild(document.createTextNode("Min Easy Time: " + convertSecondsToTime(easyTimeMin)));
            lineBreak(nodeEasyTime);
            nodeEasyTime.appendChild(document.createTextNode("Max Easy Time: " + convertSecondsToTime(easyTimeMax)));
    
            let nodeEasyDiff = document.querySelector(".easyDiff");
            nodeEasyDiff.appendChild(document.createTextNode("Easy Problems Completed: " + easyDiff));
    
            let nodeEasyAttempts = document.querySelector(".easyAttempts");
            nodeEasyAttempts.appendChild(document.createTextNode("Easy Total Submissions: " + easyAttempts));
            lineBreak(nodeEasyAttempts);
            nodeEasyAttempts.appendChild(document.createTextNode("Easy Avg Submissions: " + easyAttempts/easyDiff));
        }

        //Medium
        if (medDiff > 0) {

            let nodeMedTime = document.querySelector(".mediumTime");
            nodeMedTime.appendChild(document.createTextNode("Avg Medium Time: " + convertSecondsToTime(medTimeAvg)));
            lineBreak(nodeMedTime);
            nodeMedTime.appendChild(document.createTextNode("Min Medium Time: " + convertSecondsToTime(medTimeMin)));
            lineBreak(nodeMedTime);
            nodeMedTime.appendChild(document.createTextNode("Max Medium Time: " + convertSecondsToTime(medTimeMax)));
            
            let nodeMedDiff = document.querySelector(".mediumDiff");
            nodeMedDiff.appendChild(document.createTextNode("Medium Problems Completed: " + medDiff));
            
            let nodeMedAttempts = document.querySelector(".mediumAttempts");
            nodeMedAttempts.appendChild(document.createTextNode("Medium Total Submissions: " + medAttempts));
            lineBreak(nodeMedAttempts);
            nodeMedAttempts.appendChild(document.createTextNode("Medium Avg Submissions: " + medAttempts/medDiff));
        }

        //Hard
        if (hardDiff > 0) {

            let nodeHardTime = document.querySelector(".hardTime");
            nodeHardTime.appendChild(document.createTextNode("Avg hard Time: " + convertSecondsToTime(hardTimeAvg)));
            lineBreak(nodeHardTime);
            nodeHardTime.appendChild(document.createTextNode("Min hard Time: " + convertSecondsToTime(hardTimeMin)));
            lineBreak(nodeHardTime);
            nodeHardTime.appendChild(document.createTextNode("Max hard Time: " + convertSecondsToTime(hardTimeMax)));
            
            let nodeHardDiff = document.querySelector(".hardDiff");
            nodeHardDiff.appendChild(document.createTextNode("Hard Problems Completed: " + hardDiff));
            
            let nodeHardAttempts = document.querySelector(".hardAttempts");
            nodeHardAttempts.appendChild(document.createTextNode("Hard Total Submissions: " + hardAttempts));
            lineBreak(nodeHardAttempts);
            nodeHardAttempts.appendChild(document.createTextNode("Hard Avg Submissions: " + hardAttempts/hardDiff));
        }
    });

}

function lineBreak(node) {
    node.appendChild(document.createElement("br"));
}

function convertTimeToComparableValueInSeconds(time) {
    let chunks = time.split(':');
    let hour = parseInt(chunks[0]);
    let min = parseInt(chunks[1]);
    let sec = parseInt(chunks[2]);
    sec += min * 60 + hour * 3600;
    return sec;
}

function convertSecondsToTime(timeInSec) {
    let sec = timeInSec % 60;
    let min = (timeInSec / 60) % 60;
    let hour = timeInSec / 3600;

    return hour.toFixed(0) + " hours, " + min.toFixed(0) + " min, " + sec.toFixed(0) + " sec";

}