// client/src/components/Layout.jsx
import React from 'react';
import Header from './Header';


export default function Layout({ children }) {
  return (
    <>
      <Header />
      {/* Header is h-20 (80px) tall; push content down and fill remaining height */}
      <main
        className="pt-20 h-[calc(100vh-80px)] overflow-hidden"
      >
        {children}
      </main>
    </>
  );
}

