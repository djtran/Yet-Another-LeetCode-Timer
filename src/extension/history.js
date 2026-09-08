// Both page scripts are deferred, so the DOM is already parsed when this fires.
// "load" would additionally wait on every image before anything got drawn.
document.addEventListener("DOMContentLoaded", onLoadPage, false);

const YALT_PAGE_START = performance.now();

var historyData;
var aggData;

// Tab name -> renderer. Filled in once storage has been read. Each tab is
// rendered at most once, the first time it is actually shown, so opening the
// page only pays for the charts you can see.
var tabRenderers = {};
var renderedTabs = {};

function yaltTiming(label, startedAt) {
    console.log("YALT: " + label + " " + (performance.now() - startedAt).toFixed(1) + "ms");
}

/***
 * Main execution on history.html.
 */
 function onLoadPage(evt) {
    initTabs();
    addImportButtonListeners();
    addExportButtonListeners();
    createAnalysis();
}

/***
 * Tabs.
 * The tab is mirrored into location.hash so a reload (e.g. after an import)
 * drops you back where you were.
 */
function initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    if (buttons.length === 0) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => selectTab(btn.dataset.tab));
    });

    const fromHash = (location.hash || "").replace('#', '');
    if (fromHash && document.getElementById('tab-' + fromHash)) {
        selectTab(fromHash);
    }
}

