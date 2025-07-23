// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage  from './pages/LandingPage';
import Dashboard    from './pages/Dashboard';
import TestsCreation from './pages/TestsCreation';
import TestRunner    from './pages/TestRunner';

const App = () => (
  <Routes>
    {/* Public Landing */}
    <Route path="/" element={<LandingPage />} />

    {/* Protected Dashboard */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />

    {/* Create a new test */}
    <Route
      path="/tests/create"
      element={
        <ProtectedRoute>
          <TestsCreation />
        </ProtectedRoute>
      }
    />

    {/* Take a test via shareable link */}
    <Route
      path="/tests/:id/take"
      element={
        <ProtectedRoute>
          <TestRunner />
        </ProtectedRoute>
      }
    />

    {/* Fallback to landing for any other route */}
    <Route path="*" element={<LandingPage />} />
  </Routes>
);

export default App;