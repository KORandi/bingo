"use strict";

const TICKET_COUNT = 6;
const STORAGE_KEY = "bingo-tracker-v1";

// --- state -----------------------------------------------------------------

// A ticket is {name, rows: 3 arrays of 9 cells, each a number or null}.
// Slots without a ticket yet are null.
const defaultState = () => ({
  tickets: [
    makeTicket("Ticket 1", [
      [2, 35, 43, 76, 85],
      [7, 11, 20, 44, 69],
      [15, 25, 36, 57, 77],
    ]),
    makeTicket("Ticket 2", [
      [1, 33, 47, 61, 71],
      [4, 14, 53, 66, 74],
      [9, 22, 37, 59, 90],
    ]),
    null, null, null, null,
  ],
  calls: [],
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tickets) && Array.isArray(parsed.calls)) {
        parsed.tickets.length = TICKET_COUNT;
        return parsed;
      }
    }
  } catch { /* corrupted storage: fall through to defaults */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- ticket construction ----------------------------------------------------

function columnFor(n) {
  return Math.min(8, Math.floor(n / 10)); // 1–9 → 0, 10–19 → 1, … 80–90 → 8
}

// Turns 3 rows of 5 numbers into a 3×9 grid, or throws with a message.
function buildRows(rowNumbers) {
  const seen = new Set();
  return rowNumbers.map((nums, r) => {
    if (nums.length !== 5) {
      throw new Error(`Row ${r + 1} needs exactly 5 numbers (got ${nums.length}).`);
    }
    const row = Array(9).fill(null);
    for (const n of nums) {
      if (!Number.isInteger(n) || n < 1 || n > 90) {
        throw new Error(`Row ${r + 1}: "${n}" is not a number from 1–90.`);
      }
      if (seen.has(n)) {
        throw new Error(`${n} appears twice on this ticket.`);
      }
      seen.add(n);
      const c = columnFor(n);
      if (row[c] !== null) {
        throw new Error(`Row ${r + 1}: ${row[c]} and ${n} are in the same column (${c * 10 || 1}–${c === 8 ? 90 : c * 10 + 9}).`);
      }
      row[c] = n;
    }
    return row;
  });
}

function makeTicket(name, rowNumbers) {
  return { name, rows: buildRows(rowNumbers) };
}

// --- derived ----------------------------------------------------------------

function ticketStatus(ticket, called) {
  const rowMarks = ticket.rows.map(
    (row) => row.filter((n) => n !== null && called.has(n)).length
  );
  const lines = rowMarks.filter((m) => m === 5).length;
  const totalMarked = rowMarks.reduce((a, b) => a + b, 0);
  const bestRowNeed = Math.min(...rowMarks.map((m) => 5 - m));
  return { rowMarks, lines, totalMarked, bestRowNeed, fullHouse: totalMarked === 15 };
}

// --- rendering ----------------------------------------------------------------

const ticketsEl = document.getElementById("tickets");
const boardEl = document.getElementById("board");
const historyEl = document.getElementById("history");
const lastCallEl = document.getElementById("last-call");

function render(justCalled = null) {
  const called = new Set(state.calls);
  renderTickets(called, justCalled);
  renderBoard(called);
  renderHistory();
  saveState();
}

function renderTickets(called, justCalled) {
  ticketsEl.replaceChildren();
  state.tickets.forEach((ticket, i) => {
    if (!ticket) {
      const empty = document.createElement("button");
      empty.className = "ticket empty";
      empty.textContent = `＋ Add ticket ${i + 1}`;
      empty.addEventListener("click", () => openEditor(i));
      ticketsEl.append(empty);
      return;
    }

    const s = ticketStatus(ticket, called);
    const el = document.createElement("article");
    el.className = "ticket" + (s.fullHouse ? " full-house" : "");

    const head = document.createElement("div");
    head.className = "ticket-head";
    const title = document.createElement("h2");
    title.textContent = ticket.name;
    const status = document.createElement("span");
    status.className = "status" + (s.lines > 0 ? " win" : "");
    status.textContent = s.fullHouse
      ? "🎉 FULL HOUSE"
      : s.lines === 2
        ? "✔ two lines"
        : s.lines === 1
          ? "✔ line"
          : `${s.bestRowNeed} to a line`;
    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openEditor(i));
    head.append(title, status, edit);

    const grid = document.createElement("div");
    grid.className = "grid";
    for (const row of ticket.rows) {
      for (const n of row) {
        const cell = document.createElement("div");
        if (n === null) {
          cell.className = "cell blank";
        } else {
          cell.className = "cell" + (called.has(n) ? " marked" : "");
          if (n === justCalled) cell.className += " just-marked";
          cell.textContent = n;
        }
        grid.append(cell);
      }
    }

    const rowStatus = document.createElement("div");
    rowStatus.className = "row-status";
    s.rowMarks.forEach((m, r) => {
      const span = document.createElement("span");
      span.textContent = `row ${r + 1}: ${m}/5`;
      if (m === 5) span.className = "line";
      rowStatus.append(span);
    });

    el.append(head, grid, rowStatus);
    ticketsEl.append(el);
  });
}

