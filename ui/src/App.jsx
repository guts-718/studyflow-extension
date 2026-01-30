import React from "react";
import Router from "./Router";
import { DataProvider } from "./DataProvider";


export default function App() {
  return (
     <DataProvider>
      <div className="min-h-screen bg-gray-200 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Router />
      </div>
      </div>
    </DataProvider>
  );
}
