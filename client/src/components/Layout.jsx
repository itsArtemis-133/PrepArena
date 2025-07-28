// client/src/components/Layout.jsx
import React from 'react';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="pt-4">
        {children}
      </main>
    </div>
  );
}
