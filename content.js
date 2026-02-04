// global state
let toolbar = null;
let activeFile = null;
let savedRange = null;


function colorMap(color) {
  return {
    red: "#ff6b6b",    
    orange: "#ffa94d", 
    yellow: "#ffd43b"   
  }[color];
}

const COLOR_PRIORITY = {
  red: 3,
  orange: 2,
  yellow: 1
};



// init
async function restoreActiveFileForPage() {
  try {
    const map = await bgRequest({ type: "GET_ACTIVE_FILE_MAP" });
    const pageUrl = location.origin + location.pathname;
    activeFile = map?.[pageUrl] || activeFile;
  } catch (e) {
    console.warn("Could not restore active file", e);
  }
}


function makeHighlightId(pageUrl, startXPath, text) {
  const len = text.length;
  const norm = text.trim().toLowerCase().slice(0, Math.min(30, len));
  return `${pageUrl}|${startXPath}|${norm}`;
}




// SOFTER VERSION
function colorMap(color) {
  return {
    red: "#ff8787",
    orange: "#ffc078",
    yellow: "#ffe066"
  }[color];
}



function startContent() {
  restoreActiveFileForPage();
  hydratePageHighlights();
  setTimeout(hydratePageHighlights, 1500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startContent);
} else {
  startContent();
}


function bgRequest(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, res => {
      if (!res || !res.ok) reject(res);
      else resolve(res.data);
    });
  });
}


function getNodeFromXPath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

function getXPath(node) {
  const parts = [];
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sib = node.previousSibling;
    while (sib) {
      if (sib.nodeName === node.nodeName) index++;
      sib = sib.previousSibling;
    }
    parts.unshift(`${node.nodeName}[${index}]`);
    node = node.parentNode;
  }
  return "/" + parts.join("/");
}

function applyHighlightToRange(range, color) {
  const span = document.createElement("span");
  span.setAttribute("data-studyflow-highlight", "true");
 
  span.style.backgroundColor = color;
  span.style.padding = "2px";
  span.style.borderRadius = "3px";

  const frag = range.extractContents();
  span.appendChild(frag);
  range.insertNode(span);
}


async function saveHighlight(range, text, color) {

  const map = await bgRequest({ type: "GET_ACTIVE_FILE_MAP" });
  const pageUrl = location.origin + location.pathname;
  activeFile = map?.[pageUrl] || activeFile;
  if (!activeFile) return;

    const highlightId = makeHighlightId(
    pageUrl,
    getXPath(range.startContainer),
    text
  );

  const data = {
    id: highlightId,
    clientId: crypto.randomUUID(),
    type: "highlight",
    file: activeFile,
    url: location.origin + location.pathname, // location.href was here
    text,
    color,
    timestamp: Date.now(),
    syncStatus: "pending",

    startXPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endXPath: getXPath(range.endContainer),
    endOffset: range.endOffset
  };

  try {
    
    const existing = await bgRequest({
      type: "GET_HIGHLIGHT_BY_ID",
      id: highlightId
    });

    if (existing) {
      console.log("similar data already present: ", data);
      if (COLOR_PRIORITY[color] <= COLOR_PRIORITY[existing.color]) {
        console.log("old one has better color",existing.color,"compared to", color);
        return; // weaker or equal → ignore
      }
    } 

    await bgRequest({ type: "SAVE_ITEM", data });
  } catch (e) {
    console.error("Save failed", e);
  }
}

// async function setActiveFileForUrl(url, file) {
//   return new Promise(resolve => {
//     chrome.storage.local.get("activeFileByUrl", res => {
//       const map = res.activeFileByUrl || {};
//       map[url] = file;
//       chrome.storage.local.set({ activeFileByUrl: map }, resolve);
//     });
//   });
// }

async function setActiveFileForUrl(url, file) {
  return bgRequest({
    type: "SET_ACTIVE_FILE",
    url,
    file
  });
}

async function loadFileNames() {
  try {
    const files = await bgRequest({ type: "GET_FILES" });
    if (files?.length) return files;
  } catch {}
  return [];
}


document.addEventListener("mousedown", e => {
  if (!toolbar) return;

  // allow toolbar clicks
  if (toolbar.contains(e.target)) return;

  removeToolbar();
});


document.addEventListener("mouseup", () => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const text = sel.toString().trim();
  if (!text) return;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  showToolbar(rect, text, range);
});

