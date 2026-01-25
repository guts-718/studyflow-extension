// window.getSelection().toString().trim()
// window.getSelection().getRangeAt(0)
// window.getSelection().getRangeAt(0).getBoundingClientRect()

// importScripts("db.js"); // MV3-compatible

let toolbar;
let activeFile = null;
let activePage = location.href;
let savedRange = null;
const PORT=4109;
const existingFiles = [
  "Biology – Cell Division",
  "DSA – Trees",
  "OS – Deadlocks"
];

window.addEventListener("online", syncToCloud);

/*
old - chrome.storage.local.get("token", callback);
new promised based - await chrome.storage.local.get("token");
console.log("chrome is", chrome);
console.log("chrome.storage is", chrome.storage);

Promise-based works ONLY if:

Manifest V3

Chrome ≥ certain version

Correct execution context

openDB, store_name and indexed db should all be here in content.js

*/
function getToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get("token", (res) => {
            resolve(res.token);
        });
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






async function loadFileNames() {
    try {
        const files = await bgRequest({
            type: "GET_FILES"
        });

        if (files && files.length) {
            return files;
        }
    } catch (e) {
        console.warn("Failed to load files:", e);
    }

    // last-resort fallback
    return ["Biology", "DSA", "OS"];
}



// window.addEventListener("load", () => {
//     hydrateIndexedDBFromCloud();
//     syncToCloud();
// });


document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) return;

    savedRange = selection.getRangeAt(0).cloneRange();
    const rect = savedRange.getBoundingClientRect();

    showToolbar(rect, selectedText);
});


function applyHighlight(color) {
    if (!savedRange) return;

    try {
        const span = document.createElement("span");
        span.style.backgroundColor = color;
        span.style.padding = "2px 0";
        span.style.borderRadius = "3px";

        savedRange.surroundContents(span);
    } catch (e) {
        console.warn("Cannot highlight this selection", e);
        alert("This selection cannot be highlighted yet.");
    }

    savedRange = null;
}
// async function saveFileLocally(fileName) {
//     const db = await openDB();
//     const tx = db.transaction("files", "readwrite");
//     tx.objectStore("files").put({ name: fileName });
// }


function showToolbar(rect, text) {
    removeToolbar();

    toolbar = document.createElement("div");
    toolbar.style.position = "absolute";
    toolbar.style.top = `${window.scrollY + rect.top - 40}px`;
    toolbar.style.left = `${window.scrollX + rect.left}px`;
    toolbar.style.background = "#222";
    toolbar.style.padding = "6px";
    toolbar.style.borderRadius = "6px";
    toolbar.style.display = "flex";
    toolbar.style.gap = "6px";
    toolbar.style.zIndex = "555555";

    const colors = [
        { name: "red", color: "#ff4d4d", bg: "#ffcccc" },
        { name: "orange", color: "#ffa500", bg: "#ffe0b3" },
        { name: "yellow", color: "#ffd700", bg: "#fff3b0" }
    ];

    colors.forEach(c => {
        const btn = document.createElement("button");
        btn.style.width = "20px";
        btn.style.height = "20px";
        btn.style.borderRadius = "50%";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.background = c.color;

        btn.onclick = () => {
            // First highlight on this page adn then ask for file
            if (!activeFile) {
                showFileChooser((fileName) => {
                    activeFile = fileName;
                    saveFileLocally(fileName);

                    applyHighlight(c.bg);
                    removeToolbar();
                    saveAndSync(text, c.name);
                });
                return;
            }

            // Subsequent highlights on same page
            applyHighlight(c.bg);
            removeToolbar();
            saveAndSync(text, c.name);
        };

        toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);
}


async function saveAndSync(text, color) {
    if (!activeFile) {
        console.warn("saveAndSync called without activeFile");
        return;
    }

    const highlightData = {
        id: crypto.randomUUID(),
        clientId: crypto.randomUUID(),
        type: "highlight",
        file: activeFile,
        url: location.href,
        text,
        color,
        timestamp: Date.now(),
        syncStatus: "pending"
    };

    try {
        await bgRequest({
            type: "SAVE_ITEM",
            data: highlightData
        });

        console.log("Highlight saved:", highlightData);
    } catch (err) {
        console.error("Failed to save highlight", err);
    }
}





   
async function hydrateIndexedDBFromCloud() {
    if (!navigator.onLine) return;

    try {
        const cloudHighlights = await authFetch(
            `http://localhost:${PORT}/highlights`
        );

        if (!Array.isArray(cloudHighlights)) return;

        for (const h of cloudHighlights) {
            const exists = await highlightExists(h.clientId);
            if (!exists) {
                await persistHighlight({
                    id: crypto.randomUUID(),
                    userId: h.userId,
                    type: h.type,
                    file: h.file,
                    text: h.text,
                    color: h.color,
                    url: h.url,
                    timestamp: h.timestamp,
                    clientId: h.clientId,
                    syncStatus: "synced"
                });
            }
        }

        console.log("Hydration complete");
    } catch (err) {
        console.warn("Hydration failed:", err);
    }
}


function saveHighlight(text, color) {
    console.log("FILE:", activeFile);
    console.log("TEXT:", text);
    console.log("COLOR:", color);
    removeToolbar();
}

async function showFileChooser(onSelect) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.height = "100%";
    overlay.style.width = "100%";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.zIndex = "99999";

    const modal = document.createElement("div");
    modal.style.background = "#fff";
    modal.style.padding = "16px";
    modal.style.borderRadius = "8px";
    modal.style.width = "300px";
    modal.style.margin = "20vh auto";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.gap = "8px";

    const input = document.createElement("input");
    input.placeholder = "Create new file...";
    input.style.padding = "6px";

    const select = document.createElement("select");
    select.style.padding = "6px";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select existing file";
    select.appendChild(defaultOpt);

    
    const files = await loadFileNames();

    files.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
    });
   

    const btn = document.createElement("button");
    btn.textContent = "Confirm";

    btn.onclick = () => {
        const newFile = input.value.trim();
        const existingFile = select.value;
        
        const finalValue = newFile || (existingFile !== "" ? existingFile : null);

        if (!finalValue) {
            alert("Select or enter a file name");
            return;
        }

        overlay.remove();
        onSelect(finalValue);
    };

    modal.append(input, select, btn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}




