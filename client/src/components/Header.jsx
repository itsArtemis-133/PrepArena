// client/src/components/Header.jsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
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
    <header className="fixed inset-x-0 top-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo192.png" alt="PrepArena" className="h-8 w-8" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              PrepArena
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right menu */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            <button
              aria-label="Notifications"
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <BellIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </button>

            {token ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center space-x-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <img
                    src="/avatar.png"
                    alt="User"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <ChevronDownIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                </button>
                {menuOpen && (
                  <ul className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2">
                    <li>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="h-6 w-6 text-gray-700 dark:text-gray-300"
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
                className="block px-3 py-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
