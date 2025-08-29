// client/src/pages/LandingPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
//import heroImage from "../assets/hero.svg";
import lotty from "../assets/exam_preparation.lottie";
import logo from "../assets/preparena-v3-icon.svg";
import {
  DocumentTextIcon,
  ClockIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import { DotLottiePlayer } from "@dotlottie/react-player";

const LandingPage = () => {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState("login");

  const openAuth = (m) => {
    setMode(m);
    setShowAuth(true);
  };
  const closeAuth = () => setShowAuth(false);

  const AuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <img src={logo} alt="PrepArena" className="h-14 w-14 mx-auto mb-4" />
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
                if (!reg.ok) throw new Error((await reg.json()).error || "Registration failed");
              }
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const result = await res.json();
              if (res.ok && result.token) {
                login(result.token);
                closeAuth();
                navigate("/dashboard");
              } else {
                throw new Error(result.error || "Login failed");
              }
            } catch (err) {
              alert(err.message);
            }
          }}
          className="flex flex-col gap-4"
        >
          {mode === "signup" && (
            <input name="name" type="text" placeholder="Name" required className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"/>
          )}
          <input name="email" type="email" placeholder="Email" required className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"/>
          <input name="password" type="password" placeholder="Password" required className="p-3 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"/>
          <div className="flex flex-col gap-3 mt-4">
            <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity duration-300 shadow-lg shadow-orange-500/20">
              {mode === "login" ? "Log In" : "Sign Up"}
            </button>
            <button type="button" onClick={closeAuth} className="w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300">
              Cancel
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            {mode === "login" ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      {showAuth && <AuthModal />}
      <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white min-h-screen flex flex-col justify-between transition-colors duration-300">
        <main className="flex-grow">
          <section className="flex flex-col-reverse md:flex-row items-center justify-between px-6 py-20 max-w-7xl mx-auto gap-12">
            <div className="md:w-1/2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start mb-6">
                <img src={logo} alt="PrepArena" className="h-14 w-14 rounded-full object-cover shadow-lg mr-3" />
                <h1 className="text-3xl font-extrabold tracking-tight">
                  <span className="text-[#0F1F33] dark:text-slate-100">Prep</span>
                  <span className="bg-gradient-to-r from-[#FF6B6B] via-[#FFA24C] to-[#FFD93D] bg-clip-text text-transparent">Arena</span>
                </h1>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 bg-clip-text text-transparent">
                  Practice. Compete. Conquer UPSC.
                </span>
              </h2>
              <p className="text-lg mb-8 max-w-md text-gray-600 dark:text-gray-300">
                Join India's most active UPSC community for Prelims & Mains mock tests.
              </p>
              <button onClick={() => token ? navigate("/dashboard") : openAuth("signup")} className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300">
                {token ? "Go to Dashboard" : "Get Started"}
              </button>
            </div>
            {/* <div className="md:w-1/2 flex justify-center md:justify-end">
              <img src={heroImage} alt="UPSC preparation" className="w-full max-w-md h-auto" />
            </div> */}
             <div className="w-full max-w-lg h-auto">
      <DotLottiePlayer
        src={lotty}
        autoplay
        loop
      />
  </div>
          </section>

          <section id="features" className="scroll-mt-16 px-6 py-24 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-3xl font-bold text-center mb-12">Core Features</h3>
            <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
              {[
                { title: "Peer-Test Sharing", desc: "Access mock tests created and shared by peers.", icon: <DocumentTextIcon className="h-10 w-10 text-indigo-500"/> },
                { title: "Timer & Leaderboard", desc: "Attempt under timed conditions and see your rank.", icon: <ClockIcon className="h-10 w-10 text-indigo-500"/> },
                { title: "Mains Answer Writing", desc: "Write answers online or upload PDFs for review.", icon: <UsersIcon className="h-10 w-10 text-indigo-500"/> },
              ].map((feat, idx) => (
                <div key={idx} className="p-8 rounded-xl shadow-md bg-white dark:bg-gray-700 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-b-4 border-transparent hover:border-indigo-500">
                  <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-gray-800">
                    {feat.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-2">{feat.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feat.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="start" className="scroll-mt-16 px-6 py-24 bg-white dark:bg-gray-900">
            <h3 className="text-3xl font-bold text-center mb-12">Getting Started</h3>
            <div className="grid md:grid-cols-4 gap-10 max-w-6xl mx-auto text-center">
              {[
                "Create or Select a Test", "Generate a Shareable Link", "Invite Peers & Attempt", "View Leaderboard",
              ].map((step, idx) => (
                <div key={idx} className="p-6 border-l-4 border-indigo-600 bg-gray-100 dark:bg-gray-800 rounded-xl shadow">
                  <div className="text-indigo-700 dark:text-indigo-300 font-bold text-lg mb-2">Step {idx + 1}</div>
                  <p className="text-gray-700 dark:text-gray-300">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="who" className="scroll-mt-16 px-6 py-24 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-3xl font-bold mb-6 text-center">Who We Are</h3>
            <p className="max-w-3xl mx-auto text-center text-lg text-gray-600 dark:text-gray-300">
              PrepArena is a student-first platform empowering UPSC aspirants with shared resources, realistic mocks, and a community-driven environment — free, inclusive, and peer-reviewed.
            </p>
          </section>
        </main>
        <footer className="text-center py-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} PrepArena. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;