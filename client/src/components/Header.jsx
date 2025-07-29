// client/src/components/Header.jsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import logo from '../assets/logo.png';
import {
  BellIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

export default function Header() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/tests', label: 'Tests' },
    { to: '/community', label: 'Community' },
    { to: '/resources', label: 'Resources' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-r from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-lg border-b border-blue-100 dark:border-gray-700 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-white dark:bg-gray-900 p-2 rounded-full shadow-lg">
              <img src={logo} alt="PrepArena" className="h-10 w-10 rounded-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight">
              PrepArena
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition-colors px-3 py-2 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-300 ${
                    isActive ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300' : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right menu */}
          <div className="flex items-center space-x-6">
            <ThemeToggle />
            <button
              aria-label="Notifications"
              className="p-2 rounded-full bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 shadow transition"
            >
              <BellIcon className="h-6 w-6 text-blue-700 dark:text-blue-300" />
            </button>
            {token ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center space-x-2 p-2 rounded-full bg-white dark:bg-gray-900 shadow hover:bg-blue-50 dark:hover:bg-gray-800 transition"
                >
                  <img
                    src="/avatar.png"
                    alt="User"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <ChevronDownIcon className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </button>
                {menuOpen && (
                  <ul className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-2 border border-blue-100 dark:border-gray-700">
                    <li>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition"
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition"
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <Link
                to="/"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-full bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 shadow transition"
            >
              <svg
                className="h-6 w-6 text-blue-700 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 font-semibold transition"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
