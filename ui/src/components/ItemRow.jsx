import { navigate } from "../navigate";

const colorMap = {
  red: "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-300",
  note: "bg-blue-400"
};

function truncate(text, n = 140) {
  if (!text) return "";
  if (text.length <= n) return text;
  return text.slice(0, n) + "...";
}

export default function ItemRow({ item, full = false }) {
  return (
    <div
      onClick={() => navigate("/item/" + item.id)}
      className="flex items-start gap-3 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
    >
      <div
        className={`w-2.5 h-2.5 rounded-full mt-1 ${colorMap[
          item.type === "note" ? "note" : item.color
        ]}`}
      />

      <div className="text-sm leading-snug">
        {full
          ? item.text || item.content
          : truncate(item.text || item.content)}
      </div>
    </div>
  );
}
