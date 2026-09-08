window.addEventListener("load", onLoadPage, false);

var historyData;
var aggData;
/***
 * Main execution on history.html.
 */
 function onLoadPage(evt) {
    addImportButtonListeners();
    addExportButtonListeners();
    createAnalysis();
}

/***
 * Data Export
 */
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

/**
 * Data Import
 */

var importedJSON = null;
function handleFile(event) {
    var files = event.target.files;
    var file = files[0];
    console.log(file);
    var reader = new FileReader();
    reader.onload = function(evt) {
        importedJSON = JSON.parse(evt.target.result);
    }
    reader.readAsText(file);
}

function addData(data) {
    data.forEach(element => {
        let obj = {
            "diff": element["difficulty"],
            "err": element["errors"],
            "time": element["time"],
            "date": element["date"]
        }
        historyData.push(element);
        aggData.push(obj);
    })
    chrome.storage.local.set({'history': historyData});
    chrome.storage.local.set({'aggregate': aggData});

}

function clearAndAddData(data) {
    chrome.storage.local.clear();
    historyData = [];
    aggData = [];
    addData(data);
}

function addImportButtonListeners() {
    document.querySelector("#import-file-elem").onchange = handleFile;
    document.querySelector(".data-import-json-add-btn").onclick = () => {
        if (importedJSON != null) {
            addData(importedJSON);
            location.reload();
        } else {
            window.alert("No JSON data selected for import");
        }
    };
    document.querySelector(".data-import-json-overwrite-btn").onclick = () => {
        if (importedJSON != null) {
            let confirmation = window.confirm("Do you really want to overwrite all of your data?");
            if (confirmation) {
                clearAndAddData(importedJSON);
                location.reload();
            }
        } else {
            window.alert("No JSON data selected for import");
        }
    }
}

/***
 * Metrics and Charting.
 */