function showToolbar(rect, text, range) {
  console.log("Toolbar shown");

    removeToolbar();


  toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    position: "absolute",
    top: `${window.scrollY + rect.top - 40}px`,
    left: `${window.scrollX + rect.left}px`,
    background: "#222",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    gap: "6px",
    zIndex: "999999"
  });

  /*
   red: "#ff6b6b",    
    orange: "#ffa94d", 
    yellow: "#ffd43b" 
    */

  const colors = [
    { name: "red", c: "#ff6b6b" },
    { name: "orange", c: "#ffa94d"},
    { name: "yellow", c: "#ffd43b" }
  ];

  colors.forEach(({ name, c }) => {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      border: "none",
      background: c,
      cursor: "pointer"
    });

    btn.onmousedown = e => e.stopPropagation();
    btn.onmouseup = e => e.stopPropagation();

    btn.onclick = async () => {
    console.log("Color clicked:", name);

    const pageUrl = location.origin + location.pathname;

    // Always fetch latest active file
    const map = await bgRequest({ type: "GET_ACTIVE_FILE_MAP" });
    activeFile = map?.[pageUrl] || null;

    const handle = async (file) => {
      activeFile = file;

      await setActiveFileForUrl(pageUrl, file);

      applyHighlightToRange(range, colorMap(name));
      removeToolbar();
      saveHighlight(range, text, name);
    };

    if (!activeFile) {
      showFileChooser(handle);
    } else {
      handle(activeFile);
    }
  };


    toolbar.appendChild(btn);
  });

  document.body.appendChild(toolbar);
}

function removeToolbar() {
  toolbar?.remove();
  toolbar = null;
}

async function showFileChooser(onSelect) {
    console.log("showFileChooser called");

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 999999
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    width: "280px",
    margin: "20vh auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  });

  const input = document.createElement("input");
  input.placeholder = "Create new file...";

  const select = document.createElement("select");
  select.innerHTML = `<option value="">Select existing file</option>`;

  const files = await loadFileNames();
  files.forEach(f => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = f;
    select.appendChild(opt);
  });

  const btn = document.createElement("button");
  btn.textContent = "Confirm";

  btn.onclick = () => {
    const val = input.value.trim() || select.value;
    if (!val) return alert("Select or enter a file");
    overlay.remove();
    onSelect(val);
  };

  overlay.onmousedown = e => {
    if (e.target === overlay) overlay.remove();
  };

  modal.append(input, select, btn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}











async function hydratePageHighlights() {
  console.log("HYDRATE START");
  //clearAllInjectedHighlights();

  const items = await bgRequest({ type: "GET_ALL_ITEMS" });
  console.log("items ",items);

  const pageUrl = location.origin + location.pathname;

  const highlights = items.filter(
    i => i.type === "highlight" && i.url === pageUrl
  );
  
  console.log("highlights ", highlights);

  for (const h of highlights) {
    try {
      let node = null;
      let start = -1;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      while ((node = walker.nextNode())) {
        const idx = node.nodeValue.indexOf(h.text);
        if (idx !== -1) {
          start = idx;
          break;
        }
      }

      if (!node) continue;

      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, start + h.text.length);

      applyHighlightToRange(r, colorMap(h.color));
    } catch {}
  }
}




async function hydratePageHighlights_old() {
  console.log("HYDRATE START");
  clearAllInjectedHighlights();


  try {
    const items = await bgRequest({ type: "GET_ALL_ITEMS" });
    console.log("ITEMS:", items);

    const pageHighlights = items.filter(
        i => i.type === "highlight" && i.url === location.origin + location.pathname
        );
        console.log("PAGE HIGHLIGHTS:", pageHighlights);

    items
      .filter(i => i.type === "highlight" && i.url === location.origin + location.pathname)
      .forEach(h => {
  try {
    let startNode = getNodeFromXPath(h.startXPath);
    let endNode = getNodeFromXPath(h.endXPath);

    // ✅ FALLBACK: search text in page
    if (!startNode || !endNode) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.includes(h.text)) {
          startNode = node;
          endNode = node;
          h.startOffset = node.nodeValue.indexOf(h.text);
          h.endOffset = h.startOffset + h.text.length;
          break;
        }
      }
    }

    if (!startNode || !endNode) return;

    const r = document.createRange();
    r.setStart(startNode, h.startOffset);
    r.setEnd(endNode, h.endOffset);

    applyHighlightToRange(r, colorMap(h.color));

  } catch (e) {
    console.warn("Reapply failed", e);
  }
});

  } catch (e) {
    console.warn("Hydration failed", e);
  }
}


function clearAllInjectedHighlights() {
  document.querySelectorAll("[data-studyflow-highlight]")
    .forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });
}




let hydrateTimer = null;

window.addEventListener("resize", () => {
  clearTimeout(hydrateTimer);
  hydrateTimer = setTimeout(() => {
    hydratePageHighlights();
  }, 300);
});


function startHydration() {
  hydratePageHighlights();

  // Retry once more after layout settles
  setTimeout(hydratePageHighlights, 1500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHydration);
} else {
  startHydration();
}





// window.addEventListener("load", hydratePageHighlights);
// setTimeout(hydratePageHighlights, 500);
// const observer = new MutationObserver(() => {
//   hydratePageHighlights();
// });

// observer.observe(document.body, {
//   childList: true,
//   subtree: true
// });














/*
async function setActiveFileForUrl(url, file) {
  return new Promise(resolve => {
    chrome.storage.local.get("activeFileByUrl", res => {

      
function bgRequest(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, res => {
      if (!res || !res.ok) reject(res);
      else resolve(res.data);
    });
  });
} 
      */
