import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../components/ui/input";

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
  console.log("Items from DB:", items);

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

 


  return (
    <div>
    <h1 className="text-2xl font-bold mb-4">
      StudyFlow
    </h1>
    <div className="sticky top-0 pt-2 mb-4">
      <Input
        placeholder="Search notes & files..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
    </div>





      {Object.entries(grouped).map(([file, urls]) => (
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
