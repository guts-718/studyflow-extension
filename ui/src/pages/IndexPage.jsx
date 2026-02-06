import { useState,useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../components/ui/input";
import { Download } from "lucide-react";


import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from "../components/ui/collapsible";
import { useItems } from "../useItems";
import ItemRow from "../components/ItemRow";
import { navigate } from "../navigate";

export default function IndexPage() {
  const { items, loading } = useItems();
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState("");


  useEffect(() => {
    const initial = {};
    //setAllItems(items);
    items.forEach(item => {
      initial[item.file] = true;
    });
    setCollapsed(initial);
  }, [items]);

  function toggleFile(file) {
  setCollapsed(prev => ({
    ...prev,
    [file]: !prev[file]
  }));
    }


function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}


  if (loading) return <h1>Loading...</h1>;

  // file -> url -> items
  const grouped = {};
  function matches(item, query) {
    const q = (query.length>0 ? query.toLowerCase(): "");
    return (
      q === "" || item.file.toLowerCase().includes(q) ||
      (item.text || item.content || "").toLowerCase().includes(q) ||
      (item.url && item.url.length>0 && item.url.toLowerCase().includes(q))
    );
  }

  items.filter(item => matches(item, query))
  .forEach(item => {
    if (!grouped[item.file]) {
      grouped[item.file] = {};
    }

    if (!grouped[item.file][item.url]) {
      grouped[item.file][item.url] = [];
    }

    grouped[item.file][item.url].push(item);
  });


 function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");
}

function exportGrouped(groupedData, format = "md") {
  let output = "";

  if (format === "md") {
    output += `# 📚 StudyFlow Notes\n\n`;
    output += `## 📂 Files Index\n`;
    Object.keys(groupedData).forEach(file => {
      output += `- [${file}](#${slugify(file)})\n`;
    });
    output += `\n---\n\n`;

    Object.entries(groupedData).forEach(([file, urls]) => {
      output += `## ${file}\n\n`;

      Object.entries(urls).forEach(([url, items]) => {
        output += `### 🔗 ${url}\n`;

        items.forEach(i => {
          if (i.type === "highlight") {
            output += `**🔴 Highlight**\n${i.text}\n\n`;
          } else {
            output += `**📝 Note**\n${i.text}\n\n`;
          }
        });

        output += `---\n\n`;
      });
    });
  }

  if (format === "txt") {
    Object.entries(groupedData).forEach(([file, urls]) => {
      output += `FILE: ${file}\n\n`;

      Object.entries(urls).forEach(([url, items]) => {
        output += `URL: ${url}\n`;

        items.forEach(i => {
          if (i.type === "highlight") {
            output += `[HIGHLIGHT]\n${i.text}\n\n`;
          } else {
            output += `[NOTE]\n${i.text}\n\n`;
          }
        });
      });
    });
  }

  downloadFile(output, `notes.${format}`);
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
<div>
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold">
    StudyFlow
  </h1>

    <button
      onClick={() => exportGrouped(grouped, "md")}
      className="
        flex items-center gap-2
        bg-blue-600 text-white
        px-4 py-2 rounded-md
        text-sm font-medium
        shadow-sm
        hover:bg-blue-700
        active:scale-[0.98]
        transition
      "
    >
      <Download size={16} />
      Export All Notes
  </button>
  </div>
    <div className="sticky top-0 pt-2 mb-4">
      <Input
        placeholder="Search notes & files..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
    </div>





      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([file, urls]) => (
        <div key={file}  className="mb-4 bg-white rounded-lg shadow-sm p-3">
          <Collapsible open={!collapsed[file]}>
          <div className="flex items-center gap-2 select-none">
            <CollapsibleTrigger>
                <div
                  className="cursor-pointer"
                  onClick={() => toggleFile(file)}
                >

                {collapsed[file] ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
            </CollapsibleTrigger>

            <h2
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/file/" + encodeURIComponent(file))}
            >
              {file}
            </h2>

        </div>


            <CollapsibleContent>
              {Object.entries(urls).map(([url, urlItems]) => (
                <div key={url} className="ml-4 mt-3">
                  <a
                      href={url}
                      target="_blank"
                      title={url}
                      className="text-blue-500 text-sm hover:underline"
                    >
                      {getDomain(url)}
                    </a>


                  {urlItems.map(item => (
                    <div key={item.id} className="ml-4">
                      <ItemRow item={item} />
                    </div>
                  ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

        </div>
      ))}
    </div>
  );
}
