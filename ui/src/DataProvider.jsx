import React, { createContext, useEffect, useState } from "react";
import { bgRequest } from "./bgRequest";

export const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    const data = await bgRequest({ type: "GET_ALL_ITEMS" });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <DataContext.Provider value={{ items, refresh: loadItems, loading }}>
      {children}
    </DataContext.Provider>
  );
}
