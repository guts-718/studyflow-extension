import { useItems } from "../useItems";
import ItemRow from "../components/ItemRow";
import { ArrowLeft } from "lucide-react";


export default function FilePage() {
  const file = decodeURIComponent(
    window.location.hash.split("/")[2]
  );

  const { items } = useItems();

  const fileItems = items.filter(i => i.file === file);

  const grouped = {};

    fileItems.forEach(item => {
    if (!grouped[item.url]) {
      grouped[item.url] = [];
    }
    grouped[item.url].push(item);
    });

  return (
    <div className="space-y-4 cursor-pointer">
      <div className="flex items-center gap-3 mb-6">
       <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      </div>

      <h1 className="text-2xl font-semibold mb-6">{file}</h1>
      <div className="space-y-6">
        {Object.entries(grouped).map(([url, items]) => (
          <div
            key={url}
            className="bg-white rounded-lg shadow-sm p-4"
          >
            <a
              href={url}
              target="_blank"
              title={url}
              className="text-sm text-blue-500 hover:underline block mb-3"
            >
              {new URL(url).hostname.replace("www.", "")}
            </a>

            <div className="space-y-2">
              {items.map(item => (
                <ItemRow key={item.id} item={item} full />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
