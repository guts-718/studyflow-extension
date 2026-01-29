//import { useItems } from "../DataProvider";
import { useItems } from "../useItems";

export default function IndexPage() {
  const { items, loading } = useItems();

  console.log("Items from DB:", items);

  return <h1>Index Page hhehe</h1>;
}