function removeToolbar() {
    if (toolbar) {
        toolbar.remove();
        toolbar = null;
    }
}


// window.addEventListener("load", async () => {
//     const db = await openDB();
//     const tx = db.transaction(STORE_NAME, "readonly");
//     const store = tx.objectStore(STORE_NAME);

//     store.getAll().onsuccess = (e) => {
//         const highlights = e.target.result;

//         highlights
//             .filter(h => h.url === location.href)
//             .forEach(h => {
//                 reapplyHighlight(h);
//             });
//     };
// });

function reapplyHighlight(h){
    const bodyText = document.body.innerHTML;
    if(!bodyText.includes(h.text))return;

    document.body.innerHTML = document.body.innerHTML.replace(
        h.text, `<span style="background-color:${colorMap(h.color)};padding:2px;border-radius:3px;">${h.text}</span>`
    )

    function colorMap(color){
        return {
            red: "#ffcccc",
            orange: "#ffe0b3",
            yellow: "#fff3b0"
        }[color];
    }
}

// function authFetch(url, options = {}) {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(
//             { type: "AUTH_FETCH", url, options },
//             (res) => {
//                 if (!res || !res.ok) reject(res?.error);
//                 else resolve(res.data);
//             }
//         );
//     });
// }

// async function getToken(){
//     return await new Promise(resolve => { 
//     chrome.storage.local.get("accessToken",
//          res => resolve(res.accessToken)
//      ); 
// });
//}

//// const token =  getToken();

// syncToCloud(token);



/*
window.getSelection().getRangeAt(0)
Range {commonAncestorContainer: text, startContainer: text, startOffset: 2, endContainer: text, endOffset: 24, …}collapsed: falsecommonAncestorContainer: textendContainer: textendOffset: 24startContainer: textstartOffset: 2[[Prototype]]: Range


window.getSelection().getRangeAt(0).getBoundingClientRect()
DOMRect {x: 37.11277389526367, y: 155.7540740966797, width: 125.3125, height: 15.652175903320312, top: 155.7540740966797, …}bottom: 171.40625height: 15.652175903320312left: 37.11277389526367right: 162.42527389526367top: 155.7540740966797width: 125.3125x: 37.11277389526367y: 155.7540740966797[[Prototype]]: DOMRect
*/