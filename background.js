const PORT=4109;
const DB_NAME = "study_highlighter_db";
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
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

(async function initLocalUser() {
  const { localUserId } = await chrome.storage.local.get("localUserId");

  if (!localUserId) {
    await chrome.storage.local.set({
      localUserId: crypto.randomUUID()
    });
  }
})();


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SET_ACTIVE_FILE") {
    chrome.storage.local.get("activeFileByUrl", res => {
      const map = res.activeFileByUrl || {};
      map[msg.url] = msg.file;
      chrome.storage.local.set({ activeFileByUrl: map }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }
});


async function saveItem(item) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    console.log("item to store in the indexedDB: ", item, " store name ",STORE_NAME);
    if (!item.id && item._id) {
       item.id = item._id;
    }
    console.log("Saving item:", item.id);
    tx.objectStore(STORE_NAME).put(item);
}

async function getFilesFromCloud() {
    const res = await authenticatedFetch(
        `http://localhost:${PORT}/files`
    );
    return res.json();
}


async function getAllItems() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise(resolve => {
        store.getAll().onsuccess = e => resolve(e.target.result);
    });
}

async function getNotesForUrlAndFile(url, file) {
  const all = await getAllItems();

  return all.find(i =>
    i.type === "note" &&
    i.url === url &&
    i.file === file
  ) || null;
}






async function deleteNotesForUrlAndFile(url, file) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const all = await getAllItems();
    all.forEach(i => {
        if (i.type === "note" && i.url === url && i.file === file) {
            store.delete(i.id);
        }
    });
}


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    (async () => {

        if (msg.type === "SAVE_ITEM") {
          await saveItem(msg.data);
        // Opportunistic sync
            try {
                await syncPendingItemsToCloud();
            } catch (e) {
                console.warn("Sync skipped:", e);
            }

            sendResponse({ ok: true });
        }
        if (msg.type === "GET_ACTIVE_FILE_MAP") {
            chrome.storage.local.get("activeFileByUrl", res => {
                sendResponse({ ok: true, data: res.activeFileByUrl || {} });
            });
            return true;
        }

        if (msg.type === "GET_ALL_ITEMS") {
            const items = await getAllItems();
            sendResponse({ ok: true, data: items });
        }

        if (msg.type === "GET_NOTES_FOR_URL_FILE") {
            const note = await getNotesForUrlAndFile(msg.url, msg.file);
            sendResponse({ ok: true, data: note });
        }

        if (msg.type === "DELETE_NOTES_FOR_URL_FILE") {
            await deleteNotesForUrlAndFile(msg.url, msg.file);
            sendResponse({ ok: true });
        }

        if (msg.type === "SET_AUTH") {
            await chrome.storage.local.set({
                accessToken: msg.accessToken,
                refreshToken: msg.refreshToken
            });
            sendResponse({ ok: true });
        }

        if (msg.type === "GET_FILES") {
            try {
                const files = await getFilesFromCloud();
                sendResponse({ ok: true, data: files });
            } catch {
                sendResponse({ ok: true, data: [] });
            }
        }

        if (msg.type === "GET_HIGHLIGHT_BY_ID") {
            const id = msg.id;
        openDB().then(db => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);

                const req = store.get(id);

                req.onsuccess = () => {
                sendResponse({
                    ok: true,
                    data: req.result || null
                });
                };

                req.onerror = () => {
                sendResponse({
                    ok: false,
                    error: req.error?.message
                });
                };
            });

            return true; // async response
            }




    })();

    return true; // keep channel open
});


async function syncPendingItemsToCloud() {
    const items = await getAllItems();
    const pending = items.filter(i => i.syncStatus === "pending");

    if (!pending.length) return;
    const { accessToken } = await chrome.storage.local.get("accessToken");
    if (!accessToken) return;


    const res = await authenticatedFetch(
        `http://localhost:${4109}/sync/items`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: pending })
        }
    );

    if (!res.ok) throw new Error("Sync failed");

    // mark as synced
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    pending.forEach(i => {
        i.syncStatus = "synced";
        store.put(i);
    });
}


async function authenticatedFetch(url, options = {}) {
    let accessToken = await getFromStorage("accessToken");
    console.log("accessToken ", accessToken);
    
    const doFetch = async (token) => {
        return fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: "Bearer " + token
            }
        });
    };

    let res = await doFetch(accessToken);

    if (res.status !== 401) {
        return res; // if valid then siimply return else we need to do silent refresh
    }

    try {
        const newToken = await refreshAccessToken();
        return await doFetch(newToken);
    } catch (err) {
        // refresh failed so we force logout
        await chrome.storage.local.clear();
        throw err;
    }
}




async function refreshAccessToken() {
    const deviceId = await getFromStorage("deviceId");
    const refreshToken = await getFromStorage("refreshToken");

    if (!deviceId || !refreshToken) {
        throw new Error("No refresh credentials");
    }

    const res = await fetch(`http://localhost:${PORT}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, refreshToken })
    });

    if (!res.ok) {
        throw new Error("Refresh failed");
    }

    const { accessToken } = await res.json();
    await setInStorage({ accessToken });
    return accessToken;
}



chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "AUTH_FETCH") {
        authenticatedFetch(msg.url, msg.options)
            .then(async res => {
                const data = await res.json();
                sendResponse({ ok: true, data });
            })
            .catch(err => {
                sendResponse({ ok: false, error: err.message });
            });
        return true; // async
    }
});




function getFromStorage(key) {
    return new Promise(resolve => {
        chrome.storage.local.get(key, res => resolve(res[key]));
    });
}

function setInStorage(obj) {
    return new Promise(resolve => {
        chrome.storage.local.set(obj, resolve);
    });
}


