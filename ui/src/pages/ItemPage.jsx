import { useItems } from "../useItems";
import { ArrowLeft } from "lucide-react";

export default function ItemPage() {
  const id = window.location.hash.split("/")[2];
  const { items } = useItems();

  const item = items.find(i => i.id === id);

  if (!item) {
    return <div>Item not found</div>;
  }

  return (
    <div className="space-y-4">
<div className="max-w-2xl">

  {/* Back */}
  <button
    onClick={() => window.history.back()}
    className="flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer mb-4"
  >
    <ArrowLeft size={16} />
    Back
    </button>

  {/* Card */}
  <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">

    {/* Metadata */}
    <div className="flex items-center gap-3 text-sm text-gray-500">

      <span className="px-2 py-0.5 bg-gray-100 rounded">
        {item.file}
      </span>

      <span
        className={`w-2.5 h-2.5 rounded-full ${
          item.type === "note"
            ? "bg-blue-400"
            : item.color === "red"
            ? "bg-red-400"
            : item.color === "orange"
            ? "bg-orange-400"
            : "bg-yellow-300"
        }`}
      />

      {/* <span>
        {item.type === "note" ? "Note" : item.color}
      </span> */}

    </div>

    {/* Text */}
    <div className="text-base leading-relaxed">
      {item.text || item.content}
    </div>

    {/* Footer */}
    <div className="flex justify-between items-center text-sm text-gray-500">

      <a
        href={item.url}
        target="_blank"
        className="text-blue-600 hover:underline"
      >
        Open Source
      </a>

      <div>
        {new Date(item.timestamp).toLocaleString()}
      </div>

    </div>

  </div>
</div>

</div>
  );
}