function renderBoard(called) {
  boardEl.replaceChildren();
  for (let n = 1; n <= 90; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = n;
    if (called.has(n)) btn.className = "called";
    btn.addEventListener("click", () => toggleCall(n));
    boardEl.append(btn);
  }
}

function renderHistory() {
  historyEl.replaceChildren();
  for (const n of state.calls) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = n;
    historyEl.append(chip);
  }
  const last = state.calls[state.calls.length - 1];
  lastCallEl.hidden = last === undefined;
  if (last !== undefined) {
    lastCallEl.innerHTML = "";
    lastCallEl.append("Last call: ");
    const strong = document.createElement("strong");
    strong.textContent = last;
    lastCallEl.append(strong, ` · ${state.calls.length} called`);
  }
}

// --- actions ----------------------------------------------------------------

function addCall(n) {
  if (state.calls.includes(n)) return;
  state.calls.push(n);
  render(n);
}

function toggleCall(n) {
  const i = state.calls.indexOf(n);
  if (i === -1) {
    addCall(n);
  } else {
    state.calls.splice(i, 1);
    render();
  }
}

document.getElementById("call-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("call-input");
  const n = Number(input.value);
  if (Number.isInteger(n) && n >= 1 && n <= 90) {
    addCall(n);
    input.value = "";
  }
  input.focus();
});

document.getElementById("undo-btn").addEventListener("click", () => {
  state.calls.pop();
  render();
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (state.calls.length === 0 || confirm("Clear all called numbers and start a new game? Tickets are kept.")) {
    state.calls = [];
    render();
  }
});

// --- ticket editor ------------------------------------------------------------

const editor = document.getElementById("editor");
const editorError = document.getElementById("editor-error");
let editingIndex = null;

function openEditor(index) {
  editingIndex = index;
  const ticket = state.tickets[index];
  document.getElementById("editor-title").textContent = ticket
    ? `Edit ${ticket.name}`
    : `Add ticket ${index + 1}`;
  document.getElementById("editor-name").value = ticket ? ticket.name : `Ticket ${index + 1}`;
  for (let r = 0; r < 3; r++) {
    document.getElementById(`editor-row-${r}`).value = ticket
      ? ticket.rows[r].filter((n) => n !== null).join(" ")
      : "";
  }
  editorError.textContent = "";
  editor.showModal();
}

document.getElementById("editor-cancel").addEventListener("click", () => editor.close());

document.getElementById("editor-form").addEventListener("submit", (e) => {
  const rows = [0, 1, 2].map((r) =>
    document
      .getElementById(`editor-row-${r}`)
      .value.trim()
      .split(/[\s,;.]+/)
      .filter(Boolean)
      .map(Number)
  );
  try {
    const name = document.getElementById("editor-name").value.trim() || `Ticket ${editingIndex + 1}`;
    state.tickets[editingIndex] = makeTicket(name, rows);
  } catch (err) {
    e.preventDefault();
    editorError.textContent = err.message;
    return;
  }
  render();
});

// --- init -------------------------------------------------------------------

render();
