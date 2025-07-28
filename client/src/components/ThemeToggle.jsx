import React, { useContext } from 'react';
import ThemeContext from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      onClick={toggle}
      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      aria-label="Toggle dark/light mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
