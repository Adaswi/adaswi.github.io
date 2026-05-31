const startHour = 6;
const endHour = 20;
const totalMinutes = (endHour - startHour) * 60;
const containerHeight = 840; // px for full day
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ===== PERSON DATA =====
let currentPerson = "adaswi";
let personData = {};
let evenWeekSchedule = {};
let oddWeekSchedule = {};
let customDays = {};
const startRange = new Date("2026-03-24");
const endRange = new Date("2026-06-28");

// ===== LOAD PERSON DATA FROM JSON =====
async function loadPersonData(personName) {
    try {
        const response = await fetch(`${personName}.json`);
        const data = await response.json();
        evenWeekSchedule = data.evenWeekSchedule || {};
        oddWeekSchedule = data.oddWeekSchedule || {};
        customDays = data.customDays || {};
        return true;
    } catch (error) {
        console.error(`Failed to load ${personName}.json:`, error);
        return false;
    }
}

function switchPerson(personName) {
    currentPerson = personName;
    
    // Update button states
    document.getElementById("adaswiBtn").classList.remove("active");
    document.getElementById("aleksBtn").classList.remove("active");
    document.getElementById(personName + "Btn").classList.add("active");
    
    // Reload schedule with new person's data
    loadPersonData(personName).then(() => {
        generateWeeks();
        loadSchedule();
    });
}

// ===== HELPERS =====
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function formatDate(d) {
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + yearStart.getUTCDay() + 1) / 7);
}

function getCurrentWeekValue() {
    const today = new Date();

    let current = getMonday(startRange);

    while (current <= endRange) {
        const monday = new Date(current);
        const sunday = new Date(current);
        sunday.setDate(sunday.getDate() + 6);

        if (today >= monday && today <= sunday) {
            return `${formatLocalDate(monday)}_${formatLocalDate(sunday)}`;
        }

        current.setDate(current.getDate() + 7);
    }

    return null;
}

// ===== GENERATE WEEKS =====
function generateWeeks() {
    const select = document.getElementById("weekSelect");
    select.innerHTML = "";
    let current = getMonday(startRange);
    while (current <= endRange) {
        const monday = new Date(current);
        const sunday = new Date(current);
        sunday.setDate(sunday.getDate() + 6);
        const option = document.createElement("option");
        option.value = `${formatLocalDate(monday)}_${formatLocalDate(sunday)}`;
        option.textContent = `${formatDate(monday)} - ${formatDate(sunday)}`;
        select.appendChild(option);
        current.setDate(current.getDate() + 7);
    }
}

// ===== LOAD SCHEDULE WITH CUSTOM DAYS =====
function loadSchedule() {
    const value = document.getElementById("weekSelect").value;
    if (!value) return;

    const [startStr] = value.split("_");
    const weekStart = new Date(startStr);
    const schedule = {};

    const weekNum = getWeekNumber(weekStart);
    const defaultSchedule = weekNum % 2 === 0 ? evenWeekSchedule : oddWeekSchedule;

    days.forEach((dayName, i) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + i);
        const dayKey = formatLocalDate(dayDate);

        if (customDays[dayKey]) {
            schedule[dayName] = customDays[dayKey];
        } else {
            schedule[dayName] = defaultSchedule[dayName] || [];
        }
    });

    renderSchedule(schedule);
}

// ===== TIME CALCULATION =====
function timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

// ===== RENDER TIMETABLE + SUMMARY =====
function renderSchedule(schedule) {
    const timeCol = document.getElementById("timeColumn");
    const daysCol = document.getElementById("daysContainer");
    timeCol.innerHTML = "";
    daysCol.innerHTML = "";

    const activityTotals = {}; // { "Math": totalMinutes }

    // full hours labels
    for (let h = startHour; h <= endHour; h++) {
        const label = document.createElement("div");
        label.className = "time-label";
        label.style.top = ((h - startHour) / (endHour - startHour)) * containerHeight + "px";
        label.textContent = `${String(h).padStart(2, "0")}:00`;
        timeCol.appendChild(label);
    }

    // day columns
    days.forEach(day => {
        const dayDiv = document.createElement("div");
        dayDiv.className = "day-column";
        dayDiv.style.height = containerHeight + "px";

        // hour lines
        for (let h = startHour; h <= endHour; h++) {
            const line = document.createElement("div");
            line.className = "hour-line";
            line.style.top = ((h - startHour) / (endHour - startHour)) * containerHeight + "px";
            dayDiv.appendChild(line);
        }

        // blocks
        const lessons = schedule[day] || [];
        lessons.forEach(lesson => {
            const startMin = timeToMinutes(lesson.start) - startHour * 60;
            const endMin = timeToMinutes(lesson.end) - startHour * 60;
            const durationMin = endMin - startMin;
            const topPx = startMin / totalMinutes * containerHeight;
            const heightPx = durationMin / totalMinutes * containerHeight;

            // accumulate weekly totals
            if (activityTotals[lesson.name]) activityTotals[lesson.name] += durationMin;
            else activityTotals[lesson.name] = durationMin;

            const block = document.createElement("div");
            block.className = "block";
            block.style.top = topPx + "px";
            block.style.height = heightPx + "px";
            block.style.backgroundColor = lesson.color || "#d1e7dd";
            const hoursStr = (durationMin / 60).toFixed(2) + "h";
            block.textContent = `${lesson.name} (${hoursStr})`;

            dayDiv.appendChild(block);
        });

        daysCol.appendChild(dayDiv);
    });

    // ===== Render Summary =====
    let summaryDiv = document.getElementById("summaryDiv");
    if (!summaryDiv) {
        summaryDiv = document.createElement("div");
        summaryDiv.id = "summaryDiv";
        summaryDiv.style.marginTop = "20px";
        document.body.appendChild(summaryDiv);
    }

    summaryDiv.innerHTML = "<h3>Weekly Activity Summary</h3>";
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "50%";
    const tbody = document.createElement("tbody");

    for (const [name, minutes] of Object.entries(activityTotals)) {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.textContent = name;
        tdName.style.border = "1px solid #ccc";
        tdName.style.padding = "4px";
        const tdHours = document.createElement("td");
        tdHours.textContent = (minutes / 60).toFixed(2) + " h";
        tdHours.style.border = "1px solid #ccc";
        tdHours.style.padding = "4px";
        tr.appendChild(tdName);
        tr.appendChild(tdHours);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    summaryDiv.appendChild(table);
}


// ===== INIT =====
window.addEventListener("DOMContentLoaded", async () => {
    // Load initial person data
    await loadPersonData(currentPerson);
    
    generateWeeks();
    const select = document.getElementById("weekSelect");

    const currentWeekValue = getCurrentWeekValue();
    if (currentWeekValue) {
        select.value = currentWeekValue;
    } else {
        select.selectedIndex = 0; // fallback if out of range
    }

    loadSchedule();
    select.addEventListener("change", loadSchedule);
    
    // Add event listeners for person buttons
    document.getElementById("adaswiBtn").addEventListener("click", () => switchPerson("adaswi"));
    document.getElementById("aleksBtn").addEventListener("click", () => switchPerson("aleks"));
});