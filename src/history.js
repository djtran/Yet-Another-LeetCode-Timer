window.addEventListener("load", onLoadPage, false);

var historyData;
var aggData;
function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

// Great csv conversion function taken from this stack overflow post: https://stackoverflow.com/a/31536517
function jsonToCSV(content) {
    const items = content
    const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
    const header = Object.keys(items[0])
    const csv = [
        header.join(','), // header row first
        ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n')

    return csv;
}

//Dates are in ISO8601 extended format.
function convertDateToYMD(dateString) {
    if (dateString == null) {
        return new Date().toISOString().split('T')[0]
    } else {
        return dateString.split('T')[0];
    }
}

//Copying what is performed in the sample between timestampSec and timestampToMidnight:
//https://github.com/frappe/charts/blob/5a4857d6a86f885fdddc57601c36cd8ec1726095/src/js/utils/date-utils.js#L39-L41
const NO_OF_MILLIS = 1000;
const SEC_IN_DAY = 86400;
function dateAsTimestamp(dateInMilli, roundAhead = false) {
    let timestamp = dateInMilli/NO_OF_MILLIS;
	let midnightTs = Math.floor(timestamp - (timestamp % SEC_IN_DAY));
	if(roundAhead) {
		return midnightTs + SEC_IN_DAY;
	}
	return midnightTs;
}

function addExportButtonListeners() {
    document.querySelector(".data-export-json-btn").onclick = () => {
        let dateAsYMD = convertDateToYMD();
        download(JSON.stringify(historyData), "yet-another-lc-timer-data-" + dateAsYMD + ".json", 'application/json')
    };
    document.querySelector(".data-export-csv-btn").onclick = () => {
        let dateAsYMD = convertDateToYMD();
        download(jsonToCSV(historyData), "yet-another-lc-timer-data" + dateAsYMD + ".csv", 'text/csv')
    }
}

function create3BarTimeChart(chartClass, titleText, min, avg, max, colors = ['light-blue']) {

    let timeData = {
        labels: ["Fastest", "Average", "Slowest"],
        datasets: [{ values: [min, avg, max] }]
    };

    let timeChart = new frappe.Chart(chartClass, {
        title: titleText,
        data: timeData,
        type: "bar",
        tooltipOptions: {
            formatTooltipY: d => convertSecondsToTime(d)
        },
        colors: colors
    });
}

function createPercentageChart(chartClass, titleText, labels, values, colors = ['red', 'light-blue']) {

    let data = {
        labels: labels,
        datasets: [
            {
                values: values
            }
        ]
    }
    let percentageChart = new frappe.Chart(chartClass, {
        title: titleText,
        data: data,
        type: "percentage",
        colors: colors
    })
}

function createSubmissionsHeatMap(chartClass, datapoints) {
    let sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let data = {
        dataPoints: datapoints,
        start: sixMonthsAgo,
        end: tomorrow
    }
    let heatmap = new frappe.Chart(chartClass, {
        title: "Successful Submissions Over the Last 6 Months",
        data: data,
        type: 'heatmap'
    })
}

function onLoadPage(evt) {

    chrome.storage.local.get(['history'], function (data) {
        historyData = data.history;
        let table = document.querySelector(".history-data");
        historyData.forEach(element => {
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
            let dateText = document.createTextNode(convertDateToYMD(element["date"]));
            date.appendChild(dateText);

        });
        addExportButtonListeners();
    });

    chrome.storage.local.get(['aggregate'], function (data) {
        aggData = data.aggregate;

        let easyTimeAvg, easyTimeMax, easyTimeMin, medTimeAvg, medTimeMax, medTimeMin, hardTimeAvg, hardTimeMax, hardTimeMin;
        let easyDiff, medDiff, hardDiff, unkDiff;
        let easyAttempts, medAttempts, hardAttempts, unkAttempts;
        let successfulSubmissionsPerDay = {};
        easyTimeAvg = easyTimeMax = easyTimeMin = medTimeAvg = medTimeMax = medTimeMin = hardTimeAvg = hardTimeMax = hardTimeMin = -1;
        easyDiff = medDiff = hardDiff = unkDiff = easyAttempts = medAttempts = hardAttempts = unkAttempts = 0;
        aggData.forEach(element => {
            let diff = element["diff"]
            let errors = element["err"]
            let time = convertTimeToComparableValueInSeconds(element["time"])
            let date = Date.parse(element["date"]);

            //heatmap
            if (successfulSubmissionsPerDay[dateAsTimestamp(date)]) {
                successfulSubmissionsPerDay[dateAsTimestamp(date)] += 1;
            } else {
                successfulSubmissionsPerDay[dateAsTimestamp(date)] = 1;
            }

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

        //Aggregate
        if (aggData) {
            createPercentageChart(
                ".difficulty-aggregate-chart",
                "Difficulty of Completed Problems",
                ["Easy", "Medium", "Hard"],
                [easyDiff, medDiff, hardDiff],
                ['green', 'yellow', 'red']
            );

            createSubmissionsHeatMap(
                ".submissions-heatmap",
                successfulSubmissionsPerDay
            )
        }

        //Easy
        if (easyDiff > 0) {
            create3BarTimeChart(
                ".easy-time-chart",
                "Time Spent on Easy Problems",
                easyTimeMin,
                easyTimeAvg,
                easyTimeMax
            );


            createPercentageChart(
                ".easy-attempts-chart",
                "Easy Submissions Distribution",
                ["Errors", "Successful"],
                [easyAttempts - easyDiff, easyDiff]
            );
        }

        //Medium
        if (medDiff > 0) {
            create3BarTimeChart(
                ".medium-time-chart",
                "Time Spent on Medium Problems",
                medTimeMin,
                medTimeAvg,
                medTimeMax,
                ['orange']);

            createPercentageChart(
                ".medium-attempts-chart",
                "Medium Submissions Distribution",
                ["Errors", "Successful"],
                [medAttempts - medDiff, medDiff]
            );
        }

        //Hard
        if (hardDiff > 0) {
            create3BarTimeChart(
                ".hard-time-chart",
                "Time Spent on Hard Problems",
                hardTimeMin,
                hardTimeAvg,
                hardTimeMax,
                ['red']);

            createPercentageChart(
                ".hard-attempts-chart",
                "Hard Submissions Distribution",
                ["Errors", "Successful"],
                [hardAttempts - hardDiff, hardDiff]
            );
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

    return Math.trunc(hour).toFixed(0) + " hours, " + Math.trunc(min).toFixed(0) + " min, " + Math.trunc(sec).toFixed(0) + " sec";

}