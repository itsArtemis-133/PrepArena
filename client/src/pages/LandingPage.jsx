import React from "react";
import ThemeToggle from "../components/ThemeToggle";
import heroImg from "../assets/hero.svg";

const LandingPage = () => {
  return (
    <div className="w-full min-h-screen flex flex-col justify-between bg-white dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center p-4 shadow-md bg-gray-100 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">PrepArena</h1>
        <div className="flex gap-4 items-center">
          <nav className="space-x-4 hidden sm:block">
            <a href="#about" className="hover:underline">About</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="flex flex-col-reverse md:flex-row items-center justify-between text-center md:text-left py-20 px-6 md:px-20 gap-10">
          <div className="flex-1">
            <h2 className="text-4xl font-extrabold mb-4 leading-tight">Practice. Compete. Conquer UPSC.</h2>
            <p className="text-lg mb-6">Join our community to take shared UPSC mock tests for Prelims and Mains.</p>
            <a
              href="/tests"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Explore Tests
            </a>
          </div>
          <div className="flex-1">
            <img src={heroImg} alt="Hero Illustration" className="w-full max-w-md mx-auto" />
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="px-6 md:px-20 py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center md:text-left">Why This Platform?</h3>
            <ul className="list-disc ml-6 space-y-2 text-left text-lg">
              <li>Access shared tests created by peers</li>
              <li>Timer and leaderboard for real-time performance</li>
              <li>Mains writing with PDF submission</li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 bg-gray-200 dark:bg-gray-700 text-sm">
        <p>&copy; 2025 <span className="font-semibold">PrepArena</span>. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
