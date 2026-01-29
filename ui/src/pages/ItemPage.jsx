import { useItems } from "../useItems";

export default function ItemPage() {
  const id = window.location.hash.split("/")[2];
  const { items } = useItems();

  const item = items.find(i => i.id === id);

  if (!item) {
    return <div>Item not found</div>;
  }

  return (
    <div>
      <button onClick={() => window.history.back()}>
        ← Back
      </button>

      <h3>File: {item.file}</h3>

      <div style={{ margin: "8px 0" }}>
        Color: {item.type === "note" ? "note" : item.color}
      </div>

      <div style={{ marginTop: 12 }}>
        {item.text || item.content}
      </div>

      <div style={{ marginTop: 12 }}>
        <a href={item.url} target="_blank">
          Open Source
        </a>
      </div>

      <div style={{ marginTop: 12, fontSize: 12 }}>
        {new Date(item.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
