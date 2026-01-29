import { useItems } from "../useItems";

export default function IndexPage() {
  const { items, loading } = useItems();
  console.log("Items from DB:", items);
  if (loading) return <h1>Loading...</h1>;

  return (
    <div>
      <h1>Index Page</h1>

      {items.map(item => (
        <div key={item.id}>
          <b>{item.type}</b> | {item.file} | {item.text || item.content}
        </div>
      ))}
    </div>
  );
}
