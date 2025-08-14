// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import LandingPage   from "./pages/LandingPage";
import Dashboard     from "./pages/Dashboard";
import TestsCreation from "./pages/TestsCreation";
import TestBridge    from "./pages/TestBridge";
import TestRunner    from "./pages/TestRunner";

export default function App() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* All pages below share Layout (Header lives inside Layout) */}
      <Route element={<Layout />}>
        {/* Public: anyone with the link can view Bridge */}
        <Route path="/test/:link" element={<TestBridge />} />

        {/* Protected group (must be logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tests/create" element={<TestsCreation />} />
          <Route path="/tests/:link/take" element={<TestRunner />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