function create3BarTimeChart(chartClass, titleText, min, avg, max, colors = ['light-blue']) {
    try {
        const vals = sanitizeValues([min, avg, max]);
        let timeData = {
            labels: ["Fastest", "Average", "Slowest"],
            datasets: [{ values: vals }]
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
    } catch (e) {
        console.error("YALT: 3bar chart failed", chartClass, e);
    }
}

function createPercentageChart(chartClass, titleText, labels, values, colors = ['red', 'light-blue']) {
    try {
        let data = {
            labels: labels,
            datasets: [
                {
                    values: sanitizeValues(values)
                }
            ]
        }
        let percentageChart = new frappe.Chart(chartClass, {
            title: titleText,
            data: data,
            type: "percentage",
            colors: colors
        })
    } catch (e) {
        console.error("YALT: percentage chart failed", chartClass, e);
    }
}

function createSubmissionsHeatMap(chartClass, datapoints) {
    try {
        let sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        let today = new Date();
        let data = {
            dataPoints: datapoints,
            start: sixMonthsAgo,
            end: today
        }
        let heatmap = new frappe.Chart(chartClass, {
            title: "Successful Submissions Over the Last 6 Months",
            data: data,
            type: 'heatmap'
        })
    } catch (e) {
        console.error("YALT: heatmap failed", chartClass, e);
    }
}

function sanitizeValues(values) {
    return values.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
}

function createLineChart(chartClass, titleText, labels, datasets, colors) {
    try {
        // Sanitize datasets
        const cleanDatasets = datasets.map(ds => ({
            name: ds.name,
            values: sanitizeValues(ds.values)
        }));
        let data = {
            labels: labels,
            datasets: cleanDatasets
        };
        let chart = new frappe.Chart(chartClass, {
            title: titleText,
            data: data,
            type: "line",
            height: 250,
            colors: colors
        });
    } catch (e) {
        console.error("YALT: line chart failed", chartClass, e);
    }
}

function createBarChart(chartClass, titleText, labels, values, colors = ['blue']) {
    try {
        let data = {
            labels: labels,
            datasets: [{ values: sanitizeValues(values) }]
        };
        let chart = new frappe.Chart(chartClass, {
            title: titleText,
            data: data,
            type: "bar",
            height: 250,
            colors: colors
        });
    } catch (e) {
        console.error("YALT: bar chart failed", chartClass, e);
    }
}

// --- Last N vs Overall helpers ---

function computeStatsForEntries(entries) {
    if (!entries || entries.length === 0) {
        return {
            count: 0,
            avgTimeSec: 0,
            avgTimeStr: "00:00:00",
            totalErrors: 0,
            errorRate: 0
        };
    }
    let totalTimeSec = 0;
    let totalErrors = 0;
    entries.forEach(e => {
        totalTimeSec += convertTimeToComparableValueInSeconds(e.time);
        totalErrors += e.err;
    });
    const count = entries.length;
    const avgTimeSec = totalTimeSec / count;
    const totalAttempts = totalErrors + count;
    const errorRate = totalAttempts > 0 ? (totalErrors / totalAttempts * 100) : 0;
    return {
        count: count,
        avgTimeSec: avgTimeSec,
        avgTimeStr: convertSecondsToTime(Math.round(avgTimeSec)),
        totalErrors: totalErrors,
        errorRate: errorRate
    };
}

function getPerDifficultyStats(entries) {
    const diffs = ['Easy', 'Medium', 'Hard'];
    const result = {};
    diffs.forEach(diff => {
        const filtered = entries.filter(e => e.diff === diff);
        result[diff] = computeStatsForEntries(filtered);
    });
    return result;
}

function computeOverallStats(aggData) {
    if (!aggData || aggData.length === 0) return null;
    const overall = computeStatsForEntries(aggData);
    const perDiff = getPerDifficultyStats(aggData);
    let easy = 0, medium = 0, hard = 0;
    aggData.forEach(e => {
        if (e.diff === 'Easy') easy++;
        else if (e.diff === 'Medium') medium++;
        else if (e.diff === 'Hard') hard++;
    });
    return {
        ...overall,
        count: aggData.length,
        easy: easy,
        medium: medium,
        hard: hard,
        perDiff: perDiff
    };
}

function computeLastNStats(aggData, n, historyData) {
    if (!aggData || aggData.length === 0) return null;
    const sorted = [...aggData].sort((a,b) => new Date(b.date) - new Date(a.date));
    const lastN = sorted.slice(0, n);
    if (lastN.length === 0) return null;

    const overallForLastN = computeStatsForEntries(lastN);
    const perDiff = getPerDifficultyStats(lastN);

    let easy = 0, medium = 0, hard = 0;
    lastN.forEach(e => {
        if (e.diff === 'Easy') easy++;
        else if (e.diff === 'Medium') medium++;
        else if (e.diff === 'Hard') hard++;
    });

    let historySorted = [];
    if (historyData) {
        historySorted = [...historyData].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, n);
    }

    return {
        ...overallForLastN,
        count: lastN.length,
        easy: easy,
        medium: medium,
        hard: hard,
        perDiff: perDiff,
        entries: lastN,
        historyEntries: historySorted
    };
}

function formatChangeVsOverall(current, overall, isLowerBetter = false) {
    if (overall === 0 || overall === null || overall === undefined) {
        return { text: "No overall data", cls: "neutral" };
    }
    const diff = current - overall;
    const pct = (diff / overall) * 100;
    const absPct = Math.abs(pct).toFixed(1);
    let cls = "neutral";
    let arrow = "→";
    if (diff > 0.01) {
        arrow = "↑";
        cls = isLowerBetter ? "negative" : "positive";
    } else if (diff < -0.01) {
        arrow = "↓";
        cls = isLowerBetter ? "positive" : "negative";
    }
    const sign = diff > 0 ? "+" : "";
    // For time, show formatted diff
    return {
        text: `${arrow} ${sign}${diff.toFixed(1)} (${sign}${absPct}%) vs overall`,
        cls: cls,
        pct: pct,
        diff: diff
    };
}

