function bgRequest(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, res => {
            if (!res || !res.ok) reject();
            else resolve(res.data);
        });
    });
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getAllItems() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise(resolve => {
        store.getAll().onsuccess = e => resolve(e.target.result);
    });
}

/*  Rendering */

function groupByFileAndUrl(items) {
    const grouped = {};

    items.forEach(item => {
        const file = item.file || "Unfiled";
        const url = item.url || "Unknown";

        if (!grouped[file]) grouped[file] = {};
        if (!grouped[file][url]) grouped[file][url] = [];

        grouped[file][url].push(item);
    });

    return grouped;
}

function render(grouped) {
    const root = document.getElementById("notesRoot");
    root.innerHTML = "";

    Object.entries(grouped).forEach(([file, urls]) => {
        const fileHeader = document.createElement("h2");
        fileHeader.textContent = file;
        root.appendChild(fileHeader);

        Object.entries(urls).forEach(([url, items]) => {
            const urlHeader = document.createElement("h3");
            urlHeader.textContent = url;
            urlHeader.onclick = () => window.open(url, "_blank");
            root.appendChild(urlHeader);

            items
                .sort((a, b) => a.timestamp - b.timestamp)
                .forEach(item => {
                    const div = document.createElement("div");
                    div.className = `item ${item.type}`;
                    div.textContent = item.text;

                    const meta = document.createElement("div");
                    meta.className = "meta";
                    meta.textContent =
                        new Date(item.timestamp).toLocaleString();

                    div.appendChild(meta);
                    root.appendChild(div);
                });
        });
    });
}


(async function init() {
    const allItems = await getAllItems();
    const grouped = groupByFileAndUrl(allItems);
    render(grouped);
})();
