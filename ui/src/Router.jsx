import React, { useEffect, useState } from "react";
import IndexPage from "./pages/IndexPage.jsx";
import FilePage from "./pages/FilePage.jsx";
import ItemPage from "./pages/ItemPage.jsx";

function getRoute() {
  return window.location.hash.slice(1) || "/";
}

export default function Router() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  if (route.startsWith("/file/")) {
    return <FilePage />;
  }

  if (route.startsWith("/item/")) {
    return <ItemPage />;
  }

  return <IndexPage />;
}
