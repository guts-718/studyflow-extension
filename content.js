// window.getSelection().toString().trim()
// window.getSelection().getRangeAt(0)
// window.getSelection().getRangeAt(0).getBoundingClientRect()


let toolbar;

document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    showToolbar(rect, selectedText);
});

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
            alert("button clicked");
            console.log("highlighted text:", text);
            console.log("color:", c.name);
            removeToolbar();
        };

        toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);
}

function removeToolbar() {
    if (toolbar) {
        toolbar.remove();
        toolbar = null;
    }
}




/*
window.getSelection().getRangeAt(0)
Range {commonAncestorContainer: text, startContainer: text, startOffset: 2, endContainer: text, endOffset: 24, …}collapsed: falsecommonAncestorContainer: textendContainer: textendOffset: 24startContainer: textstartOffset: 2[[Prototype]]: Range


window.getSelection().getRangeAt(0).getBoundingClientRect()
DOMRect {x: 37.11277389526367, y: 155.7540740966797, width: 125.3125, height: 15.652175903320312, top: 155.7540740966797, …}bottom: 171.40625height: 15.652175903320312left: 37.11277389526367right: 162.42527389526367top: 155.7540740966797width: 125.3125x: 37.11277389526367y: 155.7540740966797[[Prototype]]: DOMRect
*/