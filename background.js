PORT=4109;
async function syncToCloud() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const pending = [];

    store.getAll().onsuccess = async (e) => {
        e.target.result.forEach(h => {
            if (h.syncStatus === "pending") {
                pending.push(h);
            }
        });

        if (!pending.length) return;

        const res = await fetch(`https://localhost:${PORT}/sync/highlights`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer DEV-TOKEN"
            },
            body: JSON.stringify({ highlights: pending })
        });
         
        if (res.ok) markAsSynced(pending);
        console.log("RESPONSE: ", res.status, res.ok);
    };
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