function updateLastNCard(selector, lastNText, overallText, changeObj) {
    const card = document.querySelector(selector);
    if (!card) return;
    const lastNEl = card.querySelector('.last-n-metric');
    const overallEl = card.querySelector('.overall-metric');
    const changeEl = card.querySelector('.wow-change');
    if (lastNEl) lastNEl.textContent = lastNText;
    if (overallEl) overallEl.textContent = overallText;
    if (changeEl) {
        changeEl.textContent = changeObj.text;
        changeEl.className = "wow-change " + changeObj.cls;
    }
}

function populateLastNTable(historyEntries) {
    const tbody = document.querySelector(".last-n-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!historyEntries || historyEntries.length === 0) return;
    historyEntries.forEach(element => {
        const row = tbody.insertRow(-1);
        const probCell = row.insertCell(0);
        const link = document.createElement('a');
        // Shorten problem name: remove leading number if present, keep concise
        let probName = element["problem"];
        // Keep as is but allow CSS ellipsis
        link.textContent = probName;
        link.href = element["url"];
        link.title = probName;
        link.style.fontSize = "0.78rem";
        link.style.textDecoration = "none";
        probCell.appendChild(link);

        // Difficulty as color-coded dot icon
        const diff = element["difficulty"];
        const diffCell = row.insertCell(1);
        diffCell.style.textAlign = "center";
        const icon = document.createElement('span');
        let diffCls = "diff-hard";
        if (diff === "Easy") diffCls = "diff-easy";
        else if (diff === "Medium") diffCls = "diff-medium";
        icon.className = "diff-icon " + diffCls;
        icon.title = diff;
        diffCell.appendChild(icon);

        const timeCell = row.insertCell(2);
        timeCell.textContent = element["time"];
        timeCell.style.fontFamily = "monospace";
        timeCell.style.fontSize = "0.75rem";

        const errCell = row.insertCell(3);
        errCell.textContent = element["errors"];
        errCell.style.textAlign = "center";
        // Color errors: 0=greenish, 1-2=orange, 3+=red
        if (element["errors"] === 0) errCell.style.color = "#2e7d32";
        else if (element["errors"] <= 2) errCell.style.color = "#ef6c00";
        else errCell.style.color = "#c62828";
    });
}

function createLastNAnalysis(aggData, historyData, n) {
    try {
    const t0 = performance.now();
    if (!aggData || aggData.length === 0) {
        console.log("YALT: no aggregate data for last N analysis");
        return;
    }
    n = Math.max(1, Math.min(n, aggData.length));
    const overall = computeOverallStats(aggData);
    const lastN = computeLastNStats(aggData, n, historyData);
    if (!overall || !lastN) return;

    // Update counts display
    document.querySelectorAll('.last-n-value').forEach(el => el.textContent = n);
    const totalEl = document.querySelector('.total-count');
    if (totalEl) totalEl.textContent = overall.count;

    // Cards
    const timeChange = formatChangeVsOverall(lastN.avgTimeSec, overall.avgTimeSec, true);
    updateLastNCard(".last-n-avg-time-card", lastN.avgTimeStr, overall.avgTimeStr, timeChange);

    const errChange = formatChangeVsOverall(lastN.errorRate, overall.errorRate, true);
    updateLastNCard(".last-n-error-rate-card", `${lastN.errorRate.toFixed(1)}%`, `${overall.errorRate.toFixed(1)}%`, errChange);

    updateLastNCard(".last-n-count-card", `${lastN.count}`, `${overall.count}`, {text: `${((lastN.count/overall.count)*100).toFixed(1)}% of total`, cls: "neutral"});

    // Clear previous per-difficulty charts
    document.querySelectorAll('.last-n-easy-time-chart, .last-n-medium-time-chart, .last-n-hard-time-chart, .last-n-easy-error-chart, .last-n-medium-error-chart, .last-n-hard-error-chart').forEach(el => el.innerHTML = '');

    // Charts: 2 rows of 3 - per difficulty Time (row1) and Error (row2)
    const diffs = ['Easy', 'Medium', 'Hard'];
    const diffColors = { 'Easy': '#4caf50', 'Medium': '#ff9800', 'Hard': '#f44336' };
    const tasks = [];

    // Row 1: Avg Time per difficulty
    diffs.forEach(diff => {
        tasks.push(() => {
            try {
                const lastVal = lastN.perDiff[diff]?.count > 0 ? Math.round(lastN.perDiff[diff].avgTimeSec/60*10)/10 : 0;
                const overallVal = overall.perDiff[diff]?.count > 0 ? Math.round(overall.perDiff[diff].avgTimeSec/60*10)/10 : 0;
                // Skip if no data for this difficulty in both overall and lastN
                if (lastVal === 0 && overallVal === 0) return;
                const data = {
                    labels: ["Last "+n, "Overall"],
                    datasets: [{ values: sanitizeValues([lastVal, overallVal]) }]
                };
                new frappe.Chart(`.last-n-${diff.toLowerCase()}-time-chart`, {
                    title: `${diff} Avg Time (min)`,
                    data: data,
                    type: "bar",
                    height: 200,
                    colors: [diffColors[diff], '#9e9e9e']
                });
            } catch (e) { console.error(`YALT: ${diff} time chart failed`, e); }
        });
    });

    // Row 2: Error Rate per difficulty
    diffs.forEach(diff => {
        tasks.push(() => {
            try {
                const lastVal = lastN.perDiff[diff] ? Math.round(lastN.perDiff[diff].errorRate*10)/10 : 0;
                const overallVal = overall.perDiff[diff] ? Math.round(overall.perDiff[diff].errorRate*10)/10 : 0;
                if (lastVal === 0 && overallVal === 0) return;
                const data = {
                    labels: ["Last "+n, "Overall"],
                    datasets: [{ values: sanitizeValues([lastVal, overallVal]) }]
                };
                new frappe.Chart(`.last-n-${diff.toLowerCase()}-error-chart`, {
                    title: `${diff} Error Rate (%)`,
                    data: data,
                    type: "bar",
                    height: 200,
                    colors: [diffColors[diff], '#9e9e9e']
                });
            } catch (e) { console.error(`YALT: ${diff} error chart failed`, e); }
        });
    });

    let i = 0;
    function next() {
        if (i >= tasks.length) {
            console.log(`YALT: lastN charts rendered in ${(performance.now()-t0).toFixed(1)}ms`);
            return;
        }
        try { tasks[i](); } catch(e) { console.error("YALT: chart task failed", i, e); }
        i++;
        requestAnimationFrame(next);
    }
    requestAnimationFrame(next);

    populateLastNTable(lastN.historyEntries);
    } catch (e) {
        console.error("YALT: lastN analysis failed", e);
    }
}

/***
 * 
 */
function createAnalysis() {

    chrome.storage.local.get(['history'], function (data) {
        historyData = data.history || [];
        let table = document.querySelector(".history-data");
        if (!table) return;
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
    });

    chrome.storage.local.get(['aggregate'], function (data) {
        aggData = data.aggregate || [];

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

        // Last N vs Overall analysis - defer to avoid blocking
        setTimeout(() => {
            try {
                // Use historyData if available, else fetch
                const nInput = document.getElementById('last-n-input');
                let n = 5;
                if (nInput) {
                    n = parseInt(nInput.value, 10) || 5;
                    // Update max based on total count
                    nInput.max = aggData.length;
                }
                createLastNAnalysis(aggData, historyData, n);

                // Attach listeners for N adjustment
                if (nInput && !nInput.dataset.yaltBound) {
                    nInput.dataset.yaltBound = "true";
                    const updateBtn = document.querySelector('.last-n-update-btn');
                    const doUpdate = () => {
                        let newN = parseInt(nInput.value, 10) || 5;
                        newN = Math.max(1, Math.min(newN, aggData.length));
                        nInput.value = newN;
                        createLastNAnalysis(aggData, historyData, newN);
                    };
                    if (updateBtn) updateBtn.addEventListener('click', doUpdate);
                    nInput.addEventListener('change', doUpdate);
                    nInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') doUpdate(); });
                }
            } catch (e) {
                console.error("YALT: lastN analysis deferred failed", e);
            }
        }, 100);
    });
}

/***
 * Convenience methods.
 */

function lineBreak(node) {
    node.appendChild(document.createElement("br"));
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