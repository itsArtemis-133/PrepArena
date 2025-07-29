// client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout        from './components/Layout';

import LandingPage   from './pages/LandingPage';
import Dashboard     from './pages/Dashboard';
import TestsCreation from './pages/TestsCreation';
import TestRunner    from './pages/TestRunner';

export default function App() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Create new test */}
      <Route
        path="/tests/create"
        element={
          <ProtectedRoute>
            <Layout>
              <TestsCreation />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Take a test by link/code */}
      <Route
        path="/tests/:link/take"
        element={
          <ProtectedRoute>
            <Layout>
              <TestRunner />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
