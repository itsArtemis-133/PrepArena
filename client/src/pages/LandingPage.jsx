// client/src/pages/LandingPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import heroImage from "../assets/hero.svg";

const LandingPage = () => {
  const { token, login } = useAuth();
  const navigate         = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode]         = useState("login");

  const openAuth  = (m) => { setMode(m); setShowAuth(true); };
  const closeAuth = () => setShowAuth(false);

  const AuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center capitalize">
          {mode}
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
                  body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                  }),
                });
                if (!reg.ok)
                  throw new Error(
                    (await reg.json()).error || "Registration failed"
                  );
              }
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: data.email,
                  password: data.password,
                }),
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
            <input
              name="name"
              type="text"
              placeholder="Name"
              required
              className="p-2 border rounded"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="p-2 border rounded"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="p-2 border rounded"
          />
          <div className="flex justify-between items-center">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {mode === "login" ? "Log In" : "Sign Up"}
            </button>
            <button
              type="button"
              onClick={closeAuth}
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-blue-500 hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-blue-500 hover:underline"
              >
                Log In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      {showAuth && <AuthModal />}
      <div className="pt-16 bg-white dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300 min-h-screen flex flex-col justify-between">
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="flex flex-col-reverse md:flex-row items-center justify-between px-6 py-16 max-w-7xl mx-auto gap-8">
            <div className="md:w-1/2 text-center md:text-left">
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">
                Practice. Compete. Conquer UPSC.
              </h2>
              <p className="text-lg mb-6">
                Join India's most active UPSC community for Prelims & Mains
                mock tests.
              </p>
              <button
                onClick={() =>
                  token ? navigate("/dashboard") : openAuth("signup")
                }
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                {token ? "Go to Dashboard" : "Get Started"}
              </button>
            </div>
            <div className="md:w-1/2 flex justify-center md:justify-end">
              <img
                src={heroImage}
                alt="UPSC preparation"
                className="w-full max-w-md h-auto"
              />
            </div>
          </section>

          {/* Core Features Section */}
          <section
            id="features"
            className="scroll-mt-16 px-6 py-12 bg-gray-50 dark:bg-gray-800"
          >
            <h3 className="text-3xl font-bold text-center mb-8">
              Core Features
            </h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  title: "Peer-Test Sharing",
                  desc: "Access mock tests created and shared by peers.",
                },
                {
                  title: "Timer & Leaderboard",
                  desc: "Attempt under timed conditions and see your rank.",
                },
                {
                  title: "Mains Answer Writing",
                  desc: "Write answers online or upload PDFs for review.",
                },
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-lg shadow-md bg-white dark:bg-gray-700 text-center hover:shadow-lg transition"
                >
                  <h4 className="text-xl font-semibold mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-sm">{feat.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Getting Started Section */}
          <section
            id="start"
            className="scroll-mt-16 px-6 py-12 bg-white dark:bg-gray-900"
          >
            <h3 className="text-3xl font-bold text-center mb-8">
              Getting Started
            </h3>
            <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto text-center">
              {[
                "Create or Select a Test",
                "Generate a Shareable Link",
                "Invite Peers & Attempt in Real-Time",
                "View Dashboard & Leaderboard",
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 border-l-4 border-blue-600 bg-gray-100 dark:bg-gray-800 rounded-md"
                >
                  <p className="font-semibold mb-1 text-blue-700 dark:text-blue-300">
                    Step {idx + 1}
                  </p>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Who We Are Section */}
          <section
            id="who"
            className="scroll-mt-16 px-6 py-12 bg-gray-100 dark:bg-gray-800"
          >
            <h3 className="text-3xl font-bold mb-4 text-center">
              Who We Are
            </h3>
            <p className="max-w-3xl mx-auto text-center">
              PrepArena is a student-first platform empowering UPSC aspirants
              with shared resources, realistic mocks, and a community-driven
              environment — free, inclusive, and peer-reviewed.
            </p>
          </section>
        </main>
        <footer className="text-center py-6 bg-gray-200 dark:bg-gray-700">
          <p className="text-sm">&copy; 2025 PrepArena. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
