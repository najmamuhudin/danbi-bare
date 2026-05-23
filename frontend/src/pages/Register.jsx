import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldPlus, UserPlus } from 'lucide-react';
import { getAuthRoles } from '../services';
import { clearAuthError, registerUser } from '../redux/authSlice';
import { ROLE_LABELS, ROLES } from '../utils/roles';

const defaultRoles = [
  { value: ROLES.USER, label: ROLE_LABELS[ROLES.USER] },
  { value: ROLES.ANALYST, label: ROLE_LABELS[ROLES.ANALYST] },
  { value: ROLES.POLICE, label: ROLE_LABELS[ROLES.POLICE] }
];

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, error } = useSelector((state) => state.auth);
  const [roles, setRoles] = useState(defaultRoles);
  const [firstUserBecomesAdmin, setFirstUserBecomesAdmin] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.USER
  });

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const data = await getAuthRoles();
        const publicRoles = data.roles.filter((role) => role.value !== ROLES.ADMIN);
        setRoles(publicRoles.length ? publicRoles : defaultRoles);
        setFirstUserBecomesAdmin(data.firstUserBecomesAdmin);
        if (data.firstUserBecomesAdmin) {
          setForm((current) => ({ ...current, role: ROLES.ADMIN }));
        }
      } catch {
        setRoles(defaultRoles);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (user) {
    return <Navigate to={location.state?.from?.pathname || '/analyze'} replace />;
  }

  const handleChange = (event) => {
    dispatch(clearAuthError());
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/analyze', { replace: true });
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10">
      <div className="glass-panel p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <ShieldPlus className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Register</h1>
            <p className="text-sm text-textMuted">Create a secure account to access analysis.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium text-white/80" htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="glass-input"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label className="text-sm font-medium text-white/80" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="glass-input"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label className="text-sm font-medium text-white/80" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className="glass-input"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label className="text-sm font-medium text-white/80" htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            className="glass-input"
            value={form.role}
            onChange={handleChange}
            disabled={firstUserBecomesAdmin}
          >
            {firstUserBecomesAdmin ? (
              <option value={ROLES.ADMIN}>Administrator</option>
            ) : (
              roles.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))
            )}
          </select>

          {firstUserBecomesAdmin && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              The first account will automatically become an Administrator.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button className="btn-primary mt-2" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Create Account
          </button>
        </form>

        <p className="text-sm text-textMuted mt-6 text-center">
          Already registered? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
