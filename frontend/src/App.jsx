import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { refreshCurrentUser } from './redux/authSlice';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PoliceHelp from './pages/PoliceHelp';
import PoliceSettings from './pages/PoliceSettings';
import PredictionHistory from './pages/PredictionHistory';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Team from './pages/Team';
import Unauthorized from './pages/Unauthorized';
import { ADMIN_ROLES, DASHBOARD_ROLES, POLICE_INVESTIGATOR_ROLES } from './utils/roles';

function AppContent() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();

  useEffect(() => {
    if (token) {
      dispatch(refreshCurrentUser());
    }
  }, [dispatch, token]);

  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const showSidebar = !isDashboard && !isAuthPage;
  const showFooter = !isDashboard;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      {!isDashboard && (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]"></div>
        </div>
      )}

      {!isDashboard && !isAuthPage && <Navbar />}

      <div className={`relative z-10 flex flex-1 flex-col ${isDashboard ? 'h-screen overflow-hidden' : showSidebar ? 'lg:flex-row' : ''}`}>
        {showSidebar && <Sidebar />}

        <main className={`flex-grow ${isDashboard ? 'w-full h-full overflow-hidden' : 'container mx-auto px-3 py-4 sm:px-4 sm:py-8'}`}>
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
              path="/profile"
              element={(
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/police-settings"
              element={(
                <ProtectedRoute roles={POLICE_INVESTIGATOR_ROLES}>
                  <PoliceSettings />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/police-help"
              element={(
                <ProtectedRoute roles={POLICE_INVESTIGATOR_ROLES}>
                  <PoliceHelp />
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

      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
