// ---- tab navigation ----
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const tabsNav = document.getElementById("tabs");
const menuBtn = document.getElementById("menuBtn");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
    tabsNav.classList.remove("open");
  });
});

menuBtn.addEventListener("click", () => tabsNav.classList.toggle("open"));

// ---- paste / upload mode toggle ----
const modeBtns = document.querySelectorAll(".mode-btn");
const pasteMode = document.getElementById("pasteMode");
const uploadMode = document.getElementById("uploadMode");

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.mode === "paste") {
      pasteMode.classList.remove("hidden");
      uploadMode.classList.add("hidden");
    } else {
      uploadMode.classList.remove("hidden");
      pasteMode.classList.add("hidden");
    }
  });
});

// ---- upload ----
const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzoneText");
const fileInput = document.getElementById("fileInput");
let selectedFile = null;

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

["dragover", "dragenter"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("drag");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

function setFile(file) {
  if (!file.name.toLowerCase().endsWith(".lua")) {
    dropzoneText.textContent = "Only .lua files are supported — try again";
    return;
  }
  selectedFile = file;
  dropzoneText.textContent = `Selected: ${file.name}`;
}

// ---- run obfuscation ----
const runBtn = document.getElementById("runBtn");
const codeInput = document.getElementById("codeInput");
const presetSelect = document.getElementById("presetSelect");
const resultBox = document.getElementById("resultBox");
const resultStatus = document.getElementById("resultStatus");
const outputCode = document.getElementById("outputCode");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

let lastOutput = "";
let lastFilename = "obfuscated.lua";

runBtn.addEventListener("click", async () => {
  const isPasteMode = !pasteMode.classList.contains("hidden");
  const preset = presetSelect.value;

  if (isPasteMode) {
    const code = codeInput.value.trim();
    if (!code) return showError("Paste some Lua code first.");
    await runObfuscate({ code, preset });
  } else {
    if (!selectedFile) return showError("Choose a .lua file first.");
    await runObfuscateFile(selectedFile, preset);
  }
});

async function runObfuscate({ code, preset }) {
  setLoading(true);
  try {
    const res = await fetch("/api/obfuscate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, preset }),
    });
    const data = await res.json();
    handleResult(data, "pasted-code.lua");
  } catch (err) {
    showError("Could not reach the server. Try again.");
  }
  setLoading(false);
}

async function runObfuscateFile(file, preset) {
  setLoading(true);
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("preset", preset);
    const res = await fetch("/api/obfuscate-file", { method: "POST", body: form });
    const data = await res.json();
    handleResult(data, data.filename || file.name);
  } catch (err) {
    showError("Could not reach the server. Try again.");
  }
  setLoading(false);
}

function setLoading(loading) {
  runBtn.disabled = loading;
  runBtn.querySelector("svg").style.opacity = loading ? 0.4 : 1;
}

function handleResult(data, filename) {
  if (!data.ok) return showError(data.error || "Obfuscation failed.");
  lastOutput = data.output;
  lastFilename = filename;
  resultBox.classList.remove("hidden");
  resultStatus.textContent = "Done — output ready";
  outputCode.textContent = data.output;
  addHistory(filename);
}

function showError(msg) {
  resultBox.classList.remove("hidden");
  resultStatus.textContent = msg;
  outputCode.textContent = "";
}

copyBtn.addEventListener("click", () => {
  if (!lastOutput) return;
  navigator.clipboard.writeText(lastOutput);
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.innerHTML = copyBtnDefault), 1200);
});
const copyBtnDefault = copyBtn.innerHTML;

downloadBtn.addEventListener("click", () => {
  if (!lastOutput) return;
  const blob = new Blob([lastOutput], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = lastFilename;
  a.click();
  URL.revokeObjectURL(url);
});

// ---- history (localStorage, client-side only) ----
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const HISTORY_KEY = "sttar_history";

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function addHistory(filename) {
  const history = getHistory();
  history.unshift({ filename, time: new Date().toLocaleString(), preset: presetSelect.value });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = `<li class="empty" style="display:block;">No runs yet</li>`;
    return;
  }
  history.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.filename} · ${item.preset} · ${item.time}</span>`;
    historyList.appendChild(li);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderHistory();

// ---- API key demo ----
const genKeyBtn = document.getElementById("genKeyBtn");
const keyDisplay = document.getElementById("keyDisplay");
const keyValue = document.getElementById("keyValue");
const copyKeyBtn = document.getElementById("copyKeyBtn");

genKeyBtn.addEventListener("click", async () => {
  genKeyBtn.disabled = true;
  try {
    const res = await fetch("/api/keys", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      keyValue.textContent = data.key;
      keyDisplay.classList.remove("hidden");
    }
  } catch {
    /* silent */
  }
  genKeyBtn.disabled = false;
});

copyKeyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(keyValue.textContent);
  copyKeyBtn.textContent = "Copied";
  setTimeout(() => (copyKeyBtn.textContent = "Copy"), 1200);
});
