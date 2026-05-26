import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { clearAuthError, loginUser } from '../redux/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: '', password: '' });

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
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/analyze', { replace: true });
    }
  };

  return (
    <div className="relative max-w-md mx-auto py-12 sm:py-14">
      <div className="glass-panel p-5 sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Log in</h1>
              <p className="text-sm text-textMuted">Access your crime analysis workspace.</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-textMuted transition-colors hover:border-primary/40 hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back home</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            className="glass-input"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button className="btn-primary mt-2" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Log in
          </button>
        </form>

        <p className="text-sm text-textMuted mt-6 text-center">
          Do not have an account? <Link to="/register" className="text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
