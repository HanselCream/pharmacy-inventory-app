'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

const handleLogin = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = '/pos';
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#EFF6FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 4px 24px rgba(37,99,235,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1D4ED8', margin: 0 }}>
            PharmaTrack
          </h1>
          <p style={{ color: '#6B7280', marginTop: '4px', fontSize: '14px' }}>
            Pharmacy Inventory System
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            backgroundColor: '#1D4ED8',
            color: 'white',
            padding: '11px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}