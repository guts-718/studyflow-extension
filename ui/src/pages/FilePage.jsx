import { useItems } from "../useItems";
import ItemRow from "../components/ItemRow";
import { ArrowLeft } from "lucide-react";


export default function FilePage() {
  const file = decodeURIComponent(
    window.location.hash.split("/")[2]
  );

  console.log("file: ",file);

  const { items } = useItems();
  console.log("items: ",items);

  const fileItems = items.filter(i => i.file === file);

  const grouped = {};

    fileItems.forEach(item => {
    if (!grouped[item.url]) {
      grouped[item.url] = [];
    }
    grouped[item.url].push(item);
    });
  function exportFile(fileName, items, format = "md") {
        let output = "";

        if (format === "md") {
          output += `# ${fileName}\n\n`;

          items.forEach(i => {
            output += `---\n\n`;
            output += `## 🔗 ${i.url}\n\n`;

            if (i.type === "highlight") {
              output += `### 🔴 Highlight\n${i.text}\n\n`;
            } else {
              output += `### 📝 Note\n${i.text}\n\n`;
            }
          });
        }

        if (format === "txt") {
          output += `FILE: ${fileName}\n\n`;

          items.forEach(i => {
            output += `URL: ${i.url}\n`;

            if (i.type === "highlight") {
              output += `[HIGHLIGHT]\n${i.text}\n\n`;
            } else {
              output += `[NOTE]\n${i.text}\n\n`;
            }
          });
        }

        downloadFile(output, `${fileName}.${format}`);
      }

      function downloadFile(content, filename) {
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();

          URL.revokeObjectURL(url);
        }


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
      <button onClick={() => exportFile(file, fileItems, "md")}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer">
        Export
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
