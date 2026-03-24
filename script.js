const startHour = 6;
const endHour = 20;
const totalMinutes = (endHour - startHour) * 60;
const containerHeight = 840; // px for full day
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ===== DEFAULT EVEN / ODD WEEK SCHEDULE =====
const evenWeekSchedule = {
    "Monday": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "Tuesday": [
        { start: "07:30", end: "13:30", name: "Work", color: "#acf5a6" },
        { start: "14:00", end: "17:00", name: "School", color: "#f27168" },
    ],
    "Wednesday": [
        { start: "07:30", end: "10:30", name: "Work", color: "#acf5a6" },
        { start: "11:00", end: "18:00", name: "School", color: "#f27168" },
    ],
    "Thursday": [
        { start: "06:00", end: "09:00", name: "Work", color: "#acf5a6" },
        { start: "9:30", end: "18:00", name: "School", color: "#f27168" },
    ],
    "Friday": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
};

const oddWeekSchedule = {
    "Monday": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "Tuesday": [
        { start: "07:30", end: "13:30", name: "Work", color: "#acf5a6" },
        { start: "14:00", end: "19:00", name: "School", color: "#f27168" },
    ],
    "Wednesday": [
        { start: "09:00", end: "18:00", name: "School", color: "#f27168" },
    ],
    "Thursday": [
        { start: "06:00", end: "09:00", name: "Work", color: "#acf5a6" },
        { start: "9:30", end: "16:00", name: "School", color: "#f27168" },
    ],
    "Friday": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
};

// ===== CUSTOM DAYS =====
// Override only these specific dates
const customDays = {
    "2026-03-23": [],
    "2026-03-27": [
        { start: "07:30", end: "13:30", name: "Work", color: "#acf5a6" },
        { start: "14:00", end: "19:00", name: "School", color: "#f27168" },
    ],
    "2026-04-03": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "2026-04-06": [],
    "2026-04-07": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "2026-04-10": [
        { start: "09:00", end: "18:00", name: "School", color: "#f27168" },
    ],
    "2026-04-24": [
        { start: "06:00", end: "09:00", name: "Work", color: "#acf5a6" },
        { start: "9:30", end: "16:00", name: "School", color: "#f27168" },
    ],
    "2026-05-01": [],
    "2026-05-08": [
        { start: "07:30", end: "13:30", name: "Work", color: "#acf5a6" },
        { start: "14:00", end: "17:00", name: "School", color: "#f27168" },
    ],
    "2026-05-13": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "2026-05-15": [
        { start: "07:30", end: "10:30", name: "Work", color: "#acf5a6" },
        { start: "11:00", end: "18:00", name: "School", color: "#f27168" },
    ],
    "2026-05-25": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "2026-05-29": [
        { start: "06:00", end: "09:00", name: "Work", color: "#acf5a6" },
        { start: "9:30", end: "18:00", name: "School", color: "#f27168" },
    ],
    "2026-06-04": [],
    "2026-06-05": [
        { start: "07:30", end: "16:30", name: "Work", color: "#acf5a6" },
    ],
    "2026-06-19": [
    ],
};

const startRange = new Date("2026-03-24");
const endRange = new Date("2026-06-28");

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
window.addEventListener("DOMContentLoaded", () => {
    generateWeeks();
    const select = document.getElementById("weekSelect");
    select.selectedIndex = 0;
    loadSchedule();
    select.addEventListener("change", loadSchedule);
});