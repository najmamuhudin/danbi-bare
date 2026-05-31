import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Eye,
  Globe2,
  KeyRound,
  Languages,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { changePassword } from '../api';

const SETTINGS_KEY = 'crimewatch_police_settings';
const THEME_KEY = 'crimewatch_theme';

const defaultSettings = {
  language: 'en',
  privacy: {
    activityLog: true,
    maskSensitiveData: true,
    investigationAlerts: true,
  },
};

const getStoredSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
    return defaultSettings;
  }
};

const getStoredTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

const PoliceSettings = () => {
  const [settings, setSettings] = useState(getStoredSettings);
  const [theme, setTheme] = useState(getStoredTheme);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const updatePrivacy = (key) => {
    setSettings((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        [key]: !current.privacy[key],
      },
    }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (passwordForm.newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Password update failed.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Police Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-textMuted">
          Manage account security, display preferences, language, and investigation privacy options.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="glass-panel p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Password change</h2>
              <p className="text-sm text-textMuted">Update your login password securely.</p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
            <PasswordInput
              label="Current password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
            />
            <PasswordInput
              label="New password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordInput
              label="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
            />

            {status.message && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                  status.type === 'success'
                    ? 'border-success/20 bg-success/10 text-success'
                    : 'border-danger/20 bg-danger/10 text-danger'
                }`}
              >
                {status.message}
              </div>
            )}

            <button type="submit" className="btn-primary w-full sm:w-fit" disabled={isSavingPassword}>
              <Lock className="h-4 w-4" />
              {isSavingPassword ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Display preferences</h2>
              <p className="text-sm text-textMuted">Theme and language for the investigator workspace.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Globe2 className="h-4 w-4 text-primary" />
                Theme
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton active={theme === 'dark'} icon={Moon} label="Dark" onClick={() => setTheme('dark')} />
                <ChoiceButton active={theme === 'light'} icon={Sun} label="Light" onClick={() => setTheme('light')} />
              </div>
            </div>

            <label className="rounded-lg border border-white/10 bg-white/5 p-4">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Languages className="h-4 w-4 text-primary" />
                Language
              </span>
              <select
                className="glass-input"
                value={settings.language}
                onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}
              >
                <option value="en">English</option>
                <option value="so">Somali</option>
                <option value="ar">Arabic</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <section className="mt-6 glass-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Privacy preferences</h2>
            <p className="text-sm text-textMuted">Control how investigation activity and sensitive data are handled.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ToggleRow
            checked={settings.privacy.activityLog}
            icon={CheckCircle2}
            label="Save activity log"
            onChange={() => updatePrivacy('activityLog')}
          />
          <ToggleRow
            checked={settings.privacy.maskSensitiveData}
            icon={Eye}
            label="Mask sensitive data"
            onChange={() => updatePrivacy('maskSensitiveData')}
          />
          <ToggleRow
            checked={settings.privacy.investigationAlerts}
            icon={Bell}
            label="Investigation alerts"
            onChange={() => updatePrivacy('investigationAlerts')}
          />
        </div>
      </section>
    </div>
  );
};

const PasswordInput = ({ label, value, onChange }) => (
  <label>
    <span className="mb-2 block text-sm font-semibold text-textMuted">{label}</span>
    <input
      className="glass-input"
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="new-password"
      required
    />
  </label>
);

const ChoiceButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'border-primary/30 bg-primary/20 text-primary'
        : 'border-white/10 bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const ToggleRow = ({ checked, icon: Icon, label, onChange }) => (
  <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
    <span className="flex items-center gap-3 text-sm font-semibold text-white">
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </span>
    <input className="h-5 w-5 accent-primary" type="checkbox" checked={checked} onChange={onChange} />
  </label>
);

export default PoliceSettings;
