// src/components/TestsList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const TestsList = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch('/tests/available', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch tests');
        const data = await res.json();
        setTests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [token]);

  const handleShare = (id) => {
    const url = `${window.location.origin}/tests/${id}/take`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard');
  };

  const handleCreate = () => {
    navigate('/tests/create');
  };

  if (loading) return <div className="p-6 text-center">Loading tests...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ongoing Tests</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Create New Test
        </button>
      </div>
      {tests.length === 0 ? (
        <p className="text-center text-gray-500">No tests available.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.id}
              className="p-4 border rounded-lg shadow hover:shadow-md transition bg-white dark:bg-gray-800"
            >
              <h3 className="text-xl font-semibold mb-2">{test.title}</h3>
              {test.description && <p className="text-sm mb-4">{test.description}</p>}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => navigate(`/tests/${test.id}/take`)}
                  className="text-blue-600 hover:underline"
                >
                  Attempt
                </button>
                <button
                  onClick={() => handleShare(test.id)}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  Share Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestsList;