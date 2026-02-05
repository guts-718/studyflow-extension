const DB_NAME="study_highlighter_db";
const DB_VERSION = 4;
const STORE_NAME = "items";


function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
            const db = req.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains("files")) {
                db.createObjectStore("files", { keyPath: "name" });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}



async function persistNote(note) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put(note);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}


async function getNotesForUrlAndFile(url, file) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise(resolve => {
        store.getAll().onsuccess = (e) => {
            const notes = e.target.result.filter(
                item =>
                    item.type === "note" &&
                    item.url === url &&
                    item.file === file
            );

            // return most recent note (if any)
            if (!notes.length) return resolve(null);

            notes.sort((a, b) => b.timestamp - a.timestamp);
            resolve(notes[0]);
        };
    });
}


async function deleteNotesForUrlAndFile(url, file) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.getAll().onsuccess = (e) => {
        e.target.result.forEach(item => {
            if (
                item.type === "note" &&
                item.url === url &&
                item.file === file
            ) {
                store.delete(item.id);
            }
        });
    };

    return new Promise(resolve => {
        tx.oncomplete = () => resolve();
    });
}


async function getAllNotes() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise(resolve => {
        store.getAll().onsuccess = (e) => {
            resolve(
                e.target.result.filter(item => item.type === "note")
            );
        };
    });
}



async function persistHighlight(data){
    const db=await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store=tx.objectStore(STORE_NAME);

    store.put(data);
}
async function markAsSynced(highlights) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    highlights.forEach(h => {
        h.syncStatus = "synced";
        store.put(h);
    });
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

        try {
            await authFetch(`http://localhost:${PORT}/sync/highlights`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ highlights: pending })
            });

            await markAsSynced(pending);
            console.log("Cloud sync successful");
        } catch (err) {
            console.warn("Sync failed:", err);
        }
    };
}




function authFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: "AUTH_FETCH", url, options },
            (res) => {
                if (!res || !res.ok) reject(res?.error);
                else resolve(res.data);
            }
        );
    });
}