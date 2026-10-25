import React, { useState } from 'react';
import {
  AtSign,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import type { SignupPayload, UserProfile } from '../types/altaria';
import { OrbitalHorizonBackdrop, SatelliteLogoIcon } from './BrandMark';

interface AuthViewsProps {
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onAuthenticated: (user: UserProfile) => void;
}

const QUALIFICATIONS = [
  'B.E. Computer Engineering',
  'B.Tech Computer Science',
  'M.Tech Geoinformatics',
  'M.S. Remote Sensing & GIS',
  'Ph.D. Earth Observation',
  'B.Sc. Data Science',
];

const DESIGNATIONS = [
  'Student',
  'Research Scholar',
  'Remote Sensing Analyst',
  'Assistant Professor',
  'GIS Engineer',
];

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Aerospace & Geomatics',
  'Earth & Atmospheric Sciences',
];

export function AuthViews({
  mode,
  onSwitchMode,
  onAuthenticated,
}: AuthViewsProps) {
  // Login state (pre-filled with seeded student researcher profile for 1-click evaluation)
  const [identifier, setIdentifier] = useState('omkar.bendre@example.com');
  const [password, setPassword] = useState('altaria2026');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot password inline mode
  const [resetOpen, setResetOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('omkar.bendre@example.com');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Signup state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [qualification, setQualification] = useState(QUALIFICATIONS[0]);
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [contact, setContact] = useState('');
  const [organization, setOrganization] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to sign in. Please verify your credentials.');
        return;
      }
      onAuthenticated(data.user as UserProfile);
    } catch {
      setError('Network error while connecting to authentication service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not update password.');
        return;
      }
      setPassword(resetNewPassword);
      setIdentifier(resetIdentifier);
      setResetMessage(data.message || 'Password updated.');
      setTimeout(() => {
        setResetOpen(false);
        setResetMessage(null);
      }, 1100);
    } catch {
      setError('Network error while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match. Please confirm your password.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: SignupPayload = {
        fullName,
        username,
        email,
        password: signupPassword,
        qualification,
        designation,
        department,
        contact: contact || '+91 98765 43210',
        organization: organization || 'Dr. Vithalrao Vikhe Patil COE, Ahmednagar',
      };
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }
      onAuthenticated(data.user as UserProfile);
    } catch {
      setError('Network error while creating account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'login') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#060E1A] text-[#E6EEF8]">
        {/* Full-bleed orbital Earth limb canvas */}
        <div className="absolute inset-0">
          <OrbitalHorizonBackdrop variant="left-limb" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-screen max-w-[1380px] grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-12 lg:px-12">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 lg:pr-6">
            <div className="flex items-center gap-3.5">
              <SatelliteLogoIcon size={40} />
              <span className="text-4xl font-bold tracking-tight text-white">
                Altaria
              </span>
            </div>

            <h1 className="mt-5 max-w-lg text-xl font-medium leading-relaxed text-[#D5E3F3] [text-wrap:balance] sm:text-2xl">
              A Deep Learning Framework for Cloud and Fog Removal in Satellite Imagery
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#94ACC6]">
              Multi-temporal optical satellite restoration, atmospheric obstruction mapping, and quantitative image reconstruction.
            </p>
          </div>

          {/* Right Sign-In Card */}
          <div className="lg:col-span-6 lg:flex lg:justify-end">
            <div className="w-full max-w-[460px] rounded-xl border border-[#19304B] bg-[#081322]/95 p-8 sm:p-10">
              {!resetOpen ? (
                <>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      Welcome Back
                    </h2>
                    <p className="mt-1.5 text-sm text-[#8DA5BF]">
                      Sign in to continue to Altaria
                    </p>
                  </div>

                  {error && (
                    <div className="mt-5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="mt-7 space-y-5">
                    <div>
                      <label
                        htmlFor="login-identifier"
                        className="block text-xs font-medium text-[#C5D6E8]"
                      >
                        Username / Email
                      </label>
                      <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3.5 py-2.5 focus-within:border-[#0EA5E9]">
                        <Mail className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                        <input
                          id="login-identifier"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter your email or username"
                          className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-medium text-[#C5D6E8]"
                      >
                        Password
                      </label>
                      <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3.5 py-2.5 focus-within:border-[#0EA5E9]">
                        <Lock className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                        <input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                          className="text-[#6F8BA8] transition-colors hover:text-[#CFE0F2] focus-visible:outline-none"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setResetOpen(true);
                          }}
                          className="text-xs font-medium text-[#38BDF8] transition-colors hover:text-[#7DD3FC] whitespace-nowrap shrink-0"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      {submitting ? 'Signing in...' : 'Login'}
                    </button>
                  </form>

                  <div className="mt-6 text-center text-xs text-[#8DA5BF]">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        onSwitchMode('signup');
                      }}
                      className="font-semibold text-[#38BDF8] transition-colors hover:text-[#7DD3FC] whitespace-nowrap"
                    >
                      Sign Up
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      Reset Account Password
                    </h2>
                    <p className="mt-1.5 text-sm text-[#8DA5BF]">
                      Enter your registered email or username to set a new password.
                    </p>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
                      {error}
                    </div>
                  )}
                  {resetMessage && (
                    <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-200">
                      {resetMessage}
                    </div>
                  )}

                  <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#C5D6E8]">
                        Username / Email
                      </label>
                      <div className="mt-1.5 flex items-center gap-2.5 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3.5 py-2.5">
                        <Mail className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                        <input
                          type="text"
                          value={resetIdentifier}
                          onChange={(e) => setResetIdentifier(e.target.value)}
                          className="w-full bg-transparent text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#C5D6E8]">
                        New Password
                      </label>
                      <div className="mt-1.5 flex items-center gap-2.5 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3.5 py-2.5">
                        <Lock className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                        <input
                          type="password"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetOpen(false);
                          setError(null);
                        }}
                        className="flex-1 rounded-lg border border-[#223E5E] bg-[#0C1B2E] px-4 py-2.5 text-xs font-medium text-[#D5E3F3] transition-colors hover:border-[#345B87] whitespace-nowrap shrink-0"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Create Your Altaria Account
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060E1A] text-[#E6EEF8]">
      <div className="absolute inset-0">
        <OrbitalHorizonBackdrop variant="left-limb" />
      </div>

      {/* Top Subtle Brand Header matching Screen 2 */}
      <header className="relative z-10 mx-auto flex max-w-[1380px] items-center justify-between gap-8 px-6 py-5 lg:px-12">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <SatelliteLogoIcon size={26} />
          <span className="text-xl font-bold tracking-tight text-white">Altaria</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            onSwitchMode('login');
          }}
          className="rounded-lg border border-[#213B5A] bg-[#0B1829]/90 px-4 py-2 text-xs font-medium text-[#D5E3F3] transition-colors hover:border-[#355D8A] hover:text-white whitespace-nowrap shrink-0"
        >
          Back to Login
        </button>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1380px] grid-cols-1 items-center gap-8 px-6 pb-12 pt-2 lg:grid-cols-12 lg:px-12">
        {/* Left Orbital Copy */}
        <div className="lg:col-span-5">
          <p className="text-xs font-medium text-[#7DD3FC]">
            Deep Learning Framework for Satellite Imagery
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-4xl">
            Create Your Altaria Account
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#9BB2CB]">
            Join us in building a clearer view of our planet through multi-temporal cloud and atmospheric fog restoration.
          </p>
        </div>

        {/* Right 2-Column Registration Form */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-[#19304B] bg-[#081322]/95 p-6 sm:p-8">
            {error && (
              <div className="mb-5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Full Name
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <User className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Username
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <AtSign className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Email
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <Mail className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Password
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <Lock className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type={showSignupPass ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPass((v) => !v)}
                      aria-label="Toggle password visibility"
                      className="text-[#6F8BA8] hover:text-[#CFE0F2]"
                    >
                      {showSignupPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Confirm Password
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <Lock className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      aria-label="Toggle confirm password visibility"
                      className="text-[#6F8BA8] hover:text-[#CFE0F2]"
                    >
                      {showConfirmPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Designation
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2.5 text-sm text-white focus:border-[#0EA5E9] focus:outline-none"
                  >
                    {DESIGNATIONS.map((item) => (
                      <option key={item} value={item} className="bg-[#0B192C]">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qualification */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Qualification
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2.5 text-sm text-white focus:border-[#0EA5E9] focus:outline-none"
                  >
                    {QUALIFICATIONS.map((item) => (
                      <option key={item} value={item} className="bg-[#0B192C]">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2.5 text-sm text-white focus:border-[#0EA5E9] focus:outline-none"
                  >
                    {DEPARTMENTS.map((item) => (
                      <option key={item} value={item} className="bg-[#0B192C]">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Contact Number
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <Phone className="h-4 w-4 shrink-0 text-[#6F8BA8]" />
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Enter contact number (e.g. +91 98765 43210)"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Organization / College */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#C5D6E8]">
                    Organization / College{' '}
                    <span className="font-normal text-[#7893AF]">(Optional)</span>
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#1E3856] bg-[#0B192C] px-3 py-2 focus-within:border-[#0EA5E9]">
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Enter organization or college"
                      className="w-full bg-transparent text-sm text-white placeholder-[#5D7896] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom CTA Row */}
              <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    onSwitchMode('login');
                  }}
                  className="rounded-lg border border-[#233F5F] bg-[#0B192C] px-4 py-2.5 text-sm font-medium text-[#D5E3F3] transition-colors hover:border-[#38618E] hover:text-white whitespace-nowrap shrink-0"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
