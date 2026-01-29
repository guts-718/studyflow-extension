import { useContext } from "react";
import { DataContext } from "./DataProvider";

export function useItems() {
  return useContext(DataContext);
}
