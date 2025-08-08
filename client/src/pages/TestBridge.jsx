import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserCircleIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

dayjs.extend(relativeTime);

export default function TestBridge() {
  // Use the "link" param (not testId)
  const { link } = useParams(); // from URL: /test/:link
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("Details");

  // Timer to update UI every 10s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch test and registration info
  useEffect(() => {
    async function fetchTest() {
      try {
        setLoading(true);
        setError("");
        // 1. Fetch test details
        const { data } = await axios.get(`/test/public/${link}`);
        setTest(data.test);
        // 2. Fetch registration status (auth required)
        const { data: reg } = await axios.get(`/test/registered/${link}`);
        setRegistered(!!reg.registered);
      } catch {
        setError("Test not found or access denied.");
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [link]);

  // Register button handler
  const handleRegister = async () => {
    try {
      await axios.post(`/test/register/${link}`);
      setRegistered(true);
    } catch {
      setError("Registration failed. Please login and try again.");
    }
  };

  // --- Time status
  if (!test)
    return (
      <div className="min-h-screen flex justify-center items-center text-lg">
        {loading ? "Loading..." : error}
      </div>
    );
  const nowTime = dayjs(now);
  const startTime = dayjs(test.scheduledDate);
  const duration = test.duration || 60;
  const endTime = startTime.add(duration, "minute");

  const isUpcoming = nowTime.isBefore(startTime);
  const isActive = nowTime.isAfter(startTime) && nowTime.isBefore(endTime);
  const isFinished = nowTime.isAfter(endTime);

  // --- Button, badge, status
  function renderMainAction() {
    if (isUpcoming && !registered) {
      return (
        <button
          onClick={handleRegister}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow hover:bg-blue-700 transition"
        >
          Register for Test
        </button>
      );
    }
    if (isUpcoming && registered) {
      return (
        <div className="w-full py-3 rounded-xl bg-green-100 text-green-800 text-center font-semibold shadow">
          Registered! Test starts in {startTime.from(nowTime, true)}
        </div>
      );
    }
    if (isActive && registered) {
      return (
        <button
          onClick={() => navigate(`/tests/${test.link}/take`)}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow hover:bg-green-700 transition"
        >
          Enter Test
        </button>
      );
    }
    if (isFinished) {
      return (
        <button
          onClick={() => navigate(`/test/${test.link}/result`)}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 transition"
        >
          View Results & Leaderboard
        </button>
      );
    }
    return null;
  }

  // --- Badge (public/private)
  function VisibilityBadge() {
    return test.isPublic ? (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        <GlobeAltIcon className="h-4 w-4" /> Public
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
        <LockClosedIcon className="h-4 w-4" /> Private
      </span>
    );
  }

  // --- Tab contents
  function renderTabPanel() {
    if (activeTab === "Details") {
      return (
        <div className="pt-4">
          <div className="text-lg font-bold mb-2">Test Description</div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-700 dark:text-gray-200 min-h-[48px]">
            {test.description || "No description provided."}
          </div>
        </div>
      );
    }
    if (activeTab === "Instructions") {
      return (
        <div className="pt-4">
          <div className="text-lg font-bold mb-2">Instructions</div>
          <ul className="list-disc ml-5 text-gray-700 dark:text-gray-200 space-y-2">
            <li>Be ready with a stable internet connection before the test starts.</li>
            <li>Test will become accessible exactly at the scheduled time.</li>
            <li>Mark one answer for each question. Unattempted will not be penalized.</li>
            <li>Each correct answer gives +2, each incorrect -0.66. No negative for unattempted.</li>
            <li>Test is auto-submitted when timer ends.</li>
            <li>Do not reload/close tab during the test.</li>
            <li>Contact support if you face technical issues.</li>
          </ul>
        </div>
      );
    }
    if (activeTab === "Leaderboard") {
      return (
        <div className="pt-4">
          <div className="text-lg font-bold mb-2">Leaderboard (Coming Soon)</div>
          <div className="text-gray-400">Leaderboard/results will appear after test ends.</div>
        </div>
      );
    }
    return null;
  }

  // --- UI ---
  return (
    <div className="bg-gradient-to-tr from-blue-50 via-indigo-50 to-blue-100 dark:from-gray-900 dark:via-gray-950 dark:to-slate-900 min-h-screen pb-20">
      <div className="max-w-3xl mx-auto pt-24 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-7">
          {/* Top Row: Logo/Icon & Title */}
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 flex items-center justify-center bg-blue-100 dark:bg-gray-900 rounded-2xl text-3xl font-extrabold text-blue-700 dark:text-blue-300 shadow-lg">
              {test.subject?.[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {test.title}
              </h1>
              <div className="flex gap-2 mt-1 items-center">
                <span className="text-blue-500 font-medium">{test.subject}</span>
                <span className="text-gray-400">|</span>
                <span className="text-indigo-500 font-medium">{test.type}</span>
                <span className="text-gray-400">|</span>
                <span className="text-indigo-400 font-medium">{test.testMode}</span>
                <span className="ml-2"><VisibilityBadge /></span>
              </div>
            </div>
          </div>

          {/* Meta Info Row */}
          <div className="flex flex-wrap gap-6 text-gray-600 dark:text-gray-300 text-base font-medium items-center">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5" />
              {dayjs(test.scheduledDate).format("DD MMM YYYY, HH:mm")}
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              {test.duration} min
            </div>
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              {test.questionCount} Qs
            </div>
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5" />
              {test.createdBy?.username || "—"}
            </div>
          </div>

          {/* Status Badge & Action */}
          <div>{renderMainAction()}</div>
          {error && (
            <div className="text-red-600 text-center font-medium mt-1">{error}</div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-1">
              {["Details", "Instructions", "Leaderboard"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    "py-2 px-5 font-semibold rounded-t-lg transition-all " +
                    (activeTab === tab
                      ? "bg-blue-100 dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow"
                      : "text-gray-500 hover:text-blue-600 dark:hover:text-blue-300")
                  }
                  disabled={tab === "Leaderboard" && !isFinished}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          <div>{renderTabPanel()}</div>
        </div>
      </div>
    </div>
  );
}
