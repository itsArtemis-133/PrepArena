// client/src/components/Layout.jsx
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  const { pathname } = useLocation();
  const rootRef = useRef(null);
  const headerRef = useRef(null);

  const setHeaderVar = () => {
    const h = headerRef.current?.firstElementChild?.getBoundingClientRect().height || 0;
    rootRef.current?.style.setProperty("--header-h", `${h}px`);
  };

  useLayoutEffect(() => {
    setHeaderVar();
    const t = setTimeout(setHeaderVar, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => setHeaderVar();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen">
      <div ref={headerRef}><Header /></div>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
