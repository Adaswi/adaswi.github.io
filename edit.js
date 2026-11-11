const API_BASE = "https://schedule.vibas.sbs";

const THINK_LABELS = [
    "Reading the timetable",
    "Checking the date",
    "Matching the week",
    "Writing the change",
    "Checking the file"
];

const DOTS = [
    { id: 1, x: 40, y: 40 },
    { id: 2, x: 120, y: 40 },
    { id: 3, x: 200, y: 40 },
    { id: 4, x: 40, y: 120 },
    { id: 5, x: 120, y: 120 },
    { id: 6, x: 200, y: 120 },
    { id: 7, x: 40, y: 200 },
    { id: 8, x: 120, y: 200 },
    { id: 9, x: 200, y: 200 }
];

let sentence = "";
let pattern = [];
let drawing = false;
let thinkTimer = 0;
let thinkStarted = 0;
let labelTimer = 0;
let labelIndex = 0;
let pendingId = "";
let pendingPassword = "";
let typeTimer = 0;

const sentenceOverlay = document.getElementById("sentenceOverlay");
const passwordOverlay = document.getElementById("passwordOverlay");
const thinking = document.getElementById("thinking");
const sentenceInput = document.getElementById("sentenceInput");
const sentenceNext = document.getElementById("sentenceNext");
const passwordInput = document.getElementById("passwordInput");
const passwordAccept = document.getElementById("passwordAccept");
const patternGrid = document.getElementById("patternGrid");
const patternSvg = patternGrid.querySelector("svg");
const thinkLabel = document.getElementById("thinkLabel");
const thinkBar = document.getElementById("thinkBar");
const resultCard = document.getElementById("resultCard");
const resultMessage = document.getElementById("resultMessage");
const resultNote = document.getElementById("resultNote");
const resultActions = document.getElementById("resultActions");

function show(el) {
    el.hidden = false;
}

function hide(el) {
    el.hidden = true;
}

function buildDots() {
    DOTS.forEach((dot) => {
        const node = document.createElement("div");
        node.className = "pattern-dot";
        node.dataset.id = String(dot.id);
        node.setAttribute("role", "button");
        node.setAttribute("aria-label", "Dot " + dot.id);
        node.style.left = dot.x + "px";
        node.style.top = dot.y + "px";
        patternGrid.appendChild(node);
    });
}

function resetPattern() {
    pattern = [];
    drawing = false;
    patternSvg.innerHTML = "";
    patternGrid.querySelectorAll(".pattern-dot").forEach((dot) => dot.classList.remove("used"));
    refreshAccept();
}

function refreshAccept() {
    passwordAccept.disabled = passwordInput.value.length === 0 || pattern.length < 2;
}

function drawPattern() {
    const parts = [];
    for (let i = 1; i < pattern.length; i++) {
        const from = DOTS[pattern[i - 1] - 1];
        const to = DOTS[pattern[i] - 1];
        parts.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#007acc" stroke-width="4" stroke-linecap="round"></line>`);
    }
    patternSvg.innerHTML = parts.join("");
    patternGrid.querySelectorAll(".pattern-dot").forEach((dot) => {
        dot.classList.toggle("used", pattern.includes(Number(dot.dataset.id)));
    });
    refreshAccept();
}

function dotAt(event) {
    const rect = patternGrid.getBoundingClientRect();
    const scale = rect.width / 240;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    return DOTS.find((dot) => {
        const dx = dot.x - x;
        const dy = dot.y - y;
        return dx * dx + dy * dy <= 32 * 32;
    });
}

function addDot(dot) {
    if (!dot || pattern.includes(dot.id)) return;
    pattern.push(dot.id);
    drawPattern();
}

function onPatternDown(event) {
    const dot = dotAt(event);
    if (!dot) return;
    drawing = true;
    pattern = [];
    try {
        patternGrid.setPointerCapture(event.pointerId);
    } catch {
        // Synthetic events used in checks have no capture target.
    }
    addDot(dot);
}

function onPatternMove(event) {
    if (!drawing) return;
    addDot(dotAt(event));
}

function onPatternUp() {
    drawing = false;
}

function openSentence() {
    sentenceInput.value = "";
    sentenceNext.disabled = true;
    hide(passwordOverlay);
    hide(resultCard);
    show(sentenceOverlay);
    sentenceInput.focus();
}

function openPassword() {
    sentence = sentenceInput.value.trim();
    passwordInput.value = "";
    resetPattern();
    hide(sentenceOverlay);
    show(passwordOverlay);
    passwordInput.focus();
}

