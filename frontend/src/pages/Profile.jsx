import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  CircleHelp,
  Clock,
  FileSearch,
  Mail,
  Settings,
  Shield,
  User,
  UserCog,
} from 'lucide-react';
import { BrandLogo } from '../components/Logo';
import { canViewAdmin, canViewDashboard, canViewPoliceInvestigatorTools, ROLE_LABELS } from '../utils/roles';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'User';
  const capabilities = [
    { label: 'Analyze text, URL, file, and batch data', enabled: true },
    { label: 'View personal prediction history', enabled: true },
    { label: 'Open operational dashboard', enabled: canViewDashboard(user?.role) },
    { label: 'Manage users and system roles', enabled: canViewAdmin(user?.role) },
    { label: 'Use police settings and help guide', enabled: canViewPoliceInvestigatorTools(user?.role) },
  ];

  const actions = [
    { to: '/analyze', label: 'Analyze', icon: FileSearch },
    { to: '/history', label: 'History', icon: Clock },
    ...(canViewDashboard(user?.role) ? [{ to: '/dashboard', label: 'Dashboard', icon: Activity }] : []),
    ...(canViewAdmin(user?.role) ? [{ to: '/admin', label: 'Admin Panel', icon: UserCog }] : []),
    ...(canViewPoliceInvestigatorTools(user?.role)
      ? [
          { to: '/police-settings', label: 'Settings', icon: Settings },
          { to: '/police-help', label: 'Help / Guide', icon: CircleHelp },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
          <p className="mt-2 text-sm text-textMuted">Account details and role permissions for this system user.</p>
        </div>
        <BrandLogo />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black text-white">{user?.name || 'System User'}</h2>
              <p className="mt-1 text-sm font-semibold text-primary">{roleLabel}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <BadgeCheck className="h-4 w-4" />
                Active account
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <ProfileField icon={Mail} label="Email" value={user?.email || 'Not available'} />
            <ProfileField icon={Shield} label="Role" value={roleLabel} />
            <ProfileField icon={UserCog} label="User ID" value={user?._id || user?.id || 'Not available'} />
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <h2 className="text-lg font-bold text-white">Role access</h2>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">
            This profile shows what the current account can access inside Dambi Baare AI.
          </p>

          <div className="mt-5 grid gap-3">
            {capabilities.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border px-4 py-3 ${
                  item.enabled
                    ? 'border-success/20 bg-success/10 text-success'
                    : 'border-white/10 bg-white/5 text-textMuted'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs font-bold uppercase">{item.enabled ? 'Allowed' : 'Restricted'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-20 items-center gap-3 rounded-lg border border-white/10 bg-surface/70 px-4 py-3 text-textMuted transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const ProfileField = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textMuted">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <div className="break-words text-sm font-semibold text-white">{value}</div>
  </div>
);

export default Profile;
