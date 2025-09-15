import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";
import logo from "../assets/preparena-v3-icon.svg";
import avatarDefault from "../assets/avatar.svg";
import { useMyAvatar } from "../hooks/useMyAvatar";
import {
  BellIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function Header() {
  const { token, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState("login");
  const userMenuRef = useRef(null);
  const { url: myAvatarUrl } = useMyAvatar();

  const openAuth = useCallback((m = "login") => {
    setMode(m);
    setShowAuth(true);
  }, []);

  const closeAuth = () => setShowAuth(false);

  useEffect(() => {
    const handler = (e) => openAuth(e.detail?.mode || "login");
    document.addEventListener("open-auth-modal", handler);
    return () => document.removeEventListener("open-auth-modal", handler);
  }, [openAuth]);

  // Updated Navigation Items
  const baseNav = [
    { to: "/tests", label: "Tests", private: false },
    { to: "/creator-hub", label: "Creator Hub", private: false }, // <-- ADDED HERE
    { to: "/community", label: "Community", private: false },
    { to: "/resources", label: "Resources", private: false },
  ];
  const authedNav = token
    ? [{ to: "/dashboard", label: "Dashboard", private: true }, ...baseNav]
    : baseNav;

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
    setShowAuth(false); // Close modal on navigation
  }, [location.pathname]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const NavItem = ({ to, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-lg font-semibold transition-colors duration-300",
          "text-gray-700 dark:text-gray-300",
          "hover:bg-indigo-100 dark:hover:bg-gray-700",
          "hover:text-indigo-700 dark:hover:text-indigo-300",
          isActive ? "bg-indigo-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300" : "",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );

  const AuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[999] p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <img src={logo} alt="PrepArena" className="h-14 w-14 mx-auto mb-4" />
        {mode === "forgot" ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center capitalize text-gray-800 dark:text-white">
              Forgot Password
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const email = e.target.email.value;
                try {
                  const res = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  const raw = await res.text();
                  let result;
                  try {
                    result = raw ? JSON.parse(raw) : {};
                  } catch {
                    result = { error: raw };
                  }
                  if (res.ok) {
                    alert(result.message || "Password reset link sent to your email.");
                    setMode("login");
                  } else {
                    throw new Error(result?.error || result?.message || `Failed to send reset link (${res.status})`);
                  }
                } catch (err) {
                  alert(err.message);
                }
              }}
              className="flex flex-col gap-4"
            >
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity duration-300 shadow-lg shadow-orange-500/20"
              >
                Send Reset Link
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
              >
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center capitalize text-gray-800 dark:text-white">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                try {
                  if (mode === "signup") {
                    const reg = await fetch("/api/auth/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    });
                    const regRaw = await reg.text();
                    let regPayload;
                    try {
                      regPayload = regRaw ? JSON.parse(regRaw) : {};
                    } catch {
                      regPayload = { error: regRaw };
                    }
                    if (!reg.ok) throw new Error(regPayload?.error || regPayload?.message || "Registration failed");
                  }

                  const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  const raw = await res.text();
                  let result;
                  try {
                    result = raw ? JSON.parse(raw) : {};
                  } catch {
                    result = { error: raw };
                  }

                  if (!res.ok) {
                    const msg = result?.error || result?.message || `Login failed (${res.status})`;
                    throw new Error(msg);
                  }
                  if (!result?.token) throw new Error("Login failed: no token in response");

                  login(result.token);
                  closeAuth();
                  navigate("/dashboard");
                } catch (err) {
                  alert(err.message);
                }
              }}
              className="flex flex-col gap-4"
            >
              {mode === "signup" && (
                <input
                  name="name"
                  type="text"
                  placeholder="Name"
                  required
                  className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              )}
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {mode === "signup" && (
                <p className="text-xs text-orange-500 mt-2 text-center">
                  ⚠️ Please keep your password safe! <br />
                  <span className="font-semibold">We can't afford a forgot password feature right now 😅</span>
                </p>
              )}
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity duration-300 shadow-lg shadow-orange-500/20"
                >
                  {mode === "login" ? "Log In" : "Sign Up"}
                </button>
                <button
                  type="button"
                  onClick={closeAuth}
                  className="w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {mode === "login" ? "Sign Up" : "Log In"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showAuth && <AuthModal />}
      <header className="sticky top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-900/80 shadow-md border-b border-gray-200 dark:border-gray-700/60 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-white dark:bg-gray-900 p-2 rounded-full shadow-lg">
                <img src={logo} alt="PrepArena" className="h-10 w-10 rounded-full object-cover" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                <span className="text-[#0F1F33] dark:text-slate-100">Prep</span>
                <span className="bg-gradient-to-r from-[#FF6B6B] via-[#FFA24C] to-[#FFD93D] bg-clip-text text-transparent">
                  Arena
                </span>
              </h1>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {authedNav.map((item) => (
                <NavItem key={item.to} to={item.to} label={item.label} />
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {token && (
                <button
                  onClick={() => navigate("/tests/create")}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 hover:scale-105 shadow"
                  title="Create Test"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  <span>Create</span>
                </button>
              )}

              <ThemeToggle />

              <button
                aria-label="Notifications"
                className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors duration-300"
                title="Notifications"
              >
                <BellIcon className="h-6 w-6 text-indigo-700 dark:text-indigo-300" />
              </button>

              {token ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-2 p-2 rounded-full bg-white dark:bg-gray-900 shadow hover:bg-indigo-50 dark:hover:bg-gray-800 transition"
                  >
                    <img
                      src={myAvatarUrl || avatarDefault}
                      alt="User"
                      className="h-8 w-8 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                    />
                    <ChevronDownIcon className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                  </button>

                  {menuOpen && (
                    <ul
                      role="menu"
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-2 border border-indigo-100 dark:border-gray-700"
                    >
                      <li>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded transition"
                          role="menuitem"
                        >
                          <UserCircleIcon className="h-5 w-5" />
                          <span>Profile</span>
                        </Link>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded transition"
                          role="menuitem"
                        >
                          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                          <span>Logout</span>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuth("login")}
                  className="hidden md:inline-block px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-300 hover:scale-105"
                >
                  Login
                </button>
              )}

              <button
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors duration-300"
              >
                <svg className="h-6 w-6 text-indigo-700 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden pb-4 space-y-2">
              {authedNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700 font-semibold transition"
                >
                  {item.label}
                </NavLink>
              ))}
              {token ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/tests/create");
                  }}
                  className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  <span>Create</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    openAuth("login");
                  }}
                  className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
                >
                  Login / Sign Up
                </button>
              )}
            </nav>
          )}
        </div>
      </header>
    </>
  );
}