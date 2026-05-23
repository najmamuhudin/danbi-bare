import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { refreshCurrentUser } from './redux/authSlice';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PredictionHistory from './pages/PredictionHistory';
import Register from './pages/Register';
import Team from './pages/Team';
import Unauthorized from './pages/Unauthorized';
import { ADMIN_ROLES, DASHBOARD_ROLES } from './utils/roles';

function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (token) {
      dispatch(refreshCurrentUser());
    }
  }, [dispatch, token]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]"></div>
        </div>

        <Navbar />

        <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
          <Sidebar />

          <main className="flex-grow container mx-auto px-3 py-4 sm:px-4 sm:py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/team" element={<Team />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route
                path="/analyze"
                element={(
                  <ProtectedRoute>
                    <Analysis />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/history"
                element={(
                  <ProtectedRoute>
                    <PredictionHistory />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/dashboard"
                element={(
                  <ProtectedRoute roles={DASHBOARD_ROLES}>
                    <Dashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin"
                element={(
                  <ProtectedRoute roles={ADMIN_ROLES}>
                    <AdminPanel />
                  </ProtectedRoute>
                )}
              />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
