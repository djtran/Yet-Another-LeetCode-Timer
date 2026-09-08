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

function getProblemSlug() {
    // Robust slug extraction: /problems/<slug>/...
    const match = window.location.href.match(/\/problems\/([^\/\?#]+)/);
    return match ? match[1] : null;
}

// --- Robust DOM helpers ---

function queryFirst(selectors) {
    for (const sel of selectors) {
        try {
            const el = document.querySelector(sel);
            if (el) return el;
        } catch (e) { /* ignore invalid selector */ }
    }
    return null;
}

function getProblemName() {
    // Try multiple selectors that have existed across LeetCode UI versions
    const selectors = [
        '[data-cy="question-title"]',
        '[data-testid="question-title"]',
        '.text-title-large',
        '[class*="text-title-large"]',
        '.mr-2', // 2023 UI
        'div[data-e2e-locator="question-title"]',
        'h1',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText && el.innerText.trim().length > 0) {
            // Filter out generic h1s that are not problem titles
            // Problem titles usually contain " " or are longer than 3 chars and appear near top
            // For generic fallbacks, prefer elements that look like titles
            if (sel === 'h1') {
                // Only use h1 if it contains typical problem title pattern (e.g., "1. Two Sum")
                const txt = el.innerText.trim();
                if (txt.length < 3 || txt.length > 200) continue;
                // Heuristic: if page also has question content, this h1 is likely the title
                // but avoid picking "LeetCode" logo etc.
                if (/leetcode/i.test(txt)) continue;
            }
            return el.innerText.trim();
        }
    }
    // Fallback: derive from URL slug, e.g., "two-sum" -> "Two Sum"
    const slug = getProblemSlug();
    if (slug) {
        return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return "Unknown Problem";
}

function getDifficulty() {
    // 1) Try known attribute selectors from older UIs
    if (document.querySelectorAll('[diff="easy"]').length >= 1) return DIFFICULTY.EASY;
    if (document.querySelectorAll('[diff="medium"]').length >= 1) return DIFFICULTY.MEDIUM;
    if (document.querySelectorAll('[diff="hard"]').length >= 1) return DIFFICULTY.HARD;

    // 2) Try XPath for exact text (2023 UI and still present in new UI somewhere)
    const xpEasy = document.evaluate("//div[text()='Easy']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (xpEasy) return DIFFICULTY.EASY;
    const xpMed = document.evaluate("//div[text()='Medium']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (xpMed) return DIFFICULTY.MEDIUM;
    const xpHard = document.evaluate("//div[text()='Hard']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (xpHard) return DIFFICULTY.HARD;

    // 3) Try new UI patterns: difficulty often near title with specific colors/classes
    // Search spans/divs whose trimmed text is exactly Easy/Medium/Hard
    const candidates = document.querySelectorAll('div, span');
    for (const el of candidates) {
        // Only consider leaf-ish elements with short text to avoid false positives from containers
        const txt = el.textContent ? el.textContent.trim() : "";
        if (txt !== "Easy" && txt !== "Medium" && txt !== "Hard") continue;
        // Heuristic: visible element
        if (el.offsetParent === null && el.getClientRects().length === 0) continue;
        // Heuristic: small element (not a large container that happens to contain only "Easy" via aggregation)
        // Check that element has no element children with same text (i.e., it's leaf)
        if (el.children.length > 3) continue;
        // Additional heuristic: difficulty element often has color classes
        const cls = el.className || "";
        if (txt === "Easy" && (cls.includes("green") || cls.includes("easy") || cls.toLowerCase().includes("difficulty"))) {
            return DIFFICULTY.EASY;
        }
        if (txt === "Medium" && (cls.includes("yellow") || cls.includes("orange") || cls.includes("medium"))) {
            return DIFFICULTY.MEDIUM;
        }
        if (txt === "Hard" && (cls.includes("red") || cls.includes("hard"))) {
            return DIFFICULTY.HARD;
        }
        // Fallback: if we found exact text match and element is small, accept it
        // Prefer elements that are direct children of header area
        if (txt.length <= 6) {
            // Accept as difficulty if no better match found, but keep scanning for colored version first
            // Store as potential
        }
    }
    // Second pass: accept any exact match if previous colored check didn't return
    for (const el of candidates) {
        const txt = el.textContent ? el.textContent.trim() : "";
        if (txt === "Easy" || txt === "Medium" || txt === "Hard") {
            if (el.offsetParent === null && el.getClientRects().length === 0) continue;
            if (el.children.length > 3) continue;
            if (txt === "Easy") return DIFFICULTY.EASY;
            if (txt === "Medium") return DIFFICULTY.MEDIUM;
            if (txt === "Hard") return DIFFICULTY.HARD;
        }
    }

    // 4) Check meta or page text for difficulty keywords in structured location
    // Example: some extensions parse from GraphQL embedded JSON in page
    try {
        const bodyText = document.body.innerText.slice(0, 5000); // first 5k chars likely contains header
        // Look for pattern like "Easy", "Medium", "Hard" near title area - already covered, but as last resort
    } catch (e) {}

    return DIFFICULTY.UNKNOWN;
}

// Submission result detection - supports both old and new UI
function getSubmissionResultElement() {
    // New UI (2024+)
    const newUI = document.querySelector('[data-e2e-locator="submission-result"]');
    if (newUI) return newUI;
    // Alternative new UI selectors seen in other extensions
    const alt = queryFirst([
        '[data-cy="submission-result"]',
        '.text-green-s', // success color class sometimes used
        '[class*="submission-result"]',
        '[class*="result__"]'
    ]);
    if (alt) return alt;
    return null;
}

function isAcceptedResult(el) {
    if (!el) return false;
    const txt = (el.innerText || el.textContent || "").trim();
    return txt.includes("Accepted") || txt.toLowerCase().includes("accepted");
}

function isErrorResult(el) {
    if (!el) return false;
    const txt = (el.innerText || el.textContent || "").trim();
    // New UI uses same text but inside submission-result container
    return txt.includes("Wrong Answer") ||
           txt.includes("Runtime Error") ||
           txt.includes("Time Limit Exceeded") ||
           txt.includes("Compile Error") ||
           txt.includes("Memory Limit Exceeded") ||
           txt.includes("Output Limit Exceeded");
}

const evaluateForSuccess = "//span[text()='Accepted']";
const evaluateForWrongAnswer = "//div[text()='Wrong Answer']";
const evaluateForRuntimeError = "//div[text()='Runtime Error']";
const evaluateForTLE = "//div[text()='Time Limit Exceeded']";
const evaluateForCompileError = "//div[text()='Compile Error']";

function getConsoleResultElement() {
    return queryFirst([
        '[data-e2e-locator="console-result"]',
        '[data-e2e-locator="submission-result"]',
        '[class*="console-result"]'
    ]);
}

function findErrorTextAnywhere() {
    // Robust fallback: search for error strings anywhere in visible DOM
    // Covers cases where Runtime Error is outside [data-e2e-locator="submission-result"]
    const errorKeywords = ["Wrong Answer", "Runtime Error", "Time Limit Exceeded", "Compile Error", "Memory Limit Exceeded", "Output Limit Exceeded"];
    
    // 1) Try precise XPaths first (fast)
    const preciseXPaths = [
        "//div[text()='Wrong Answer']",
        "//div[text()='Runtime Error']",
        "//div[text()='Time Limit Exceeded']",
        "//div[text()='Compile Error']",
        "//span[text()='Wrong Answer']",
        "//span[text()='Runtime Error']"
    ];
    for (const xp of preciseXPaths) {
        try {
            const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (el && el.offsetParent !== null) return el;
        } catch (e) {}
    }

    // 2) Broader search: any visible element containing error keyword, with limited text length to avoid matching large containers
    const allElements = document.querySelectorAll('div, span');
    for (const el of allElements) {
        if (el.offsetParent === null && el.getClientRects().length === 0) continue; // hidden
        const txt = (el.innerText || el.textContent || "").trim();
        if (txt.length === 0 || txt.length > 200) continue; // avoid huge containers
        for (const kw of errorKeywords) {
            if (txt === kw || (txt.includes(kw) && txt.length < 100)) {
                // Ensure it's not a parent that merely contains error text via children aggregation
                // Prefer leaf elements
                if (el.children.length <= 2) {
                    return el;
                }
            }
        }
    }

    // 3) Check console-result element text as last resort
    const consoleEl = getConsoleResultElement();
    if (consoleEl && isErrorResult(consoleEl)) return consoleEl;

    return null;
}

function handleSuccessfulSubmission(uiLabel) {
    successfulCompletion = true;
    pendingSubmissions = 0; // reset pending on success
    pauseTimer();
    let time = timerDisplay ? timerDisplay.innerText : "00:00:00";
    currentSession["time"] = time;
    clearInterval(submitTimer);
    chrome.storage.local.get(['history'], function (data) {
        let historyData = data.history;
        if (historyData == null) historyData = [];
        historyData.push(currentSession);
        chrome.storage.local.set({ 'history': historyData });
        console.log(`YALT: saving successful submission (${uiLabel}) errors=${currentSession["errors"]}`);
    });
    chrome.storage.local.get(['aggregate'], function (data) {
        let agg = data.aggregate;
        if (agg == null) agg = [];
        let reduced = {
            "diff": currentSession["difficulty"],
            "err": currentSession["errors"],
            "time": currentSession["time"],
            "date": currentSession["date"]
        };
        agg.push(reduced);
        chrome.storage.local.set({ "aggregate": agg });
    });
}

function handleErrorSubmission(uiLabel, detail) {
    // Only count if we have a pending submission to avoid double-counting same result
    if (pendingSubmissions <= 0) {
        // Still count if we detect error but pending is 0 (edge: user submitted before listener attached)
        // To avoid missing errors, count it but log warning
        console.log(`YALT: error detected with no pending (ui=${uiLabel}, detail=${detail}), counting anyway`);
    } else {
        pendingSubmissions--;
    }
    currentSession["errors"] += 1;
    clearInterval(submitTimer);
    console.log(`YALT: detected error [${detail}] via ${uiLabel}, total errors = ${currentSession["errors"]}, pending left=${pendingSubmissions}`);
}

function waitForSubmitResponse() {
    // 1) Try new UI first - submission-result
    const resultEl = getSubmissionResultElement();
    if (resultEl) {
        if (isAcceptedResult(resultEl)) {
            handleSuccessfulSubmission("new UI");
            return;
        } else if (isErrorResult(resultEl)) {
            handleErrorSubmission("new UI submission-result", resultEl.innerText.trim().slice(0, 30));
            return;
        }
    }

    // 1b) Try console-result (new UI alternative for Runtime Error etc.)
    const consoleResult = getConsoleResultElement();
    if (consoleResult && consoleResult !== resultEl) {
        if (isAcceptedResult(consoleResult)) {
            handleSuccessfulSubmission("new UI console-result");
            return;
        } else if (isErrorResult(consoleResult)) {
            handleErrorSubmission("new UI console-result", consoleResult.innerText.trim().slice(0, 30));
            return;
        }
    }

    // 1c) Robust anywhere search (covers Runtime Error that might be outside submission-result)
    const anywhereError = findErrorTextAnywhere();
    if (anywhereError) {
        // Make sure it's not the same element we already checked and found not error
        const txt = (anywhereError.innerText || anywhereError.textContent || "").trim();
        if (txt.includes("Wrong Answer") || txt.includes("Runtime Error") || txt.includes("Time Limit") || txt.includes("Compile Error")) {
            handleErrorSubmission("anywhere fallback", txt.slice(0, 30));
            return;
        }
    }

    // 2) Fallback to old UI XPaths (2023)
    let success = document.evaluate(evaluateForSuccess, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    let error = document.evaluate(evaluateForRuntimeError, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    let wrong = document.evaluate(evaluateForWrongAnswer, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    let tle = document.evaluate(evaluateForTLE, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    let compileErr = document.evaluate(evaluateForCompileError, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    if (success != null) {
        handleSuccessfulSubmission("old UI");
    } else if (error != null || wrong != null || tle != null || compileErr != null) {
        let detail = error ? "Runtime Error" : wrong ? "Wrong Answer" : tle ? "TLE" : "Compile Error";
        handleErrorSubmission("old UI XPath", detail);
    }
    //else we poll again some time later.
}

var submitTimer;

function findSubmitButton() {
    return queryFirst([
        '[data-e2e-locator="console-submit-button"]',
        'button[data-e2e-locator="console-submit-button"]',
        '[data-cy="submit-code-btn"]',
        'button[data-cy="submit-code-btn"]'
    ]) || document.evaluate("//button[contains(text(),'Submit')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
      || document.evaluate("//button[text()='Submit']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function findRunButton() {
    return queryFirst([
        '[data-e2e-locator="console-run-button"]',
        'button[data-e2e-locator="console-run-button"]',
        '[data-cy="run-code-btn"]',
        'button[data-cy="run-code-btn"]'
    ]) || document.evaluate("//button[contains(text(),'Run')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
      || document.evaluate("//button[text()='Run']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

var pendingSubmissions = 0;
var lastSeenResult = "";

function isSubmitButtonElement(el) {
    if (!el) return false;
    // Check closest matching known submit selectors
    return el.closest('[data-e2e-locator="console-submit-button"]') ||
           el.closest('[data-cy="submit-code-btn"]') ||
           (el.tagName === 'BUTTON' && el.textContent && el.textContent.trim() === 'Submit');
}

function addClickListenerToSubmitButton() {
    // Use event delegation so it survives React re-renders of the button
    if (document.documentElement.dataset.yaltSubmitDelegation) return;
    document.documentElement.dataset.yaltSubmitDelegation = "true";

    document.addEventListener('click', (e) => {
        if (!isSubmitButtonElement(e.target)) return;

        console.log("YALT: submit clicked (delegated), pending before=" + pendingSubmissions);
        pendingSubmissions++;

        // Clear stale result to prevent immediate re-count of previous error
        // Without this, polling would instantly see old "Wrong Answer" / "Runtime Error"
        // and count it as new submission before LeetCode clears UI.
        const existingResult = getSubmissionResultElement();
        if (existingResult) {
            lastSeenResult = (existingResult.innerText || existingResult.textContent || "").trim();
            // Don't clear text (might break LeetCode UI), but mark timestamp
            // Instead, we rely on 800ms delay for UI to clear old result
        } else {
            lastSeenResult = "";
        }

        // Also try to clear console-result if present
        const consoleEl = getConsoleResultElement();
        if (consoleEl && consoleEl !== existingResult) {
            // Mark but don't mutate LeetCode DOM aggressively
        }

        // Clear any previous polling
        clearInterval(submitTimer);

        // Give LeetCode UI a moment to clear old result / show loading spinner
        // This prevents counting stale "Wrong Answer" from previous submission
        setTimeout(() => {
            // Only start polling if we still have pending submissions
            if (pendingSubmissions > 0) {
                submitTimer = setInterval(waitForSubmitResponse, 500);
            }
        }, 800);

        // Safety: stop polling after 30 seconds to avoid infinite loop
        setTimeout(() => clearInterval(submitTimer), 30000);
    }, true);

    console.log("YALT: delegated submit listener attached");
}

var successfulCompletion = false;

//If the code area changes, e.g. typing, and we haven't completed the problem start the timer if it hasn't already started.
function addCodeMutationObserver() {
    //More Details https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    let attempts = 0;
    const tryObserve = () => {
        var target = document.querySelector('.monaco-editor');
        if (!target) {
            // New UI might wrap monaco differently, try alternative containers
            target = queryFirst([
                '.monaco-editor',
                '[data-e2e-locator="code-editor"]',
                '.view-lines',
                '#editor',
                '[class*="monaco"]'
            ]);
        }
        if (target) {
            // Avoid double observing
            if (target.dataset.yaltObserved) return;
            target.dataset.yaltObserved = "true";
            var observer = new MutationObserver(function (mutations) {
                if (!successfulCompletion) {
                    startTimer();
                }
            });
            var config = { subtree: true, childList: true, characterData: true };
            observer.observe(target, config);
            console.log("YALT: code mutation observer attached to", target);
        } else {
            attempts++;
            if (attempts < 20) {
                setTimeout(tryObserve, 500);
            } else {
                console.log("YALT: monaco editor not found for observer");
            }
        }
    };
    tryObserve();
}

function createTimerElements() {
    // Create container to avoid styling conflicts with LeetCode's Tailwind
    let container = document.createElement("div");
    container.classList.add('yalt-container');
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";
    container.style.padding = "4px 8px";
    container.style.border = "1px solid #ddd";
    container.style.borderRadius = "8px";
    container.style.background = "#ffffff";
    container.style.fontFamily = "monospace";
    container.style.zIndex = "1000";
    container.style.userSelect = "none"; // prevent text selection while dragging
    container.style.cursor = "move"; // hint that it's draggable

    timerDisplay = document.createElement("label");
    timerDisplay.classList.add('timer');
    timerDisplay.innerText = "00:00:00";
    timerDisplay.style.padding = "4px 8px";
    timerDisplay.style.fontWeight = "bold";
    timerDisplay.style.minWidth = "70px";
    timerDisplay.style.textAlign = "center";

    //start button
    startTimerButton = document.createElement("button");
    startTimerButton.classList.add('startTimer')
    startTimerButton.innerText = "Start Timer"
    startTimerButton.style.padding = "4px 8px";
    startTimerButton.style.border = "1px solid #4CAF50";
    startTimerButton.style.borderRadius = "4px";
    startTimerButton.style.background = "#e8f5e9";
    startTimerButton.style.cursor = "pointer";
    startTimerButton.onclick = startTimer;

    //pause button
    pauseTimerButton = document.createElement("button");
    pauseTimerButton.classList.add('pauseTimer')
    pauseTimerButton.innerText = "Pause"
    pauseTimerButton.style.padding = "4px 8px";
    pauseTimerButton.style.border = "1px solid #ff9800";
    pauseTimerButton.style.borderRadius = "4px";
    pauseTimerButton.style.background = "#fff3e0";
    pauseTimerButton.style.cursor = "pointer";
    pauseTimerButton.onclick = pauseTimer;

    // Drag handle - visual cue that widget is movable
    let dragHandle = document.createElement("span");
    dragHandle.innerText = "⠿"; // braille grip pattern, small and unobtrusive
    dragHandle.title = "Drag to move timer";
    dragHandle.style.cursor = "move";
    dragHandle.style.padding = "0 4px";
    dragHandle.style.color = "#888";
    dragHandle.style.fontSize = "14px";
    dragHandle.style.userSelect = "none";

    container.appendChild(dragHandle);
    container.appendChild(timerDisplay);
    container.appendChild(startTimerButton);
    container.appendChild(pauseTimerButton);

    return container;
}

function attachDragHandlers(container) {
    // Avoid double-attaching
    if (container.dataset.yaltDraggable === "true") return;
    container.dataset.yaltDraggable = "true";
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const onMouseDown = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const rect = container.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        container.style.bottom = "auto";
        container.style.right = "auto";
        container.style.left = rect.left + "px";
        container.style.top = rect.top + "px";
        container.style.cursor = "grabbing";
        e.preventDefault();
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        let newLeft = e.clientX - dragOffsetX;
        let newTop = e.clientY - dragOffsetY;
        const maxLeft = window.innerWidth - container.offsetWidth - 4;
        const maxTop = window.innerHeight - container.offsetHeight - 4;
        newLeft = Math.max(4, Math.min(newLeft, maxLeft));
        newTop = Math.max(4, Math.min(newTop, maxTop));
        container.style.left = newLeft + "px";
        container.style.top = newTop + "px";
    };

    const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        container.style.cursor = "move";
        try {
            const rect = container.getBoundingClientRect();
            localStorage.setItem("yalt-timer-pos", JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
        } catch (e) {}
    };

    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function setupTimer() {
    // Helper to apply fixed bottom-left styling (or restored dragged position)
    function applyFixedPosition(container, forceBottomLeft = false) {
        container.style.position = "fixed";
        container.style.zIndex = "2147483647";
        container.style.boxShadow = "0 2px 12px rgba(0,0,0,0.25)";
        container.style.transition = "none";
        container.style.willChange = "transform";
        container.style.display = "inline-flex"; // ensure visible
        container.style.visibility = "visible";
        container.style.opacity = "1";

        if (forceBottomLeft) {
            container.style.left = "20px";
            container.style.bottom = "20px";
            container.style.top = "auto";
            container.style.right = "auto";
            return;
        }

        let savedPos = null;
        try {
            const raw = localStorage.getItem("yalt-timer-pos");
            if (raw) savedPos = JSON.parse(raw);
        } catch (e) {}
        // Validate savedPos is within viewport and not off-screen
        const isValidPos = savedPos &&
            typeof savedPos.left === "number" && typeof savedPos.top === "number" &&
            savedPos.left >= 0 && savedPos.left <= window.innerWidth - 50 &&
            savedPos.top >= 0 && savedPos.top <= window.innerHeight - 30;

        if (isValidPos) {
            container.style.left = savedPos.left + "px";
            container.style.top = savedPos.top + "px";
            container.style.bottom = "auto";
            container.style.right = "auto";
        } else {
            // Default: bottom-left corner, clear bad saved pos
            if (savedPos) {
                try { localStorage.removeItem("yalt-timer-pos"); } catch (e) {}
            }
            container.style.left = "20px";
            container.style.bottom = "20px";
            container.style.top = "auto";
            container.style.right = "auto";
        }
    }

    function ensureVisible(container) {
        // After appending, check if it's actually visible in viewport, if not force bottom-left
        const rect = container.getBoundingClientRect();
        const isOffScreen = rect.right < 0 || rect.left > window.innerWidth ||
                            rect.bottom < 0 || rect.top > window.innerHeight ||
                            rect.width === 0 || rect.height === 0;
        if (isOffScreen) {
            console.log("YALT: timer off-screen detected, forcing bottom-left", rect);
            applyFixedPosition(container, true);
        }
    }

    let checkForExisting = document.querySelector(".yalt-container");
    if (checkForExisting != null) {
        // Timer already exists - migrate if it's trapped in old location (e.g., inside console footer)
        const parentIsBody = checkForExisting.parentElement === document.body;
        const isFixed = window.getComputedStyle(checkForExisting).position === 'fixed';
        if (!parentIsBody || !isFixed) {
            // Old injection was inside collapsible console footer - move to body and make fixed bottom-left
            document.body.appendChild(checkForExisting);
            applyFixedPosition(checkForExisting, true); // force bottom-left for migration
            ensureVisible(checkForExisting);
            console.log("YALT: migrated existing timer from old location to fixed bottom-left");
        } else if (!document.body.contains(checkForExisting)) {
            document.body.appendChild(checkForExisting);
            ensureVisible(checkForExisting);
            console.log("YALT: timer re-attached to body after SPA detach");
        } else {
            // Even if already in body and fixed, ensure it's visible (could be off-screen from bad saved pos)
            ensureVisible(checkForExisting);
        }
        // Ensure it has drag handlers (in case old version didn't)
        if (!checkForExisting.dataset.yaltDraggable) {
            attachDragHandlers(checkForExisting);
            checkForExisting.dataset.yaltDraggable = "true";
        }
        return;
    }
    // Also check for legacy .timer without container (from very old versions)
    let legacyTimer = document.querySelector(".timer");
    if (legacyTimer && !legacyTimer.closest(".yalt-container")) {
        legacyTimer.remove();
    }

    let container = createTimerElements();
    applyFixedPosition(container);
    attachDragHandlers(container);

    document.body.appendChild(container);
    // Defer visibility check to next frame so getBoundingClientRect has layout
    requestAnimationFrame(() => ensureVisible(container));
    console.log("YALT: timer injected as fixed draggable bottom-left container");

    // Optional: also try to inject a small inline badge near problem title for integrated feel,
    // but keep main timer fixed. This secondary injection is non-critical.
    try {
        const titleEl = document.querySelector('[data-cy="question-title"]') || document.querySelector('.text-title-large');
        if (titleEl && titleEl.parentNode) {
            // Create a minimal inline indicator (optional, doesn't replace main timer)
            // We avoid inserting main timer here to keep it independent.
        }
    } catch (e) {}
}

var currentProblem = "";
var currentSession = {};

function detectChanges() {
    let slug = getProblemSlug();
    if (!slug) return; // not on a problem page

    // Detect SPA navigation via URL slug
    // Also re-inject if timer was removed by React re-render
    let timerExists = document.querySelector(".yalt-container") || document.querySelector(".timer");
    let problemChanged = slug !== currentProblem;
    let needsReinject = !timerExists;

    // Only proceed if we're on a problem description or main problem page
    // URL patterns:
    // https://leetcode.com/problems/two-sum/
    // https://leetcode.com/problems/two-sum/description/
    // https://leetcode.com/problems/two-sum/submissions/  -> skip (not main page)
    let url = window.location.href;
    let isProblemMainPage = /\/problems\/[^\/]+\/?(\?.*)?(#.*)?$/.test(url) || /\/problems\/[^\/]+\/description/.test(url);

    if ((problemChanged && isProblemMainPage) || needsReinject) {
        if (problemChanged) {
            console.log("YALT: Problem Changed from " + currentProblem + " to " + slug);
            currentProblem = slug;

            // Reset state for new problem
            successfulCompletion = false;
            clearInterval(submitTimer);

            // Setup data object for this session
            let difficulty = getDifficulty();
            let fullUrl = getProblemURL();
            let date = new Date();
            let prettyName = getProblemName();

            currentSession = {
                "problem": prettyName,
                "difficulty": difficulty,
                "url": fullUrl,
                "date": date.toISOString(),
                "errors": 0
            }
            console.log("YALT: new session", currentSession);
        }

        // Always ensure timer exists
        setupTimer();
        if (problemChanged) {
            // resetTimer is defined in timer.js - ensure it exists
            if (typeof resetTimer === 'function') {
                resetTimer();
                // Re-apply container styling after reset (resetTimer may clear innerHTML)
                const tDisp = document.querySelector('.timer');
                if (tDisp) timerDisplay = tDisp;
            }
            // Re-attach observers with delay to let editor populate
            setTimeout(addCodeMutationObserver, 1000);
            addClickListenerToSubmitButton();
        }
    }
}

// Main onLoadPage function, starts the cycles needed to discover the elements inside the page
// and to attach listeners to them
function onLoadPage(evt) {
    console.log("YALT: content script loaded, starting detect loop");
    setInterval(detectChanges, 800);

    // Also observe URL changes via popstate / pushState patching for faster reaction
    // (LeetCode is SPA, history.pushState doesn't trigger load)
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(detectChanges, 300);
    };
    window.addEventListener('popstate', () => setTimeout(detectChanges, 300));
}
