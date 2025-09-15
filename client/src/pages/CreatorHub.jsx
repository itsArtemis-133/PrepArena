import React, { useState } from "react";
import { Crown, Users, BookOpen, Target, Star } from "lucide-react";

// Mock data - replace with API calls later
const featuredCreators = [
  {
    id: 1,
    name: "Dr. Anjali Verma",
    avatar: "https://i.pravatar.cc/150?img=1",
    specialization: "Modern History & Polity",
    rating: 4.9,
    totalStudents: 4120,
  },
  {
    id: 2,
    name: "Prof. Rohan Desai",
    avatar: "https://i.pravatar.cc/150?img=2",
    specialization: "Economics & Current Affairs",
    rating: 4.8,
    totalStudents: 3500,
  },
  {
    id: 3,
    name: "Dr. Priya Sharma",
    avatar: "https://i.pravatar.cc/150?img=3",
    specialization: "Geography & Environment",
    rating: 4.7,
    totalStudents: 2890,
  },
];

const topPerformingTests = [
  {
    id: 1,
    title: "Indian Polity Masterclass Series",
    creator: "Dr. Anjali Verma",
    price: "₹899",
    rating: 4.9,
    attempts: "5.2k",
  },
  {
    id: 2,
    title: "Complete Economic Survey & Budget 2025",
    creator: "Prof. Rohan Desai",
    price: "₹599",
    rating: 4.8,
    attempts: "4.8k",
  },
  {
    id: 3,
    title: "Environment & Ecology Prelims Booster",
    creator: "Dr. Priya Sharma",
    price: "₹799",
    rating: 4.7,
    attempts: "3.9k",
  },
];

const hubStats = {
  totalCreators: 156,
  totalTests: 1247,
  totalStudents: 15420,
};

const StatCard = ({ icon, label, value, note }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {icon}
    </div>
    <div className="mt-2">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p>
    </div>
  </div>
);

export default function CreatorHub() {
  const [activeTab, setActiveTab] = useState("creators");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Creator Hub</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Discover the best tests from our top educators.</p>
        </div>
        <button className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
          <Crown className="h-4 w-4 mr-2" />
          Become a Creator
        </button>
      </div>

      {/* Hub Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard icon={<Users className="h-5 w-5 text-gray-400" />} label="Active Creators" value={hubStats.totalCreators} note="+8 this month" />
        <StatCard icon={<BookOpen className="h-5 w-5 text-gray-400" />} label="Total Tests" value={hubStats.totalTests} note="+23 this week" />
        <StatCard icon={<Target className="h-5 w-5 text-gray-400" />} label="Students Enrolled" value={hubStats.totalStudents} note="+1.2k this month" />
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("creators")}
              className={`py-3 px-4 font-semibold text-sm rounded-t-lg transition-colors ${
                activeTab === "creators"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Top Creators
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`py-3 px-4 font-semibold text-sm rounded-t-lg transition-colors ${
                activeTab === "tests"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Trending Tests
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "creators" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCreators.map((creator) => (
                <div key={creator.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <img src={creator.avatar} alt={creator.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-indigo-200 dark:border-indigo-700" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{creator.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{creator.specialization}</p>
                  <div className="flex justify-center items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-yellow-500"><Star className="h-4 w-4 fill-current" /> {creator.rating}</span>
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><Users className="h-4 w-4" /> {creator.totalStudents.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "tests" && (
            <div className="space-y-4">
              {topPerformingTests.map((test, index) => (
                <div key={test.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-300 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-400 dark:text-gray-500 w-6 text-center">{index + 1}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{test.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">by {test.creator}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-3 sm:mt-0 text-sm ml-auto sm:ml-0 pl-10 sm:pl-0">
                    <span className="font-bold text-gray-800 dark:text-gray-100">{test.price}</span>
                    <span className="flex items-center gap-1 text-yellow-500"><Star className="h-4 w-4 fill-current" /> {test.rating}</span>
                    <span className="text-gray-500 dark:text-gray-400">{test.attempts} attempts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}