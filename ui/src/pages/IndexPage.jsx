import { useItems } from "../useItems";
import ItemRow from "../components/ItemRow";
import { useState } from "react";

export default function IndexPage() {
  const { items, loading } = useItems();
  const [collapsed, setCollapsed] = useState({});

  function toggleFile(file) {
  setCollapsed(prev => ({
    ...prev,
    [file]: !prev[file]
  }));
}


  if (loading) return <h1>Loading...</h1>;
  console.log("Items from DB:", items);

  // file -> url -> items
  const grouped = {};

  items.forEach(item => {
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
      <h1>Index Page</h1>

      {Object.entries(grouped).map(([file, urls]) => (
        <div key={file}>
          <h2
            style={{ cursor: "pointer" }}
            onClick={() => toggleFile(file)}
          >
            {collapsed[file] ? "▶" : "▼"} {file} </h2>


          {!collapsed[file] && Object.entries(urls).map(([url, urlItems]) => (
            <div key={url} style={{ marginLeft: 20 }}>
              <div>{url}</div>

              {urlItems.map(item => (
                <div key={item.id} style={{ marginLeft: 20 }}>
                  <ItemRow item={item} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
