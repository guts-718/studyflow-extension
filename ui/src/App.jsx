import React from "react";
import Router from "./Router";
import { DataProvider } from "./DataProvider";

export default function App() {
  return (
     <DataProvider>
      <Router />
    </DataProvider>
  );
}
