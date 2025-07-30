// client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage   from './pages/LandingPage';
import Dashboard     from './pages/Dashboard';
import TestsCreation from './pages/TestsCreation';
import TestRunner    from './pages/TestRunner';
import Layout        from './components/Layout';

const App = () => (
  <Routes>
    {/* Public Landing (no header override) */}
    <Route path="/" element={<LandingPage />} />

    {/* All protected routes share the Layout + Header */}
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

    {/* ← Changed :id to :link here */}
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

export default App;
