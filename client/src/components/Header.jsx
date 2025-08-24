// client/src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/preparena-v3-icon.svg";
import avatar from "../assets/avatar.svg";

export default function Header() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef(null);

  const navItems = [
    { to: "/", label: "Home", auth: false },
    { to: "/tests", label: "Tests", auth: false },
    { to: "/results", label: "Results", auth: true },
  ];

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const linkClasses = ({ isActive }) =>
    "px-4 py-2 rounded-xl font-semibold transition " +
    (isActive
      ? "bg-[rgb(var(--brand-600))] text-white shadow"
      : "text-[rgb(var(--brand-700))] hover:bg-[color-mix(in_srgb, rgb(var(--brand-50)) 85%, white)]");

  return (
    <header className="sticky top-0 inset-x-0 z-50">
      {/* Color top bar */}
      <div className="h-1 w-full bg-[linear-gradient(90deg,rgb(var(--brand-600))_0%,rgb(var(--brand-500))_60%,rgb(var(--brand-600))_100%)]" />

      {/* Main header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-[rgb(var(--surface-border))]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-md border border-[rgb(var(--surface-border))]">
                <img src={logo} alt="PrepArena" className="h-10 w-10 rounded-full object-cover" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                <span className="text-[#0F1F33]">Prep</span>
                <span className="text-[rgb(var(--brand-700))]">Arena</span>
              </h1>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems
                .filter((i) => !i.auth || token)
                .map((item) => (
                  <NavLink key={item.to} to={item.to} className={linkClasses} end={item.to === "/"}>
                    {item.label}
                  </NavLink>
                ))}

              {token ? (
                <div className="relative ml-2" ref={userMenuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-700))] shadow hover:bg-[rgb(var(--brand-100))] transition border border-[rgb(var(--surface-border))]"
                  >
                    <img src={avatar} alt="User" className="h-8 w-8 rounded-full object-cover" />
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0l-4.24-4.52a.75.75 0 01.02-1.06z" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <ul
                      role="menu"
                      className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl py-2 border border-[rgb(var(--surface-border))]"
                    >
                      <li>
                        <NavLink
                          to="/dashboard"
                          className={({ isActive }) =>
                            "block px-4 py-2 rounded transition " +
                            (isActive
                              ? "bg-[rgb(var(--brand-600))] text-white"
                              : "text-gray-700 hover:bg-[rgb(var(--brand-50))]")
                          }
                          role="menuitem"
                        >
                          Dashboard
                        </NavLink>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded transition"
                          role="menuitem"
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to="/"
                  className="ml-2 px-5 py-2 bg-[rgb(var(--brand-600))] text-white rounded-xl font-semibold shadow hover:bg-[rgb(var(--brand-700))] transition"
                >
                  Login
                </NavLink>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-xl bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-700))] border border-[rgb(var(--surface-border))]"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden px-6 pb-6 space-y-2 bg-white border-b border-[rgb(var(--surface-border))]">
          {navItems
            .filter((i) => !i.auth || token)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  "block px-4 py-2 rounded-lg font-semibold transition " +
                  (isActive
                    ? "bg-[rgb(var(--brand-600))] text-white shadow"
                    : "text-gray-800 bg-[rgb(var(--brand-50))] hover:bg-[rgb(var(--brand-100))]")
                }
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
      )}
    </header>
  );
}
