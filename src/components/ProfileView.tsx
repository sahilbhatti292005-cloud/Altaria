import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { UserProfile } from '../types/altaria';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onBackToDashboard: () => void;
  onLogout: () => void;
}

export function ProfileView({
  user,
  onUpdateUser,
  onBackToDashboard,
  onLogout,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    contact: user.contact,
    qualification: user.qualification,
    designation: user.designation,
    department: user.department,
    organization: user.organization,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUpdateUser(data.user as UserProfile);
        setIsEditing(false);
        setStatusMessage('Profile information saved.');
      }
    } catch {
      setStatusMessage('Unable to reach server; changes kept locally.');
      onUpdateUser({ ...user, ...form });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<{
    key: keyof typeof form;
    label: string;
    mono?: boolean;
  }> = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'username', label: 'Username', mono: true },
    { key: 'email', label: 'Email' },
    { key: 'contact', label: 'Contact Number', mono: true },
    { key: 'qualification', label: 'Qualification' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Department' },
    { key: 'organization', label: 'Organization / College' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-[#8EA6C0]">
          View and manage your profile information.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200">
          {statusMessage}
        </div>
      )}

      {/* Main Profile Split Container matching Screen 7 */}
      <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Avatar Summary Column */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-[#172C46] bg-[#081322] p-6 text-center lg:col-span-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#284B73] bg-[#10253E] text-[#7DD3FC]">
                <User className="h-11 w-11" />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-white">
                {user.fullName}
              </h2>
              <p className="mt-1 text-xs text-[#88A2BE]">{user.email}</p>

              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusMessage(null);
                      setIsEditing(true);
                    }}
                    className="rounded-lg bg-[#0EA5E9] px-5 py-2 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          fullName: user.fullName,
                          username: user.username,
                          email: user.email,
                          contact: user.contact,
                          qualification: user.qualification,
                          designation: user.designation,
                          department: user.department,
                          organization: user.organization,
                        });
                        setIsEditing(false);
                      }}
                      className="rounded-lg border border-[#223F60] bg-[#0B1829] px-4 py-2 text-xs font-medium text-[#DCE8F5] hover:border-[#38BDF8] whitespace-nowrap shrink-0"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Profile Information Table */}
            <div className="rounded-lg border border-[#172C46] bg-[#081322] p-6 lg:col-span-8">
              <h3 className="border-b border-[#152840] pb-3 text-sm font-semibold text-white">
                Profile Information
              </h3>

              <dl className="mt-4 divide-y divide-[#13253C]">
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-1 items-center gap-1 py-2.5 sm:grid-cols-12 sm:gap-4"
                  >
                    <dt className="text-xs font-medium text-[#8EA6C0] sm:col-span-5">
                      {row.label} :
                    </dt>
                    <dd className="text-xs text-white sm:col-span-7">
                      {isEditing ? (
                        <input
                          type="text"
                          value={form[row.key]}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              [row.key]: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-[#1F3A58] bg-[#0B1829] px-2.5 py-1.5 text-xs text-white focus:border-[#0EA5E9] focus:outline-none"
                        />
                      ) : (
                        <span
                          className={
                            row.mono ? 'font-mono tabular-nums text-[#E6EEF8]' : 'text-[#E6EEF8]'
                          }
                        >
                          {user[row.key]}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </form>

        {/* Bottom Navigation & Logout Row matching Screen 7 */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="rounded-lg border border-[#223F60] bg-[#081322] px-5 py-2.5 text-xs font-semibold text-[#E6EEF8] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
          >
            Back to Dashboard
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg bg-[#B91C1C] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#DC2626] whitespace-nowrap shrink-0"
          >
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
