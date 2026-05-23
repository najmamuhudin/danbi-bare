import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
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
    <div className="max-w-md mx-auto py-6 sm:py-14">
      <div className="glass-panel p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Log in</h1>
            <p className="text-sm text-textMuted">Access your crime analysis workspace.</p>
          </div>
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
