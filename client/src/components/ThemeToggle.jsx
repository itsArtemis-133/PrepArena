import React, { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 shadow transition"
      aria-label="Toggle dark/light mode"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <span className="text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
