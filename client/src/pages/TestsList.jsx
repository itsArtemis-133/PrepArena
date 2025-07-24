// src/components/TestsList.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function TestsList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('🛠 TestsList render; token=', token);

  useEffect(() => {
    console.log('🔍 TestsList useEffect firing…');
    (async () => {
      try {
        const API = '/api/test';
        const res = await fetch(API, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('📬 Response status:', res.status);

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const { tests } = await res.json();
        console.log('✅ Got tests:', tests);
        setTests(tests);
      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <p>Loading your tests…</p>;
  if (error)   return <p className="text-red-500">Error: {error}</p>;

  const shareLink = (link) => {
    const url = `${window.location.origin}/tests/${link}/take`;
    navigator.clipboard.writeText(url);
    alert('Copied to clipboard');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Ongoing Tests</h2>
        <button
          onClick={() => navigate('/tests/create')}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Create New Test
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {tests.map((t) => (
          <div
            key={t._id}
            className="p-4 border rounded shadow bg-white dark:bg-gray-800"
          >
            <h3 className="font-semibold">{t.title}</h3>
            <p className="text-sm mb-2">{t.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/tests/${t.link}/take`)}
                className="text-blue-600 underline"
              >
                Attempt
              </button>
              <button
                onClick={() => shareLink(t.link)}
                className="px-2 bg-blue-500 text-white rounded"
              >
                Share
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
