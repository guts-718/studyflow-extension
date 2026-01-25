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

// function openDB() {
//     return new Promise((resolve, reject) => {
//         const req = indexedDB.open(DB_NAME, DB_VERSION);

//         req.onupgradeneeded = () => {
//             const db = req.result;

//             if (!db.objectStoreNames.contains(STORE_NAME)) {
//                 db.createObjectStore(STORE_NAME, { keyPath: "id" });
//             }

//             if (!db.objectStoreNames.contains("files")) {
//                 db.createObjectStore("files", { keyPath: "name" });
//             }
//         };

//         req.onsuccess = () => resolve(req.result);
//         req.onerror = () => reject(req.error);
//     });
// }

function bgRequest(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, res => {
            if (!res || !res.ok) reject();
            else resolve(res.data);
        });
    });
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


async function initNotes() {
    const urlDisplay = document.getElementById("urlDisplay");
    const noteInput = document.getElementById("noteInput");
    const fileInput = document.getElementById("fileInput");
    const saveButton = document.getElementById("saveButton");
    const clearButton = document.getElementById("clearButton");
    const allNotesButton = document.getElementById("allNotesButton");

    // 1️⃣ Get current tab URL
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const pageUrl = tab.url;
    urlDisplay.textContent = pageUrl;

    // 2️⃣ Load active file for this URL
    const { activeFileByUrl = {} } =
        await chrome.storage.local.get("activeFileByUrl");

    const existingFile = activeFileByUrl[pageUrl];
    if (existingFile) {
        fileInput.value = existingFile;
    }

    // 3️⃣ Load existing note from BACKGROUND DB
    if (existingFile) {
        const notes = await bgRequest({
            type: "GET_NOTES_FOR_URL_FILE",
            url: pageUrl,
            file: existingFile
        });

        if (notes.length > 0) {
            noteInput.value = notes[0].content;
        }
    }

    // 4️⃣ Save / Update note
    saveButton.onclick = async () => {
        const file = fileInput.value.trim();
        const text = noteInput.value.trim();

        if (!file) {
            alert("Please enter a file name");
            return;
        }

        // remember file selection
        activeFileByUrl[pageUrl] = file;
        await chrome.storage.local.set({ activeFileByUrl });

        const note = {
            id: crypto.randomUUID(),
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
    };

    // 5️⃣ Clear note
    clearButton.onclick = async () => {
        const file = fileInput.value.trim();
        if (!file) return;

        await bgRequest({
            type: "DELETE_NOTES_FOR_URL_FILE",
            url: pageUrl,
            file
        });

        noteInput.value = "";
    };

    // 6️⃣ Open All Notes page
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


// chrome.storage.local.set({ token: "user-123" });
// in extension console do - chrome.storage.local.get(null, console.log);
// tokens should be extension scoped so that other websites cant access them
// 



// async function getNotesForUrlAndFile(url, file) {
//     const db = await openDB();
//     const tx = db.transaction(STORE_NAME, "readonly");
//     const store = tx.objectStore(STORE_NAME);

//     return new Promise(resolve => {
//         store.getAll().onsuccess = (e) => {
//             const notes = e.target.result.filter(
//                 item =>
//                     item.type === "note" &&
//                     item.url === url &&
//                     item.file === file
//             );

//             // return most recent note (if any)
//             if (!notes.length) return resolve(null);

//             notes.sort((a, b) => b.timestamp - a.timestamp);
//             resolve(notes[0]);
//         };
//     });
// }