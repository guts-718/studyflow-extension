// window.getSelection().toString().trim()
// window.getSelection().getRangeAt(0)
// window.getSelection().getRangeAt(0).getBoundingClientRect()


let toolbar;
let activeFile = null;
let savedRange = null;

const existingFiles = [
  "Biology – Cell Division",
  "DSA – Trees",
  "OS – Deadlocks"
];



const DB_NAME="study_highlighter_db";
const DB_VERSION=1;
const STORE_NAME="Highlights";

function openDB(){
    return new Promise((resolve, reject)=>{
        const req = indexedDB.open(DB_NAME,DB_VERSION);

        req.onupgradeneeded = () => {
            const db = req.result;
            if(!db.objectStoreNames.contains(STORE_NAME)){
                db.createObjectStore(STORE_NAME, {keyPath: "id"})
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    })
}

async function persistHighlight(data){
    const db=await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store=tx.objectStore(STORE_NAME);

    store.put(data);
}
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


function showToolbar(rect, text) {
    console.log("just inside the main function:", text);

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
        { name: "red", color: "#ff4d4d" },
        { name: "orange", color: "#ffa500" },
        { name: "yellow", color: "#ffd700" }
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
            const colorMap = {
                red: "#ffcccc",
                orange: "#ffe0b3",
                yellow: "#fff3b0"
            };

            if(!activeFile){
                showFileChooser((fileName) => {
                            activeFile = fileName;
                            applyHighlight(colorMap[c.name]);
                            console.log("FILE:", activeFile);
                            console.log("TEXT:", text);
                            console.log("COLOR:", c.name);
                            removeToolbar();
                        });
                
                const highlightData = {
                    id: crypto.randomUUID(),
                    userId: "dev-user", // temporary
                    file: activeFile,
                    text,
                    color: c.name,
                    url: location.href,
                    timestamp: Date.now(),
                    clientId: crypto.randomUUID(),
                    syncStatus: "pending"
                };

                persistHighlight(highlightData);

            }else{
                applyHighlight(colorMap[c.name]);
                console.log("FILE:", activeFile);
                console.log("TEXT:", text);
                console.log("COLOR:", c.name);
                removeToolbar();
            }
            // alert("button clicked");
            // console.log("highlighted text:", text);
            // console.log("color:", c.name);
            // removeToolbar();
        };

        toolbar.appendChild(btn);
    });



    document.body.appendChild(toolbar);
}


async function syncToCloud() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    store.getAll().onsuccess = async (e) => {
        const pending = e.target.result.filter(
            h => h.syncStatus === "pending"
        );

        if (!pending.length) return;

        const res = await fetch("http://localhost:4109/sync/highlights", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ highlights: pending })
        });

        if (res.ok) {
            markAsSynced(pending);
            console.log("Synced to MongoDB");
        }
    };
}


function saveHighlight(text, color) {
    console.log("FILE:", activeFile);
    console.log("TEXT:", text);
    console.log("COLOR:", color);
    removeToolbar();
}


function showFileChooser(onSelect){
    const overlay=document.createElement("div");
    overlay.style.position="fixed";
    overlay.style.top=0;
    overlay.style.left=0;
    overlay.style.height="100%";
    overlay.style.width="100%";
    overlay.style.background="rgba(0,0,0,0.4)";
    overlay.style.zIndex="99999";

    const modal=document.createElement("div");
    modal.style.background="#fff";
    modal.style.padding="16px";
    modal.style.borderRadius="8px";
    modal.style.width="300px";
    modal.style.margin="20vh auto";
    modal.style.display="flex";
    modal.style.flexDirection="column";
    modal.style.gap="8px";

    const input=document.createElement("input");
    input.placeholder="Create new file....";
    input.style.padding="6px";

    const select = document.createElement("select");
    select.style.padding = "6px";

    const defaultOpt=document.createElement("option");
    defaultOpt.value="";
    defaultOpt.textContent="Select existing file";
    select.appendChild(defaultOpt);

    existingFiles.forEach(f=>{
        const opt=document.createElement("option");
        opt.value=f;
        opt.textContent=f;
        select.appendChild(opt);
    })

    const btn=document.createElement("button");
    btn.textContent="Confirm";
    
    btn.onclick=()=>{
        const value=input.value.trim() || select.value;
        if(!value) return alert("Select or enter a file name");

        overlay.remove();
        onSelect(value);

    }

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


window.addEventListener("load", async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    store.getAll().onsuccess = (e) => {
        const highlights = e.target.result;

        highlights
            .filter(h => h.url === location.href)
            .forEach(h => {
                reapplyHighlight(h);
            });
    };
});

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


syncToCloud();
window.addEventListener("online", syncToCloud);


/*
window.getSelection().getRangeAt(0)
Range {commonAncestorContainer: text, startContainer: text, startOffset: 2, endContainer: text, endOffset: 24, …}collapsed: falsecommonAncestorContainer: textendContainer: textendOffset: 24startContainer: textstartOffset: 2[[Prototype]]: Range


window.getSelection().getRangeAt(0).getBoundingClientRect()
DOMRect {x: 37.11277389526367, y: 155.7540740966797, width: 125.3125, height: 15.652175903320312, top: 155.7540740966797, …}bottom: 171.40625height: 15.652175903320312left: 37.11277389526367right: 162.42527389526367top: 155.7540740966797width: 125.3125x: 37.11277389526367y: 155.7540740966797[[Prototype]]: DOMRect
*/