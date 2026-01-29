const colorMap = {
  red: "#ff4d4d",
  orange: "#ffa500",
  yellow: "#ffd700",
  note: "#4da6ff"   // blue for typed ones / default 
};


function truncate(text, n = 140) {
  if (!text) return "";
  if (text.length <= n) return text;
  return text.slice(0, n) + "...";
}

export default function ItemRow({ item }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <div
        style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background:
            item.type === "note"
            ? colorMap.note
            : colorMap[item.color]
        }}
    />
    <div>{truncate(item.text || item.content)}</div>
</div>

  );
}
