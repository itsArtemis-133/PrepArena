// src/pages/Dashboard.jsx
import React from 'react';
import TestsList from '../components/TestsList';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
      <TestsList />
    </div>
  );
}