const PORT=4109
const API_BASE = `http://localhost:${PORT}`;

document.addEventListener("DOMContentLoaded", async () => {
    const { accessToken } = await chrome.storage.local.get("accessToken");

    if (accessToken) {
        
        showNotesUI();
        initNotes();
        
    } else {
        showAuthUI();
        initAuth();
    }
});

async function loadFileOptions() {
  const files = await bgRequest({ type: "GET_FILES" });
  const list = document.getElementById("fileOptions");

  list.innerHTML = "";

  files.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    list.appendChild(opt);
  });
}



function bgRequest(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, res => {
            if (!res || !res.ok) reject();
            else resolve(res.data);
        });
    });
}


function formatPageTitle(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // Google search
    if (host.includes("google.") && u.searchParams.get("q")) {
      return `${host} — search: ${u.searchParams.get("q")}`;
    }

    // Wikipedia
    if (host.includes("wikipedia.org")) {
      const title = u.pathname.split("/").pop().replace(/_/g, " ");
      return `${host} — ${decodeURIComponent(title)}`;
    }

    // Default
    return host;
  } catch {
    return url;
  }
}


function initAuth() {
    const submitBtn = document.getElementById("submitBtn");

    submitBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const status = document.getElementById("status");

        if (!email || !password) {
            status.textContent = "Email and password required";
            return;
        }

        status.textContent = "Please wait...";

        try {
            const deviceId = await getOrCreateDeviceId();
            const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";

            const res = await fetch(`http://localhost:4109${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, deviceId })
            });

            if (!res.ok) {
                status.textContent =
                    mode === "signup"
                        ? "Unable to create account"
                        : "Invalid email or password";
                return;
            }
            const data = await res.json();

            await chrome.runtime.sendMessage({
                type: "SET_AUTH",
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            });


            // Switch UI instead of closing popup
            showNotesUI();
            initNotes();

        } catch (e) {
            console.error(e);
            status.textContent = "Something went wrong";
        }
    });
}

function getActiveTab() {
    return new Promise(resolve => {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            tabs => resolve(tabs[0])
        );
    });
}



async function initNotes() {
    const urlDisplay = document.getElementById("urlDisplay");
    const noteInput = document.getElementById("noteInput");
    const fileInput = document.getElementById("fileInput");
    const saveButton = document.getElementById("saveButton");
    const clearButton = document.getElementById("clearButton");
    const allNotesButton = document.getElementById("allNotesButton");

    // 1️ Get active tab
    await loadFileOptions();

    const tab = await getActiveTab().then((x)=>x.url)
    //console.log("tab:", tab);

    if (!tab) {
        console.error("Could not get active tab");
        return;
    }

    const pageUrl = tab;
    //console.log("pageUrl:", pageUrl);
    urlDisplay.textContent = formatPageTitle(pageUrl);

    // 2️ Load activeFileByUrl
    const result = await new Promise(resolve => {
        chrome.storage.local.get("activeFileByUrl", resolve);
    });

    const activeFileByUrl = result.activeFileByUrl || {};

    const existingFile = activeFileByUrl[pageUrl];
    if (existingFile) {
        fileInput.value = existingFile;   //  correct
    }
    let existingNodeId=null;
    // 3️ Load existing note
    if (existingFile) {
        const notes = await bgRequest({
            type: "GET_NOTES_FOR_URL_FILE",
            url: pageUrl,
            file: existingFile
        });
       // console.log("notes for this url file....", notes);

        // need to handle below thing since space is limited populating doesn't make much sense
        if (notes) {
            noteInput.value = notes.text;
            existingNodeId = notes.id;
        }
    }

    // 4️ Save note
    saveButton.onclick = async () => {
        const file = fileInput.value.trim();
        const text = noteInput.value.trim();

        if (!file) {
            alert("Please enter a file name");
            return;
        }

        activeFileByUrl[pageUrl] = file;
        await chrome.storage.local.set({ activeFileByUrl });

        const note = {
            id: existingNodeId || crypto.randomUUID(),
            clientId: crypto.randomUUID(),
            type: "note",
            file,
            url: pageUrl,
            text,
            timestamp: Date.now(),
            syncStatus: "pending"
        };

        await bgRequest({
            type: "SAVE_ITEM",
            data: note
        });

        console.log("Note saved:", note);
        window.close();
    };

    // 5️ Clear note
    clearButton.onclick = async () => {
        noteInput.value = "";
        const file = fileInput.value.trim();
        if (!file) return;


        await bgRequest({
            type: "DELETE_NOTES_FOR_URL_FILE",
            url: pageUrl,
            file
        });

        
    };

    // 6 Open all notes
    allNotesButton.onclick = () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL("notes.html")
        });
    };
}

function showAuthUI() {
    document.getElementById("authContainer").style.display = "block";
    document.getElementById("notesContainer").style.display = "none";
}

function showNotesUI() {
    document.getElementById("authContainer").style.display = "none";
    document.getElementById("notesContainer").style.display = "block";
}


async function getOrCreateDeviceId() {
    const res = await chrome.storage.local.get("deviceId");
    if (res.deviceId) return res.deviceId;

    const deviceId = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId });
    return deviceId;
}
