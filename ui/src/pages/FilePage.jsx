import { useItems } from "../useItems";
import ItemRow from "../components/ItemRow";

export default function FilePage() {
  const file = decodeURIComponent(
    window.location.hash.split("/")[2]
  );

  const { items } = useItems();

  const fileItems = items.filter(i => i.file === file);

  return (
    <div>
      <button onClick={() => window.history.back()}>
        ← Back
      </button>

      <h1>{file}</h1>

      {fileItems.map(item => (
        <div key={item.id} style={{ marginBottom: 12 }}>
         <ItemRow item={item} full />
          <div style={{ marginLeft: 18, fontSize: 12 }}>
            <a href={item.url} target="_blank">
              {item.url}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
