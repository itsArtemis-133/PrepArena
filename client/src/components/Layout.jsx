// client/src/components/Layout.jsx
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  const { pathname } = useLocation();
  const isRunner = pathname.includes("/take");

  // Measure header height (no hardcoding), expose as CSS var
  const rootRef = useRef(null);
  const headerWrapRef = useRef(null);

  const setHeaderVar = () => {
    const el = headerWrapRef.current;
    const h =
      (el?.firstElementChild &&
        el.firstElementChild.getBoundingClientRect().height) ||
      (el && el.getBoundingClientRect().height) ||
      0;
    rootRef.current?.style.setProperty("--header-h", `${h}px`);
  };

  useLayoutEffect(() => {
    setHeaderVar();
  }, []);

  useEffect(() => {
    setHeaderVar();
    const ro = new ResizeObserver(setHeaderVar);
    if (headerWrapRef.current) ro.observe(headerWrapRef.current);
    window.addEventListener("resize", setHeaderVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setHeaderVar);
    };
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen">
      <div ref={headerWrapRef}>
        <Header />
      </div>

      {/* For normal pages the sticky header reserves space automatically */}
      {!isRunner ? (
        <main>
          <Outlet />
        </main>
      ) : (
        <main>
          {/* Runner viewport: no body scroll; panes manage their own scroll */}
          <div className="overflow-hidden" style={{ height: "calc(100vh - var(--header-h))" }}>
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}
