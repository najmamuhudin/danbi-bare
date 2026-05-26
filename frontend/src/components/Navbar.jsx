import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Home,
  LogIn,
  LogOut,
  Menu,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { logout } from '../redux/authSlice';
import { ROLE_LABELS } from '../utils/roles';
import { BrandLogo } from './Logo';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';

const getLinkClass = (isActive, emphasis = false, mobile = false) => (
  `flex items-center gap-2 rounded-lg transition-all ${
    mobile ? 'px-3 py-3 text-sm' : 'px-3 py-2 text-sm lg:px-4'
  } ${
    isActive
      ? emphasis
        ? 'bg-primary/20 text-primary font-medium border border-primary/30'
        : 'bg-white/10 text-white font-medium border border-transparent'
      : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'
  }`
);

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const handleLogout = () => {
    dispatch(logout());
    setMobileOpen(false);
    navigate('/login');
  };

  const links = user
    ? []
    : [
        { to: '/', label: 'Home', icon: Home },
        { to: '/team', label: 'Team', icon: Users },
      ];

  const authLinks = user
    ? []
    : [
        { to: '/login', label: 'Log in', icon: LogIn },
        { to: '/register', label: 'Register', icon: UserPlus, emphasis: true },
      ];

  const renderLink = ({ to, label, icon: Icon, emphasis }, mobile = false) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => mobile && setMobileOpen(false)}
      className={({ isActive }) => getLinkClass(isActive, emphasis, mobile)}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={mobile ? 'inline' : 'hidden lg:inline'}>{label}</span>
    </NavLink>
  );

  if (isAuthPage) {
    const authPageLinks = [
      { to: '/', label: 'Back home', icon: ArrowLeft },
      { to: '/login', label: 'Log in', icon: LogIn },
      { to: '/register', label: 'Register', icon: UserPlus, emphasis: true },
    ];

    return (
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-surface/90 shadow-lg backdrop-blur-lg">
        <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <NavLink to="/" className="group flex min-w-0 shrink-0 items-center gap-3">
            <BrandLogo />
          </NavLink>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {authPageLinks.map(({ to, label, icon: Icon, emphasis }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => getLinkClass(isActive, emphasis)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-surface/90 shadow-lg backdrop-blur-lg">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:min-h-20">
        <NavLink
          to="/"
          className="group flex min-w-0 shrink-0 items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <BrandLogo />
        </NavLink>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
          {links.map((link) => renderLink(link))}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:border-l md:border-white/10 md:pl-3 lg:pl-5">
          <ThemeToggle />
          {user && <NotificationCenter />}

          {user ? (
            <>
              <div className="hidden xl:block text-right">
                <div className="max-w-36 truncate text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-textMuted">{ROLE_LABELS[user.role]}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-textMuted transition-all hover:bg-white/5 hover:text-white md:flex"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Log out</span>
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              {authLinks.map((link) => renderLink(link))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-textMuted transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-surface/95 px-3 pb-4 pt-2 shadow-lg md:hidden">
          <div className="grid gap-2">
            {links.map((link) => renderLink(link, true))}
            {authLinks.map((link) => renderLink(link, true))}
          </div>

          {user && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
                <div className="truncate text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-textMuted">{ROLE_LABELS[user.role]}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-3 text-sm font-medium text-textMuted transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