function selectTab(tabName) {
    const panel = document.getElementById('tab-' + tabName);
    if (!panel) return;

    document.querySelectorAll('.tab-panel').forEach(el => {
        const active = el === panel;
        el.hidden = !active;
        el.classList.toggle('active', active);
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabName;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    history.replaceState(null, "", '#' + tabName);

    // The panel is on screen now, so its containers finally have a real width.
    // Charts built while it was hidden would size themselves to 0.
    renderActiveTab();
}

function activeTabName() {
    const active = document.querySelector('.tab-btn.active');
    return active ? active.dataset.tab : 'statistics';
}

/***
 * Render the visible tab, once. Called on load and on every tab switch;
 * a no-op if storage hasn't been read yet or the tab is already drawn.
 */
function renderActiveTab() {
    const name = activeTabName();
    const renderer = tabRenderers[name];
    if (!renderer || renderedTabs[name]) return;

    renderedTabs[name] = true;
    const t0 = performance.now();
    try {
        renderer();
        yaltTiming("rendered '" + name + "' tab in", t0);
    } catch (e) {
        renderedTabs[name] = false;
        console.error("YALT: rendering '" + name + "' tab failed", e);
    }
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

/***
 * frappe sizes a chart from its container's offsetWidth. A hidden or
 * not-yet-laid-out container reports 0, and frappe then writes negative
 * <rect> widths - Chrome rejects those attributes, so you get a console full
 * of "A negative value is not valid" and an invisible chart that still has
 * working tooltips. Refuse to draw until the container is actually on screen.
 */
function chartTarget(chartClass) {
    const el = typeof chartClass === 'string' ? document.querySelector(chartClass) : chartClass;
    if (!el) return null;
    // Mirror frappe's own measurement (clientWidth minus horizontal padding) so
    // we skip exactly the cases where it would produce negative geometry.
    const style = window.getComputedStyle(el);
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    if (!(el.clientWidth - padding > 0)) {
        console.warn("YALT: skipping chart, container has no width yet", chartClass);
        return null;
    }
    return el;
}

function create3BarTimeChart(chartClass, titleText, min, avg, max, colors = ['light-blue']) {
    try {
        const target = chartTarget(chartClass);
        if (!target) return;
        const vals = sanitizeValues([min, avg, max]);
        let timeData = {
            labels: ["Fastest", "Average", "Slowest"],
            datasets: [{ values: vals }]
        };

        let timeChart = new frappe.Chart(target, {
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
        const target = chartTarget(chartClass);
        if (!target) return;
        const clean = sanitizeValues(values);
        // A percentage chart divides by the total; an all-zero dataset yields
        // width="NaN" on every bar.
        if (clean.reduce((sum, v) => sum + v, 0) <= 0) return;
        let data = {
            labels: labels,
            datasets: [
                {
                    values: clean
                }
            ]
        }
        let percentageChart = new frappe.Chart(target, {
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
        const target = chartTarget(chartClass);
        if (!target) return;
        let sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        let today = new Date();
        let data = {
            dataPoints: datapoints,
            start: sixMonthsAgo,
            end: today
        }
        let heatmap = new frappe.Chart(target, {
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
        const target = chartTarget(chartClass);
        if (!target) return;
        // Sanitize datasets
        const cleanDatasets = datasets.map(ds => ({
            name: ds.name,
            values: sanitizeValues(ds.values)
        }));
        let data = {
            labels: labels,
            datasets: cleanDatasets
        };
        let chart = new frappe.Chart(target, {
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
        const target = chartTarget(chartClass);
        if (!target) return;
        let data = {
            labels: labels,
            datasets: [{ values: sanitizeValues(values) }]
        };
        let chart = new frappe.Chart(target, {
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

// Small "Last N vs Overall" bar used throughout the Recent Performance grid.
function createComparisonBarChart(chartClass, titleText, n, values, color) {
    try {
        const target = chartTarget(chartClass);
        if (!target) return;
        new frappe.Chart(target, {
            title: titleText,
            data: {
                labels: ["Last " + n, "Overall"],
                datasets: [{ values: sanitizeValues(values) }]
            },
            type: "bar",
            height: 200,
            colors: [color, '#9e9e9e']
        });
    } catch (e) {
        console.error("YALT: comparison chart failed", chartClass, e);
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

    // Row 1: Avg Time per difficulty
    diffs.forEach(diff => {
        const lastVal = lastN.perDiff[diff]?.count > 0 ? Math.round(lastN.perDiff[diff].avgTimeSec/60*10)/10 : 0;
        const overallVal = overall.perDiff[diff]?.count > 0 ? Math.round(overall.perDiff[diff].avgTimeSec/60*10)/10 : 0;
        // Skip if no data for this difficulty in both overall and lastN
        if (lastVal === 0 && overallVal === 0) return;
        createComparisonBarChart(
            `.last-n-${diff.toLowerCase()}-time-chart`,
            `${diff} Avg Time (min)`,
            n, [lastVal, overallVal], diffColors[diff]
        );
    });

    // Row 2: Error Rate per difficulty
    diffs.forEach(diff => {
        const lastVal = lastN.perDiff[diff] ? Math.round(lastN.perDiff[diff].errorRate*10)/10 : 0;
        const overallVal = overall.perDiff[diff] ? Math.round(overall.perDiff[diff].errorRate*10)/10 : 0;
        if (lastVal === 0 && overallVal === 0) return;
        createComparisonBarChart(
            `.last-n-${diff.toLowerCase()}-error-chart`,
            `${diff} Error Rate (%)`,
            n, [lastVal, overallVal], diffColors[diff]
        );
    });

    populateLastNTable(lastN.historyEntries);
    yaltTiming("lastN section rendered in", t0);
    } catch (e) {
        console.error("YALT: lastN analysis failed", e);
    }
}

/***
 * Reads storage once, then draws only what is on screen. Each tab renders the
 * first time it is opened rather than everything rendering up front - charts
 * built inside a hidden panel size themselves to a zero-width container.
 */
function createAnalysis() {
    const t0 = performance.now();

    chrome.storage.local.get(['history', 'aggregate'], function (data) {
        historyData = data.history || [];
        aggData = data.aggregate || [];
        yaltTiming("read " + historyData.length + " problems from storage in", t0);

        tabRenderers = {
            statistics: renderStatisticsTab,
            history: renderHistoryTab,
            suggestions: renderSuggestionsTab
        };

        // The heatmap sits in the page header, outside the tab panels, so it is
        // always visible and is not owned by any one tab.
        renderHeatmap();
        renderActiveTab();
    });
}

function renderHeatmap() {
    let perDay = {};
    aggData.forEach(element => {
        let parsed = Date.parse(element["date"]);
        if (isNaN(parsed)) return;
        let key = dateAsTimestamp(parsed);
        perDay[key] = (perDay[key] || 0) + 1;
    });
    createSubmissionsHeatMap(".submissions-heatmap", perDay);
}

/***
 * Statistics tab: per-difficulty time/attempt charts plus Recent Performance.
 */
function renderStatisticsTab() {
    let easyTimeAvg, easyTimeMax, easyTimeMin, medTimeAvg, medTimeMax, medTimeMin, hardTimeAvg, hardTimeMax, hardTimeMin;
    let easyDiff, medDiff, hardDiff, unkDiff;
    let easyAttempts, medAttempts, hardAttempts, unkAttempts;
    easyTimeAvg = easyTimeMax = easyTimeMin = medTimeAvg = medTimeMax = medTimeMin = hardTimeAvg = hardTimeMax = hardTimeMin = -1;
    easyDiff = medDiff = hardDiff = unkDiff = easyAttempts = medAttempts = hardAttempts = unkAttempts = 0;

    aggData.forEach(element => {
        let diff = element["diff"]
        let errors = element["err"]
        let time = convertTimeToComparableValueInSeconds(element["time"])

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
    if (aggData.length > 0) {
        createPercentageChart(
            ".difficulty-aggregate-chart",
            "Difficulty of Completed Problems",
            ["Easy", "Medium", "Hard"],
            [easyDiff, medDiff, hardDiff],
            ['green', 'yellow', 'red']
        );
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

    renderRecentPerformance();
}

function renderRecentPerformance() {
    const nInput = document.getElementById('last-n-input');
    let n = 5;
    if (nInput) {
        n = parseInt(nInput.value, 10) || 5;
        nInput.max = aggData.length;
    }
    createLastNAnalysis(aggData, historyData, n);

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
}

/***
 * History tab: the full problem table. Built into a fragment so a large
 * history costs one reflow instead of one per row.
 */
function renderHistoryTab() {
    let table = document.querySelector(".history-data");
    if (!table) return;

    let fragment = document.createDocumentFragment();
    historyData.forEach(element => {
        let newRow = document.createElement('tr');

        let prob = newRow.insertCell(0);
        let probLink = document.createElement('a');
        probLink.textContent = element["problem"];
        probLink.title = element["problem"];
        probLink.href = element["url"];
        prob.appendChild(probLink);

        newRow.insertCell(1).textContent = element["difficulty"];
        newRow.insertCell(2).textContent = element["errors"];
        newRow.insertCell(3).textContent = element["time"];
        newRow.insertCell(4).textContent = convertDateToYMD(element["date"]);

        fragment.appendChild(newRow);
    });

    table.innerHTML = "";
    table.appendChild(fragment);
}

function renderSuggestionsTab() {
    initSuggestions(historyData);
}

/***
 * Suggestions: review queue + curated practice sets.
 */

const MS_IN_DAY = 86400000;
// Beyond this many days since the last attempt, staleness stops adding to the score.
const REVIEW_STALE_CAP_DAYS = 180;
// How much slower than your own average for that difficulty counts as "maxed out" slowness.
const REVIEW_SLOW_CEILING = 1.5;

var reviewRecords = [];
var reviewBaselines = {};
var solvedIndex = { bySlug: {}, byTitle: {} };

function initSuggestions(historyData) {
    try {
        reviewRecords = buildProblemRecords(historyData || []);
        reviewBaselines = computeDifficultyBaselines(reviewRecords);
        solvedIndex = buildSolvedIndex(reviewRecords);

        bindReviewControls();
        renderReviewQueue();

        bindPracticeSetControls();
        renderPracticeSet();
    } catch (e) {
        console.error("YALT: suggestions init failed", e);
    }
}

function slugFromUrl(url) {
    if (!url) return null;
    let match = String(url).match(/\/problems\/([^/?#]+)/);
    return match ? match[1].toLowerCase() : null;
}

// "1. Two Sum" -> "two sum". Used as a fallback key when a record has no usable URL.
function normalizeProblemTitle(name) {
    return String(name || "")
        .replace(/^\s*\d+\.\s*/, "")
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .toLowerCase();
}

function safeTimeInSeconds(time) {
    if (typeof time !== 'string' || time.indexOf(':') === -1) return 0;
    let sec = convertTimeToComparableValueInSeconds(time);
    return isFinite(sec) ? sec : 0;
}

/***
 * Collapse history entries down to one record per problem. A problem solved
 * more than once accumulates its solves, errors and times so the pass rate
 * reflects every attempt we ever recorded for it.
 */
function buildProblemRecords(historyData) {
    let byKey = {};
    historyData.forEach(entry => {
        let slug = slugFromUrl(entry["url"]);
        let titleKey = normalizeProblemTitle(entry["problem"]);
        let key = slug || titleKey;
        if (!key) return;

        let rec = byKey[key];
        if (!rec) {
            rec = byKey[key] = {
                key: key,
                slug: slug,
                titleKey: titleKey,
                problem: entry["problem"],
                url: entry["url"],
                difficulty: entry["difficulty"],
                solves: 0,
                errors: 0,
                totalTimeSec: 0,
                lastDate: null
            };
        }

        let errors = parseInt(entry["errors"], 10);
        rec.solves += 1;
        rec.errors += isFinite(errors) ? errors : 0;
        rec.totalTimeSec += safeTimeInSeconds(entry["time"]);

        let date = new Date(entry["date"]);
        if (!isNaN(date.getTime()) && (rec.lastDate === null || date > rec.lastDate)) {
            // Most recent solve wins for the display fields - names and URLs drift.
            rec.lastDate = date;
            rec.problem = entry["problem"];
            rec.url = entry["url"];
            rec.difficulty = entry["difficulty"];
        }
    });

    return Object.keys(byKey).map(k => {
        let rec = byKey[k];
        rec.avgTimeSec = rec.totalTimeSec / rec.solves;
        rec.attempts = rec.solves + rec.errors;
        rec.passRate = rec.attempts > 0 ? rec.solves / rec.attempts : 1;
        return rec;
    });
}

// Your own average solve time per difficulty, so "slow" is relative to you, not
// to some absolute number. Averaged per problem so a heavily repeated problem
// does not skew the baseline.
function computeDifficultyBaselines(records) {
    let sums = {};
    let counts = {};
    records.forEach(rec => {
        let diff = rec.difficulty || "Unknown";
        sums[diff] = (sums[diff] || 0) + rec.avgTimeSec;
        counts[diff] = (counts[diff] || 0) + 1;
    });
    let baselines = {};
    Object.keys(sums).forEach(diff => {
        baselines[diff] = counts[diff] > 0 ? sums[diff] / counts[diff] : 0;
    });
    return baselines;
}

function buildSolvedIndex(records) {
    let bySlug = {};
    let byTitle = {};
    records.forEach(rec => {
        if (rec.slug) bySlug[rec.slug] = rec;
        if (rec.titleKey) byTitle[rec.titleKey] = rec;
    });
    return { bySlug: bySlug, byTitle: byTitle };
}

function clamp01(value) {
    if (!isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

/***
 * Rank stale problems by how much trouble they gave you.
 * 45% pass rate, 35% time vs your own difficulty average, 20% how stale it is.
 */
function computeReviewCandidates(minDays) {
    let now = Date.now();
    let staleSpan = Math.max(REVIEW_STALE_CAP_DAYS - minDays, 1);

    return reviewRecords
        .filter(rec => rec.lastDate !== null)
        .map(rec => {
            let days = (now - rec.lastDate.getTime()) / MS_IN_DAY;
            let baseline = reviewBaselines[rec.difficulty] || 0;
            let timeRatio = baseline > 0 ? rec.avgTimeSec / baseline : 1;

            let failWeight = 1 - rec.passRate;
            let slowWeight = clamp01((timeRatio - 1) / (REVIEW_SLOW_CEILING - 1));
            let staleWeight = clamp01((days - minDays) / staleSpan);

            return Object.assign({}, rec, {
                days: days,
                timeRatio: timeRatio,
                score: Math.round(100 * (0.45 * failWeight + 0.35 * slowWeight + 0.20 * staleWeight))
            });
        })
        .filter(rec => rec.days >= minDays);
}

function sortReviewCandidates(candidates, mode) {
    let sorted = candidates.slice();
    if (mode === 'passRate') {
        sorted.sort((a, b) => (a.passRate - b.passRate) || (b.score - a.score));
    } else if (mode === 'time') {
        sorted.sort((a, b) => (b.avgTimeSec - a.avgTimeSec) || (b.score - a.score));
    } else if (mode === 'stale') {
        sorted.sort((a, b) => (b.days - a.days) || (b.score - a.score));
    } else {
        sorted.sort((a, b) => (b.score - a.score) || (a.passRate - b.passRate));
    }
    return sorted;
}

function buildReviewReasons(rec) {
    let reasons = [];

    if (rec.errors > 0) {
        let cls = rec.passRate <= 0.5 ? "bad" : "warn";
        let label = rec.errors + (rec.errors === 1 ? " wrong submission" : " wrong submissions");
        if (rec.solves > 1) label += " over " + rec.solves + " solves";
        reasons.push({ text: label, cls: cls });
    }

    if (rec.timeRatio >= 1.15) {
        let cls = rec.timeRatio >= REVIEW_SLOW_CEILING ? "bad" : "warn";
        reasons.push({
            text: rec.timeRatio.toFixed(1) + "x your " + (rec.difficulty || "overall") + " average",
            cls: cls
        });
    }

    if (rec.days >= 90) {
        reasons.push({ text: "cold for " + Math.round(rec.days / 30) + " months", cls: "" });
    }

    if (reasons.length === 0) {
        reasons.push({ text: "clean solve, just due for a refresh", cls: "" });
    }
    return reasons;
}

function severityClass(score) {
    if (score >= 50) return "sev-high";
    if (score >= 25) return "sev-med";
    return "sev-low";
}

function formatDurationShort(totalSeconds) {
    let sec = Math.round(totalSeconds);
    let hours = Math.floor(sec / 3600);
    let mins = Math.floor((sec % 3600) / 60);
    let secs = sec % 60;
    let pad = n => String(n).padStart(2, '0');
    return hours > 0 ? hours + ":" + pad(mins) + ":" + pad(secs) : pad(mins) + ":" + pad(secs);
}

function formatDaysAgo(days) {
    let d = Math.floor(days);
    if (d < 1) return "today";
    if (d < 30) return d + "d ago";
    if (d < 365) return Math.round(d / 30) + "mo ago";
    return (d / 365).toFixed(1) + "y ago";
}

function readReviewControls() {
    let minDaysEl = document.getElementById('review-min-days');
    let limitEl = document.getElementById('review-limit');
    let sortEl = document.getElementById('review-sort');
    return {
        minDays: Math.max(1, parseInt(minDaysEl && minDaysEl.value, 10) || 14),
        limit: Math.max(1, parseInt(limitEl && limitEl.value, 10) || 10),
        sort: (sortEl && sortEl.value) || 'score'
    };
}

function bindReviewControls() {
    ['review-min-days', 'review-limit', 'review-sort'].forEach(id => {
        let el = document.getElementById(id);
        if (!el || el.dataset.yaltBound) return;
        el.dataset.yaltBound = "true";
        el.addEventListener('change', renderReviewQueue);
        el.addEventListener('keyup', e => { if (e.key === 'Enter') renderReviewQueue(); });
    });
}

function renderReviewQueue() {
    let tbody = document.querySelector('.review-table-body');
    let wrapper = document.querySelector('.review-table-wrapper');
    let empty = document.querySelector('.review-empty');
    if (!tbody || !wrapper || !empty) return;

    let opts = readReviewControls();
    let candidates = sortReviewCandidates(computeReviewCandidates(opts.minDays), opts.sort)
        .slice(0, opts.limit);

    tbody.innerHTML = "";

    if (candidates.length === 0) {
        wrapper.hidden = true;
        empty.hidden = false;
        empty.textContent = reviewRecords.length === 0
            ? "No solves recorded yet. Solve a problem with the timer running and it will show up here."
            : "Nothing has gone " + opts.minDays + "+ days without an attempt. Lower the threshold to see more.";
        return;
    }

    wrapper.hidden = false;
    empty.hidden = true;

    candidates.forEach(rec => {
        let row = tbody.insertRow(-1);

        let scoreCell = row.insertCell(0);
        let badge = document.createElement('span');
        badge.className = "review-score " + severityClass(rec.score);
        badge.textContent = rec.score;
        badge.title = "Review priority (pass rate, solve time, staleness)";
        scoreCell.appendChild(badge);

        let probCell = row.insertCell(1);
        let link = document.createElement('a');
        link.className = "review-problem";
        link.textContent = rec.problem;
        link.title = rec.problem;
        link.href = rec.url || ("https://leetcode.com/problems/" + rec.slug + "/");
        probCell.appendChild(link);

        let diffCell = row.insertCell(2);
        diffCell.style.textAlign = "center";
        let icon = document.createElement('span');
        let diffCls = "diff-hard";
        if (rec.difficulty === "Easy") diffCls = "diff-easy";
        else if (rec.difficulty === "Medium") diffCls = "diff-medium";
        icon.className = "diff-icon " + diffCls;
        icon.title = rec.difficulty || "Unknown";
        diffCell.appendChild(icon);

        let passCell = row.insertCell(3);
        passCell.className = "review-mono";
        passCell.textContent = Math.round(rec.passRate * 100) + "%";
        passCell.title = rec.solves + " of " + rec.attempts + " submissions accepted";
        if (rec.passRate <= 0.5) passCell.style.color = "#c62828";
        else if (rec.passRate < 1) passCell.style.color = "#ef6c00";
        else passCell.style.color = "#2e7d32";

        let timeCell = row.insertCell(4);
        timeCell.className = "review-mono";
        timeCell.textContent = formatDurationShort(rec.avgTimeSec);
        timeCell.title = rec.solves > 1 ? "Average over " + rec.solves + " solves" : "Solve time";

        let dateCell = row.insertCell(5);
        dateCell.className = "review-mono";
        dateCell.textContent = formatDaysAgo(rec.days);
        dateCell.title = rec.lastDate.toISOString().split('T')[0];

        let whyCell = row.insertCell(6);
        let reasons = document.createElement('div');
        reasons.className = "review-reasons";
        buildReviewReasons(rec).forEach(reason => {
            let chip = document.createElement('span');
            chip.className = "review-chip " + reason.cls;
            chip.textContent = reason.text;
            reasons.appendChild(chip);
        });
        whyCell.appendChild(reasons);
    });
}

/***
 * Practice sets (Blind 75 / Grind 75).
 */

var activeSetKey = 'blind75';

function bindPracticeSetControls() {
    document.querySelectorAll('.set-btn').forEach(btn => {
        if (btn.dataset.yaltBound) return;
        btn.dataset.yaltBound = "true";
        btn.addEventListener('click', () => {
            activeSetKey = btn.dataset.set;
            document.querySelectorAll('.set-btn').forEach(b => b.classList.toggle('active', b === btn));
            renderPracticeSet();
        });
    });
    document.querySelectorAll('input[name="set-filter"]').forEach(radio => {
        if (radio.dataset.yaltBound) return;
        radio.dataset.yaltBound = "true";
        radio.addEventListener('change', renderPracticeSet);
    });
}

function findSolveFor(problem) {
    return solvedIndex.bySlug[problem.slug]
        || solvedIndex.byTitle[normalizeProblemTitle(problem.title)]
        || null;
}

function currentSetFilter() {
    let checked = document.querySelector('input[name="set-filter"]:checked');
    return checked ? checked.value : 'all';
}

function renderPracticeSet() {
    let container = document.querySelector('.set-groups');
    if (!container || typeof PRACTICE_SETS === 'undefined') return;

    let set = PRACTICE_SETS[activeSetKey];
    if (!set) return;

    let blurb = document.querySelector('.set-blurb');
    if (blurb) blurb.textContent = set.blurb;

    let annotated = set.problems.map(p => Object.assign({}, p, { solve: findSolveFor(p) }));
    renderPracticeSetSummary(annotated);

    let filter = currentSetFilter();
    let visible = annotated.filter(p => {
        if (filter === 'todo') return !p.solve;
        if (filter === 'done') return !!p.solve;
        return true;
    });

    container.innerHTML = "";

    if (visible.length === 0) {
        let msg = document.createElement('p');
        msg.className = "review-empty";
        msg.textContent = filter === 'done'
            ? "You haven't recorded any " + set.name + " problems yet."
            : "Every " + set.name + " problem is done. Nice.";
        container.appendChild(msg);
        return;
    }

    // Preserve the set's own ordering of groups (topic for Blind, week for Grind).
    let groupOrder = [];
    let grouped = {};
    visible.forEach(p => {
        if (!grouped[p.group]) {
            grouped[p.group] = [];
            groupOrder.push(p.group);
        }
        grouped[p.group].push(p);
    });

    groupOrder.forEach(groupName => {
        let items = grouped[groupName];
        let doneInGroup = items.filter(p => p.solve).length;

        let section = document.createElement('div');
        section.className = "set-group";

        let head = document.createElement('div');
        head.className = "set-group-head";
        let title = document.createElement('h5');
        title.textContent = groupName;
        let count = document.createElement('span');
        count.className = "set-group-count";
        count.textContent = doneInGroup + " / " + items.length + " done";
        head.appendChild(title);
        head.appendChild(count);
        section.appendChild(head);

        let list = document.createElement('ul');
        list.className = "set-list";
        items.forEach(p => list.appendChild(buildPracticeSetItem(p)));
        section.appendChild(list);

        container.appendChild(section);
    });
}

function buildPracticeSetItem(problem) {
    let item = document.createElement('li');
    item.className = "set-item" + (problem.solve ? " done" : "");

    let check = document.createElement('span');
    check.className = "set-check";
    check.textContent = problem.solve ? "✓" : "○";
    item.appendChild(check);

    let diffCls = "diff-hard";
    if (problem.difficulty === "Easy") diffCls = "diff-easy";
    else if (problem.difficulty === "Medium") diffCls = "diff-medium";
    let dot = document.createElement('span');
    dot.className = "diff-icon " + diffCls;
    dot.title = problem.difficulty;
    item.appendChild(dot);

    let link = document.createElement('a');
    link.className = "set-item-title";
    link.href = problem.url;
    link.textContent = problem.title;
    link.title = problem.title;
    item.appendChild(link);

    if (problem.premium) {
        let lock = document.createElement('span');
        lock.className = "set-premium";
        lock.textContent = "premium";
        lock.title = "Requires LeetCode Premium";
        item.appendChild(lock);
    }

    let meta = document.createElement('span');
    meta.className = "set-item-meta";
    if (problem.solve) {
        meta.textContent = formatDurationShort(problem.solve.avgTimeSec) +
            " · " + problem.solve.errors + " err";
        if (problem.solve.lastDate) {
            meta.title = "Last solved " + problem.solve.lastDate.toISOString().split('T')[0];
        }
    }
    item.appendChild(meta);

    return item;
}

function renderPracticeSetSummary(annotated) {
    let done = annotated.filter(p => p.solve);
    setText('.set-done-count', done.length);
    setText('.set-total-count', annotated.length);

    let pct = annotated.length > 0 ? (done.length / annotated.length) * 100 : 0;
    let card = document.querySelector('.set-progress-card');
    if (card) {
        let fill = card.querySelector('.set-bar-fill');
        if (fill) fill.style.width = pct + "%";
    }
    setText('.set-progress-pct', pct.toFixed(0) + "% complete");

    [['Easy', '.set-easy-count'], ['Medium', '.set-medium-count'], ['Hard', '.set-hard-count']].forEach(pair => {
        let diff = pair[0];
        let selector = pair[1];
        let total = annotated.filter(p => p.difficulty === diff);
        let solved = total.filter(p => p.solve);
        setText(selector, solved.length + " / " + total.length);
        let el = document.querySelector(selector);
        let fill = el && el.parentElement ? el.parentElement.querySelector('.set-bar-fill') : null;
        if (fill) fill.style.width = (total.length > 0 ? (solved.length / total.length) * 100 : 0) + "%";
    });
}

function setText(selector, value) {
    let el = document.querySelector(selector);
    if (el) el.textContent = value;
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