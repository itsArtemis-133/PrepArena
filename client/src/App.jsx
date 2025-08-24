// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LandingPage   from "./pages/LandingPage";
import Dashboard     from "./pages/Dashboard";
import TestsCreation from "./pages/TestsCreation";
import TestBridge    from "./pages/TestBridge";
import TestRunner    from "./pages/TestRunner";

import Tests         from "./pages/Tests";     // public tests directory
import Results       from "./pages/Results";   // protected, user’s results

export default function App() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* All pages below share Layout (Header inside Layout) */}
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route path="/tests" element={<Tests />} />
        <Route path="/test/:link" element={<TestBridge />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/results" element={<Results />} />
          <Route path="/tests/create" element={<TestsCreation />} />
          <Route path="/tests/:link/take" element={<TestRunner />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
