// src/pages/Dashboard.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import TestsList from './TestsList';

export default function Dashboard() {
  const { token } = useAuth();

  useEffect(() => {
    console.log('🛠 Dashboard mounted; token=', token);
  }, [token]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
      <TestsList />
    </div>
  );
}
