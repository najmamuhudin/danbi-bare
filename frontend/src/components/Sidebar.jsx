import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Activity, CircleHelp, Clock, FileSearch, Settings, UserCircle, UserCog } from 'lucide-react';
import { canViewAdmin, canViewDashboard, canViewPoliceInvestigatorTools } from '../utils/roles';

const getLinkClass = (isActive, emphasis = false) => (
  `flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all ${
    isActive
      ? emphasis
        ? 'border-primary/30 bg-primary/20 font-medium text-primary'
        : 'border-transparent bg-white/10 font-medium text-white'
      : 'border-transparent text-textMuted hover:bg-white/5 hover:text-white'
  }`
);

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return null;
  }

  const links = [
    ...(canViewDashboard(user.role) ? [{ to: '/dashboard', label: 'Dashboard', icon: Activity }] : []),
    
    { to: '/analyze', label: 'Analyze', icon: FileSearch, emphasis: true },
    ...(canViewAdmin(user.role) ? [{ to: '/admin', label: 'Admin', icon: UserCog, emphasis: true }] : []),
    { to: '/history', label: 'History', icon: Clock },
    { to: '/profile', label: 'Profile', icon: UserCircle },
    ...(canViewPoliceInvestigatorTools(user.role)
      ? [
          { to: '/police-settings', label: 'Settings', icon: Settings },
          { to: '/police-help', label: 'Help / Guide', icon: CircleHelp },
        ]
      : []),
  ];

  return (
    <aside className="relative z-20 border-b border-white/10 bg-surface/80 px-3 py-3 backdrop-blur-lg lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="App navigation">
        {links.map(({ to, label, icon: Icon, emphasis }) => (
          <NavLink key={to} to={to} className={({ isActive }) => getLinkClass(isActive, emphasis)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
