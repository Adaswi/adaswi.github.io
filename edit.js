const API_BASE = "https://schedule.vibas.sbs";
const STEP_COUNT = 3;

const PHRASES = [
    "Reading the timetable beside this window",
    "Finding the day you named",
    "Checking which week that date falls in",
    "Keeping every other day as it is",
    "Turning the date into the file's format",
    "Matching the hours to the day",
    "Looking up the colour already used for that name",
    "Leaving the weekly template alone",
    "Writing only the custom day",
    "Checking the afternoon against the morning",
    "Making sure the end is after the start",
    "Comparing this with the current file",
    "Placing the block on the right person",
    "Reading the sentence once more",
    "Checking it does not spill into someone else",
    "Lining the new hours up with the grid",
    "Keeping the odd and even weeks untouched",
    "Seeing whether that date already has a plan",
    "Writing a draft of the day",
    "Checking the colours still match the names",
    "Making room if the day was empty",
    "Looking at the week currently on screen",
    "Settling the start time",
    "Settling the end time"
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

const STEPS = { sentence: "Step 1/3", password: "Step 2/3", pattern: "Step 3/3" };

let sentence = "";
let password = "";
let pattern = [];
let drawing = false;
let pointer = null;
let recentPhrases = [];
let labelTimer = 0;
let typeTimer = 0;
let pendingId = "";
let busy = false;

const editor = document.getElementById("editor");
const editorCard = editor;
const editorBar = document.getElementById("editorBar");
const editorClose = document.getElementById("editorClose");
const stepLabel = document.getElementById("stepLabel");
const stage = document.getElementById("editorStage");
const sentenceInput = document.getElementById("sentenceInput");
const sentenceNext = document.getElementById("sentenceNext");
const passwordInput = document.getElementById("passwordInput");
const passwordNext = document.getElementById("passwordNext");
const patternGrid = document.getElementById("patternGrid");
const patternSvg = patternGrid.querySelector("svg");
const patternAccept = document.getElementById("patternAccept");
const thinkLabel = document.getElementById("thinkLabel");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultNote = document.getElementById("resultNote");
const resultActions = document.getElementById("resultActions");

function nextPhrase() {
    const blocked = new Set(recentPhrases);
    let pool = PHRASES.filter((phrase) => !blocked.has(phrase));
    if (!pool.length) pool = PHRASES.filter((phrase) => phrase !== recentPhrases[recentPhrases.length - 1]);
    const phrase = pool[Math.floor(Math.random() * pool.length)];
    recentPhrases.push(phrase);
    if (recentPhrases.length > 5) recentPhrases.shift();
    return phrase;
}

function goTo(name, direction) {
    const entering = stage.querySelector(`[data-panel="${name}"]`);
    stage.querySelectorAll(".panel").forEach((panel) => {
        panel.classList.remove("active", "enter-back");
    });
    void entering.offsetWidth;
    entering.classList.add("active");
    if (direction === "back") entering.classList.add("enter-back");
    stepLabel.textContent = STEPS[name] || "";
    editorClose.disabled = name === "wait" || (name === "result" && !!pendingId);
}

function openEditor() {
    if (busy) return;
    sentenceInput.value = "";
    passwordInput.value = "";
    sentenceNext.disabled = true;
    passwordNext.disabled = true;
    resetPattern();
    pendingId = "";
    editor.hidden = false;
    goTo("sentence", "forward");
    sentenceInput.focus();
}

function closeEditor() {
    if (editorClose.disabled) return;
    editor.hidden = true;
    window.clearInterval(labelTimer);
    window.clearInterval(typeTimer);
}

function buildDots() {
    DOTS.forEach((dot) => {
        const node = document.createElement("button");
        node.type = "button";
        node.className = "pattern-dot";
        node.dataset.id = String(dot.id);
        node.setAttribute("aria-label", "Dot " + dot.id);
        node.style.left = dot.x + "px";
        node.style.top = dot.y + "px";
        patternGrid.appendChild(node);
    });
}

function resetPattern() {
    pattern = [];
    drawing = false;
    pointer = null;
    patternSvg.innerHTML = "";
    patternGrid.querySelectorAll(".pattern-dot").forEach((dot) => dot.classList.remove("used", "hot"));
    patternAccept.disabled = true;
}

function line(x1, y1, x2, y2, animate) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "line");
    node.setAttribute("x1", x1);
    node.setAttribute("y1", y1);
    node.setAttribute("x2", x2);
    node.setAttribute("y2", y2);
    node.setAttribute("stroke", "#5d87a8");
    node.setAttribute("stroke-width", "6");
    node.setAttribute("stroke-linecap", "round");
    if (animate) {
        const length = Math.hypot(x2 - x1, y2 - y1);
        node.style.strokeDasharray = String(length);
        node.style.strokeDashoffset = String(length);
        node.style.transition = "stroke-dashoffset 320ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        requestAnimationFrame(() => {
            node.style.strokeDashoffset = "0";
        });
    }
    return node;
}