function thinkProgress(seconds) {
    const accelerated = 1 - Math.exp(-Math.pow(seconds / 14, 1.7));
    return Math.min(0.92, accelerated);
}

function startThinking() {
    hide(passwordOverlay);
    hide(sentenceOverlay);
    show(thinking);
    thinkStarted = performance.now();
    labelIndex = 0;
    thinkLabel.textContent = THINK_LABELS[0];
    thinkLabel.style.opacity = "1";
    thinkBar.style.width = "0%";
    thinkTimer = window.setInterval(() => {
        const seconds = (performance.now() - thinkStarted) / 1000;
        thinkBar.style.width = (thinkProgress(seconds) * 100) + "%";
    }, 50);
    labelTimer = window.setInterval(() => {
        thinkLabel.style.opacity = "0";
        window.setTimeout(() => {
            labelIndex = (labelIndex + 1) % THINK_LABELS.length;
            thinkLabel.textContent = THINK_LABELS[labelIndex];
            thinkLabel.style.opacity = "1";
        }, 350);
    }, 1800);
}

function finishThinking() {
    window.clearInterval(thinkTimer);
    window.clearInterval(labelTimer);
    thinkBar.style.width = "100%";
    return new Promise((resolve) => {
        window.setTimeout(() => {
            hide(thinking);
            resolve();
        }, 280);
    });
}

function typeMessage(text) {
    window.clearInterval(typeTimer);
    resultMessage.textContent = "";
    show(resultCard);
    let index = 0;
    return new Promise((resolve) => {
        typeTimer = window.setInterval(() => {
            index += 1;
            resultMessage.textContent = text.slice(0, index);
            if (index >= text.length) {
                window.clearInterval(typeTimer);
                resolve();
            }
        }, 16);
    });
}

async function submitEdit() {
    const password = passwordInput.value;
    const drawn = pattern.slice();
    pendingPassword = password;
    startThinking();
    let payload = null;
    let failed = false;
    try {
        const response = await fetch(API_BASE + "/api/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sentence, password, pattern: drawn })
        });
        payload = await response.json();
        if (!response.ok && !payload.message) {
            failed = true;
            payload = { message: payload.error || "The timetable could not be updated." };
        }
    } catch (error) {
        failed = true;
        payload = { message: "The timetable service could not be reached." };
    }
    await finishThinking();
    await typeMessage(payload.message || "No message was returned.");
    resultNote.hidden = true;
    resultActions.hidden = true;
    pendingId = "";
    if (failed || payload.success !== "true") {
        if (payload.passwordRemoved) {
            resultNote.hidden = false;
            resultNote.textContent = "The password you used has been removed. Another line from your list will work after about five minutes.";
        }
        return;
    }
    pendingId = payload.pendingId || "";
    if (payload.person && payload.answer) applyImportedData(payload.person, payload.answer);
    if (pendingId) resultActions.hidden = false;
}

async function finishPending(action) {
    const id = pendingId;
    const password = pendingPassword;
    document.getElementById("pushBtn").disabled = true;
    document.getElementById("cancelBtn").disabled = true;
    try {
        const response = await fetch(API_BASE + "/api/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, pendingId: id, action })
        });
        const payload = await response.json();
        resultActions.hidden = true;
        resultNote.hidden = false;
        resultNote.textContent = payload.message || payload.error || "Done.";
        pendingId = "";
    } catch (error) {
        resultNote.hidden = false;
        resultNote.textContent = "The timetable service could not be reached.";
    }
    document.getElementById("pushBtn").disabled = false;
    document.getElementById("cancelBtn").disabled = false;
}

buildDots();

document.getElementById("editBtn").addEventListener("click", openSentence);
document.getElementById("sentenceClose").addEventListener("click", () => hide(sentenceOverlay));
document.getElementById("sentenceNext").addEventListener("click", openPassword);
document.getElementById("passwordBack").addEventListener("click", () => {
    hide(passwordOverlay);
    show(sentenceOverlay);
});
sentenceInput.addEventListener("input", () => {
    sentenceNext.disabled = sentenceInput.value.trim().length === 0;
});
passwordInput.addEventListener("input", refreshAccept);
patternGrid.addEventListener("pointerdown", onPatternDown);
patternGrid.addEventListener("pointermove", onPatternMove);
patternGrid.addEventListener("pointerup", onPatternUp);
patternGrid.addEventListener("pointercancel", onPatternUp);
passwordAccept.addEventListener("click", submitEdit);
document.getElementById("pushBtn").addEventListener("click", () => finishPending("push"));
document.getElementById("cancelBtn").addEventListener("click", () => finishPending("cancel"));
