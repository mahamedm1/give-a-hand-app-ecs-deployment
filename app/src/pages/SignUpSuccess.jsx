import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import supabase from '../helper/supabaseClient';

const RESEND_COOLDOWN_SECONDS = 60;

function SignUpSuccess() {
  const location = useLocation();
  const email = location.state?.email || '';
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Supabase only allows one email per address per minute, so the resend
  // button unlocks after a short countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (resendError) throw resendError;
      setMessage('We sent another verification email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || 'Could not resend the email. Please try again shortly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-600 mb-2">Registration Successful!</h1>
          <p className="text-sm text-gray-500">
            Check your email to continue
          </p>
        </div>

        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-5">
            <svg className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Email Verification Required</div>
          <p className="text-gray-600 mb-4">
            Thank you for registering with Give a Hand. We've sent a confirmation email to{' '}
            {email ? <strong>{email}</strong> : 'your address'}.
          </p>
          <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-semibold">
              You must verify your email before you can log in.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Next steps:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-2">
            <li>Check your inbox (and spam folder) for a verification email</li>
            <li>Click the verification link in that email</li>
            <li>Come back and <Link to="/login" className="underline">log in</Link></li>
          </ol>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-center space-y-3">
          <p className="text-sm text-gray-600">
            <strong>Didn't receive an email?</strong>
          </p>
          {email ? (
            <button
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              className={`px-4 py-2 rounded-md text-white ${
                sending || cooldown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {sending ? 'Sending...' : cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
            </button>
          ) : (
            <p className="text-sm text-gray-600">Check your spam folder, or sign up again with the same email.</p>
          )}
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default SignUpSuccess;