function drawPattern(animateLast) {
    const trail = drawing && pointer && pattern.length
        ? line(DOTS[pattern[pattern.length - 1] - 1].x, DOTS[pattern[pattern.length - 1] - 1].y, pointer.x, pointer.y, false)
        : null;
    if (trail) {
        trail.setAttribute("stroke", "rgba(93, 135, 168, 0.4)");
    }
    patternSvg.replaceChildren();
    for (let i = 1; i < pattern.length; i++) {
        const from = DOTS[pattern[i - 1] - 1];
        const to = DOTS[pattern[i] - 1];
        patternSvg.appendChild(line(from.x, from.y, to.x, to.y, animateLast && i === pattern.length - 1));
    }
    if (trail) patternSvg.appendChild(trail);
    patternGrid.querySelectorAll(".pattern-dot").forEach((dot) => {
        const id = Number(dot.dataset.id);
        const used = pattern.includes(id);
        dot.classList.toggle("used", used);
        dot.classList.toggle("hot", used && id === pattern[pattern.length - 1]);
    });
    patternAccept.disabled = pattern.length < 2;
}

function dotAt(event) {
    const rect = patternGrid.getBoundingClientRect();
    const scale = rect.width / 240;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    pointer = { x, y };
    return DOTS.find((dot) => {
        const dx = dot.x - x;
        const dy = dot.y - y;
        return dx * dx + dy * dy <= 30 * 30;
    });
}

function addDot(dot) {
    if (!dot || pattern.includes(dot.id)) return false;
    pattern.push(dot.id);
    return true;
}

function onPatternDown(event) {
    if (event.target.closest(".panel-actions")) return;
    const dot = dotAt(event);
    if (!dot) return;
    drawing = true;
    pattern = [];
    try {
        patternGrid.setPointerCapture(event.pointerId);
    } catch {
        // A synthetic event has nothing to capture.
    }
    drawPattern(addDot(dot));
}

function onPatternMove(event) {
    if (!drawing) return;
    drawPattern(addDot(dotAt(event)));
}

function onPatternUp() {
    drawing = false;
    pointer = null;
    drawPattern(false);
}

function startWaiting() {
    busy = true;
    goTo("wait", "forward");
    thinkLabel.style.opacity = "1";
    thinkLabel.textContent = nextPhrase();
    window.clearInterval(labelTimer);
    labelTimer = window.setInterval(() => {
        thinkLabel.style.opacity = "0";
        window.setTimeout(() => {
            if (!busy) return;
            thinkLabel.textContent = nextPhrase();
            thinkLabel.style.opacity = "1";
        }, 220);
    }, 1700);
}

function stopWaiting() {
    busy = false;
    window.clearInterval(labelTimer);
}

function typeMessage(text) {
    window.clearInterval(typeTimer);
    resultMessage.textContent = "";
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

function setActions(canPublish) {
    resultActions.replaceChildren();
    if (!canPublish) {
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Close";
        close.addEventListener("click", closeEditor);
        resultActions.appendChild(close);
        return;
    }
    const push = document.createElement("button");
    push.type = "button";
    push.className = "primary";
    push.textContent = "Commit & Push";
    push.addEventListener("click", () => finishPending("push"));
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => finishPending("cancel"));
    resultActions.append(push, cancel);
}

async function showOutcome(payload, failed) {
    stopWaiting();
    const message = payload.message || payload.error || "No message was returned.";
    const canPublish = !failed && payload.success === "true" && !!payload.pendingId;
    pendingId = canPublish ? payload.pendingId : "";
    resultNote.textContent = payload.passwordRemoved
        ? "The password you used has been removed. Another line from your list will work after about five minutes."
        : "";
    resultTitle.textContent = canPublish ? "Ready to publish" : "Update";
    setActions(canPublish);
    goTo("result", "forward");
    if (canPublish && payload.person && payload.answer) applyImportedData(payload.person, payload.answer);
    await typeMessage(message);
    editorClose.disabled = !!pendingId;
}

