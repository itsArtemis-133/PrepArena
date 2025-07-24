// src/pages/TestsCreation.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const TestsCreation = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', type:'', testMode:'', testLength:'', scheduledDate:'', pdf: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Create failed');
      navigate(`/tests/${data.test.link}/take`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">Create New Test</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {Object.entries(form).map(([key, val]) => (
          <div key={key} className="mb-4">
            <label className="block mb-1 capitalize">{key}</label>
            <input
              name={key}
              value={val}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
          {loading ? 'Creating…' : 'Create Test'}
        </button>
      </form>
    </div>
  );
};

export default TestsCreation;