async function submitEdit() {
    const drawn = pattern.slice();
    startWaiting();
    let payload = null;
    let failed = false;
    try {
        const response = await fetch(API_BASE + "/api/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sentence, password, pattern: drawn })
        });
        payload = await response.json();
        if (!response.ok || payload.success !== "true" && payload.success !== "false") {
            failed = payload.success !== "false";
            payload = {
                message: payload.message || payload.error || "The timetable could not be updated.",
                passwordRemoved: payload.passwordRemoved,
                success: payload.success
            };
        }
    } catch (error) {
        failed = true;
        payload = { message: "The timetable service could not be reached." };
    }
    await showOutcome(payload, failed || payload.success !== "true");
}

async function finishPending(action) {
    const buttons = [...resultActions.querySelectorAll("button")];
    buttons.forEach((button) => {
        button.disabled = true;
    });
    try {
        const response = await fetch(API_BASE + "/api/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, pendingId, action })
        });
        const payload = await response.json();
        if (!response.ok) {
            resultNote.textContent = payload.error || "That did not go through. You can try again.";
            buttons.forEach((button) => {
                button.disabled = false;
            });
            return;
        }
        pendingId = "";
        resultTitle.textContent = "Update";
        resultNote.textContent = "";
        setActions(false);
        editorClose.disabled = false;
        await typeMessage(payload.message || "Done.");
    } catch (error) {
        resultNote.textContent = "The timetable service could not be reached.";
        buttons.forEach((button) => {
            button.disabled = false;
        });
    }
}

function dragEditor(event) {
    if (event.target.closest("button")) return;
    const rect = editor.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    editor.style.transform = "none";
    function move(ev) {
        const maxX = window.innerWidth - editor.offsetWidth;
        const maxY = window.innerHeight - 48;
        const x = Math.min(Math.max(0, ev.clientX - offsetX), Math.max(0, maxX));
        const y = Math.min(Math.max(0, ev.clientY - offsetY), Math.max(0, maxY));
        editor.style.left = x + "px";
        editor.style.top = y + "px";
    }
    function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
}

buildDots();

document.getElementById("editBtn").addEventListener("click", openEditor);
editorClose.addEventListener("click", closeEditor);
editorBar.addEventListener("pointerdown", dragEditor);
sentenceInput.addEventListener("input", () => {
    sentenceNext.disabled = sentenceInput.value.trim().length === 0;
});
sentenceNext.addEventListener("click", () => {
    sentence = sentenceInput.value.trim();
    goTo("password", "forward");
    passwordInput.focus();
});
passwordInput.addEventListener("input", () => {
    passwordNext.disabled = passwordInput.value.length === 0;
});
document.getElementById("passwordBack").addEventListener("click", () => goTo("sentence", "back"));
passwordNext.addEventListener("click", () => {
    password = passwordInput.value;
    goTo("pattern", "forward");
});
document.getElementById("patternBack").addEventListener("click", () => goTo("password", "back"));
patternGrid.addEventListener("pointerdown", onPatternDown);
patternGrid.addEventListener("pointermove", onPatternMove);
patternGrid.addEventListener("pointerup", onPatternUp);
patternGrid.addEventListener("pointercancel", onPatternUp);
patternAccept.addEventListener("click", submitEdit);

function panelName() {
    return stage.querySelector(".panel.active")?.dataset.panel || "";
}

window.addEventListener("keydown", (event) => {
    if (editor.hidden) return;
    if (event.key === "Escape") {
        event.preventDefault();
        const name = panelName();
        if (name === "password") goTo("sentence", "back");
        else if (name === "pattern") goTo("password", "back");
        else if (name === "sentence" || (name === "result" && !editorClose.disabled)) closeEditor();
        return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    const name = panelName();
    if (name === "sentence" && !sentenceNext.disabled) {
        event.preventDefault();
        sentenceNext.click();
    } else if (name === "password" && !passwordNext.disabled) {
        event.preventDefault();
        passwordNext.click();
    } else if (name === "pattern" && !patternAccept.disabled) {
        event.preventDefault();
        patternAccept.click();
    }
});
