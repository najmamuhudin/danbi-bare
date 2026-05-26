import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  Download,
  Eye,
  FileCheck,
  FileSearch,
  FileText,
  Filter,
  Flag,
  Globe,
  HardDrive,
  Info,
  Layers,
  Lock,
  LogOut,
  MessageSquare,
  Network,
  RefreshCw,
  Search,
  Send,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Terminal,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  Users,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  getStats,
  getHistory,
  getModelInfo,
  getCrimeReports,
  deleteCrimeReport,
  updateCrimeReport,
  exportCrimeReports
} from '../services';
import { logout } from '../redux/authSlice';
import { ROLE_LABELS } from '../utils/roles';
import ThemeToggle from '../components/ThemeToggle';
import { LogoMark } from '../components/Logo';

// API Configuration URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

const normalizeScore = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric > 1 ? numeric : numeric * 100));
};

const formatPercent = (value) => `${Math.round(normalizeScore(value))}%`;

const channelStatus = (channel) => {
  if (!channel) return { label: 'UNKNOWN', className: 'bg-slate-900 border-slate-800 text-slate-500' };
  if (channel.enabled === false) return { label: 'DISABLED', className: 'bg-slate-900 border-slate-800 text-slate-500' };
  if (channel.configured === false) return { label: 'UNCONFIGURED', className: 'bg-amber-950/40 border-amber-800/40 text-amber-400' };
  return { label: 'ENABLED', className: 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400' };
};

const relativeTime = (value) => {
  const timestamp = new Date(value).getTime();
  if (!timestamp) return 'Unknown';
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Utility helper to map platform source icon
const getPlatformIcon = (text = '') => {
  const normalized = text.toLowerCase();
  if (normalized.includes('twitter') || normalized.includes('t.co') || normalized.includes('x.com')) return 'Twitter';
  if (normalized.includes('facebook') || normalized.includes('fb.com')) return 'Facebook';
  if (normalized.includes('telegram') || normalized.includes('t.me')) return 'Telegram';
  if (normalized.includes('whatsapp') || normalized.includes('wa.me')) return 'WhatsApp';
  return 'Web Source';
};

// Help map crime categories from text keywords
const detectCrimeCategory = (text = '') => {
  const normalized = text.toLowerCase();
  if (normalized.includes('bomb') || normalized.includes('qarax') || normalized.includes('explosive') || normalized.includes('miino') || normalized.includes('bambo')) {
    return 'Extremism';
  }
  if (normalized.includes('terror') || normalized.includes('argagixiso') || normalized.includes('attack') || normalized.includes('weerar') || normalized.includes('abduct') || normalized.includes('afduub')) {
    return 'Violence';
  }
  if (normalized.includes('scam') || normalized.includes('fraud') || normalized.includes('money') || normalized.includes('invoice') || normalized.includes('lacag')) {
    return 'Fraud';
  }
  if (normalized.includes('hack') || normalized.includes('phish') || normalized.includes('cyber') || normalized.includes('virus')) {
    return 'Cybercrime';
  }
  if (normalized.includes('hate') || normalized.includes('racist') || normalized.includes('heeb') || normalized.includes('faan')) {
    return 'Hate Speech';
  }
  if (normalized.includes('harass') || normalized.includes('bully') || normalized.includes('threat') || normalized.includes('aflagaado')) {
    return 'Harassment';
  }
  return 'General Crime';
};

const THREAT_KEYWORDS = [
  'qarax',
  'argagixiso',
  'afduub',
  'miino',
  'dil',
  'scam',
  'weerar',
  'isqarxin',
  'hub',
  'toorey',
  'bomb',
  'terror',
  'attack',
  'kidnap',
  'weapon',
  'fraud',
  'phish',
  'hate',
  'threat'
];

const matchesSearch = (query, values) => (
  values.some((value) => String(value ?? '').toLowerCase().includes(query))
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'investigations', 'threat', 'posts', 'categories', 'users', 'evidence', 'reports', 'alerts', 'settings'
  
  // Real-time Connection State
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketPing, setSocketPing] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [alertSound, setAlertSound] = useState(true);

  // API Data States
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [crimeReports, setCrimeReports] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // UI Interactive States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseNoteInput, setCaseNoteInput] = useState('');
  const [updatingCaseId, setUpdatingCaseId] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Audio Context ref for alert sounds
  const audioContextRef = useRef(null);

  // Refs for tracking alerts
  const socketRef = useRef(null);

  // Trigger synthesized audio warning beep
  const playAlertSound = () => {
    if (!alertSound) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, ctx.currentTime); // High pitched alarm sound
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3); // Drop off frequency

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  // Socket Connection for Real-Time Threat Alerts
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketPing(0);
    });

    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));
    socket.on('notification:recent', (notifications = []) => {
      setLiveAlerts(notifications.slice(0, 30));
    });

    // Handle live alert dispatch from backend
    socket.on('notification', (notification) => {
      const newAlert = {
        _id: notification._id || `${notification.type || 'notification'}-${notification.createdAt || Date.now()}`,
        title: notification.title || 'Live Threat Detected',
        message: notification.message || 'Suspicious activity flagged by AI.',
        type: notification.type || 'suspicious_activity',
        severity: notification.payload?.severity || (notification.type === 'emergency_alert' ? 'critical' : 'danger'),
        createdAt: notification.createdAt || new Date().toISOString(),
        payload: notification.payload || {}
      };

      setLiveAlerts((prev) => [newAlert, ...prev].slice(0, 30));
      playAlertSound();

      // Trigger stats refresh on new detection
      fetchStatsOnly();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, alertSound]);

  // Load Initial API Data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, historyData, reportsData, modelData] = await Promise.all([
        getStats().catch(err => { console.warn(err); return null; }),
        getHistory(1, 40).catch(err => { console.warn(err); return { predictions: [] }; }),
        getCrimeReports(1, 50).catch(err => { console.warn(err); return { reports: [] }; }),
        getModelInfo().catch(() => null)
      ]);

      setStats(statsData);
      setHistory(historyData.predictions || historyData.analyses || []);
      setCrimeReports(reportsData.reports || []);
      setModelInfo(modelData);
    } catch (err) {
      setError('System connection failed. Unable to fetch telemetry data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsOnly = async () => {
    try {
      const [statsData, reportsData, historyData] = await Promise.all([
        getStats(),
        getCrimeReports(1, 50),
        getHistory(1, 40)
      ]);
      setStats(statsData);
      setCrimeReports(reportsData.reports || []);
      setHistory(historyData.predictions || historyData.analyses || []);
    } catch (e) {
      console.warn('Failed to update stats in background:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update Crime Report Status (Investigator action)
  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingCaseId(id);
    try {
      const payload = { status: newStatus };
      if (caseNoteInput.trim()) {
        payload.investigatorNotes = caseNoteInput.trim();
      }
      const response = await updateCrimeReport(id, payload);
      
      // Update local state reports array
      setCrimeReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, ...response.report } : r))
      );
      setCaseNoteInput('');
      playAlertSound();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update report status.');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  // Delete Crime Report
  const handleDeleteReport = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to delete and purge this threat record from active registers?')) {
      return;
    }
    try {
      await deleteCrimeReport(id);
      setCrimeReports((prev) => prev.filter((r) => r._id !== id));
      if (selectedCaseId === id) setSelectedCaseId(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete active threat report.');
    }
  };

  const findReportForPrediction = (prediction) => (
    crimeReports.find((report) => report.predictionId === prediction._id || report.inputText === prediction.inputText)
  );

  const handleFlagPost = async (post) => {
    const matchingReport = findReportForPrediction(post);
    if (!matchingReport) {
      alert('This prediction has no crime report record to flag. Run investigation from an active threat report first.');
      return;
    }
    await handleUpdateStatus(matchingReport._id, 'reviewing');
    setSelectedCaseId(matchingReport._id);
  };

  const handleRemovePost = async (post) => {
    const matchingReport = findReportForPrediction(post);
    if (!matchingReport) {
      alert('No removable investigation record exists for this prediction.');
      return;
    }
    await handleDeleteReport(matchingReport._id);
  };

  const handleViewPostDetails = (post) => {
    const matchingReport = findReportForPrediction(post);
    if (matchingReport) {
      setSelectedCaseId(matchingReport._id);
      setActiveTab('investigations');
      return;
    }
    alert(`Prediction ${post._id}\n\nSource: ${post.platform}\nCategory: ${post.category}\nThreat score: ${formatPercent(post.threatScore)}\n\n${post.inputText || 'No text payload stored.'}`);
  };

  // Perform CSV export trigger
  const handleExport = async (format) => {
    try {
      const blob = await exportCrimeReports(format);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Crime_Detector_Threat_Export_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export dataset reports.');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/', { replace: true });
  };

  // Data processing calculations
  const parsedPredictions = useMemo(() => {
    return history.map((item) => {
      const text = item.inputText || item.input?.text || '';
      return {
        ...item,
        confidenceScore: normalizeScore(item.confidence),
        threatScore: normalizeScore(item.crimeProbability ?? item.crime_probability ?? item.confidence),
        category: detectCrimeCategory(text),
        platform: getPlatformIcon(text || item.input?.url || '')
      };
    });
  }, [history]);

  // Compute live telemetry counts
  const telemetry = useMemo(() => {
    const totalPredictions = stats?.total || parsedPredictions.length || 0;
    const crimeCount = stats?.crime_count || parsedPredictions.filter(p => p.isCrime).length || 0;
    const reportStats = stats?.crime_reports || {};
    
    const openCases = reportStats.open_count ?? crimeReports.filter(r => r.status === 'new').length;
    const reviewingCases = reportStats.reviewing_count ?? crimeReports.filter(r => r.status === 'reviewing').length;
    const closedCases = reportStats.closed_count ?? crimeReports.filter(r => r.status === 'closed').length;
    
    const activeThreatsCount = reportStats.active_count ?? (openCases + reviewingCases);
    const highRiskUsersCount = new Set(
      parsedPredictions
        .filter((prediction) => prediction.isCrime && prediction.threatScore >= 70)
        .map((prediction) => prediction.user?.id || prediction.user?.name || prediction.input?.url || prediction.inputText)
        .filter(Boolean)
    ).size;
    const aiAccuracyPct = normalizeScore(modelInfo?.accuracy ?? modelInfo?.test_accuracy ?? stats?.crime_percentage ?? 0);

    return {
      total: totalPredictions,
      crimeCount,
      activeThreats: activeThreatsCount,
      highRiskUsers: highRiskUsersCount,
      aiAccuracy: aiAccuracyPct,
      openCases,
      reviewingCases,
      closedCases,
      totalInvestigations: reportStats.total ?? crimeReports.length
    };
  }, [stats, parsedPredictions, crimeReports, modelInfo]);

  const modelStatus = useMemo(() => {
    if (!modelInfo) {
      return {
        label: 'UNKNOWN',
        className: 'text-amber-400',
        message: 'Model metadata is not available yet.'
      };
    }

    if (modelInfo.model_loaded === false || modelInfo.model_error) {
      return {
        label: 'OFFLINE',
        className: 'text-rose-500',
        message: modelInfo.model_error || 'Model service is not responding.'
      };
    }

    return {
      label: 'ONLINE',
      className: 'text-emerald-400',
      message: modelInfo.model_type || 'Model service is active.'
    };
  }, [modelInfo]);

  const dangerousKeywords = useMemo(() => {
    if (stats?.analytics?.keywords?.length) {
      return stats.analytics.keywords;
    }

    const counts = new Map();
    parsedPredictions
      .filter((prediction) => prediction.isCrime)
      .forEach((prediction) => {
        const matched = [
          ...(prediction.emergencyAlert?.matchedKeywords || []),
          ...THREAT_KEYWORDS.filter((keyword) => String(prediction.inputText || '').toLowerCase().includes(keyword))
        ];
        [...new Set(matched)].forEach((keyword) => counts.set(keyword, (counts.get(keyword) || 0) + 1));
      });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word, count]) => ({
        word,
        count,
        weight: count >= 5 ? 'high' : count >= 2 ? 'mid' : 'low'
      }));
  }, [parsedPredictions, stats]);

  const platformRatios = useMemo(() => {
    if (stats?.analytics?.platforms?.length) {
      const total = Math.max(1, stats.analytics.platforms.reduce((sum, item) => sum + item.count, 0));
      return stats.analytics.platforms.map(({ name, count }) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        color: name.includes('Telegram') ? 'bg-indigo-400' : name.includes('Facebook') ? 'bg-blue-500' : name.includes('WhatsApp') ? 'bg-emerald-400' : 'bg-cyan-400'
      }));
    }

    const counts = parsedPredictions.reduce((acc, prediction) => {
      acc[prediction.platform] = (acc[prediction.platform] || 0) + 1;
      return acc;
    }, {});
    const total = Math.max(1, parsedPredictions.length);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        color: name.includes('Telegram') ? 'bg-indigo-400' : name.includes('Facebook') ? 'bg-blue-500' : name.includes('WhatsApp') ? 'bg-emerald-400' : 'bg-cyan-400'
      }));
  }, [parsedPredictions, stats]);

  const highRiskSubjects = useMemo(() => {
    if (stats?.analytics?.high_risk_subjects?.length) {
      return stats.analytics.high_risk_subjects;
    }

    const grouped = new Map();
    parsedPredictions
      .filter((prediction) => prediction.isCrime || prediction.threatScore >= 60)
      .forEach((prediction) => {
        const key = prediction.user?.id || prediction.user?.name || prediction.input?.url || 'unattributed-source';
        const current = grouped.get(key) || {
          id: key,
          name: prediction.user?.name || prediction.input?.url || 'Unattributed source',
          handle: prediction.user?.role || prediction.type || 'source',
          riskScore: 0,
          matches: 0,
          platform: prediction.platform,
          lastSignalAt: prediction.createdAt,
          status: 'Monitored'
        };
        current.matches += 1;
        current.riskScore = Math.max(current.riskScore, prediction.threatScore);
        current.lastSignalAt = new Date(prediction.createdAt) > new Date(current.lastSignalAt) ? prediction.createdAt : current.lastSignalAt;
        current.status = current.riskScore >= 85 ? 'Flagged' : current.riskScore >= 70 ? 'Under Review' : 'Monitored';
        current.activity = current.matches >= 5 ? 'High' : current.matches >= 2 ? 'Medium' : 'Low';
        grouped.set(key, current);
      });

    return [...grouped.values()].sort((a, b) => b.riskScore - a.riskScore).slice(0, 12);
  }, [parsedPredictions, stats]);

  const evidenceRecords = useMemo(() => (
    crimeReports.map((report) => ({
      id: report._id,
      title: String(report.inputText || 'Crime report evidence').slice(0, 80),
      format: report.predictionId ? 'Prediction Record' : 'Case Record',
      category: detectCrimeCategory(report.inputText),
      date: report.createdAt,
      status: report.status,
      size: `${Math.max(1, Math.ceil(String(report.inputText || '').length / 1024))} KB`,
      author: report.user?.name || 'System'
    }))
  ), [crimeReports]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  // Filter posts based on global search
  const filteredPosts = useMemo(() => {
    if (!normalizedSearchQuery) return parsedPredictions;
    const query = normalizedSearchQuery;
    return parsedPredictions.filter((post) =>
      matchesSearch(query, [
        post._id,
        post.inputText,
        post.category,
        post.platform,
        post.prediction,
        post.user?.name,
        post.user?.id,
        post.input?.url,
        formatPercent(post.threatScore)
      ])
    );
  }, [parsedPredictions, normalizedSearchQuery]);

  // Filter investigations based on search
  const filteredInvestigations = useMemo(() => {
    if (!normalizedSearchQuery) return crimeReports;
    const query = normalizedSearchQuery;
    return crimeReports.filter((report) =>
      matchesSearch(query, [
        report._id,
        report.predictionId,
        report.inputText,
        report.status,
        report.prediction,
        report.user?.name,
        report.user?.id,
        detectCrimeCategory(report.inputText),
        formatPercent(report.confidence)
      ])
    );
  }, [crimeReports, normalizedSearchQuery]);

  // Compute Category Counts for Visualizations
  const categoryChartData = useMemo(() => {
    if (stats?.analytics?.categories?.length) {
      return stats.analytics.categories;
    }

    const counts = {
      Extremism: 0,
      Violence: 0,
      Fraud: 0,
      Cybercrime: 0,
      'Hate Speech': 0,
      Harassment: 0,
      'General Crime': 0
    };

    parsedPredictions.forEach((p) => {
      const cat = p.category;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts['General Crime']++;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [parsedPredictions, stats]);

  const trendPoints = useMemo(() => {
    if (stats?.analytics?.trend?.length) {
      const max = Math.max(1, ...stats.analytics.trend.map((day) => day.count));
      return stats.analytics.trend.map((day, index) => ({
        ...day,
        x: 10 + index * (380 / 6),
        y: 140 - (day.count / max) * 110
      }));
    }

    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
        count: 0
      };
    });
    const byKey = new Map(days.map((day) => [day.key, day]));
    parsedPredictions.forEach((prediction) => {
      if (!prediction.isCrime) return;
      const key = new Date(prediction.createdAt).toISOString().slice(0, 10);
      const day = byKey.get(key);
      if (day) day.count += 1;
    });
    const max = Math.max(1, ...days.map((day) => day.count));
    return days.map((day, index) => ({
      ...day,
      x: 10 + index * (380 / 6),
      y: 140 - (day.count / max) * 110
    }));
  }, [parsedPredictions, stats]);

  const trendPath = useMemo(() => (
    trendPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  ), [trendPoints]);

  const categoryMonitorCards = useMemo(() => {
    const total = Math.max(1, categoryChartData.reduce((sum, item) => sum + item.count, 0));
    const palette = {
      Extremism: 'border-red-500/25 bg-red-950/5 text-red-400',
      Violence: 'border-amber-500/20 bg-amber-950/5 text-amber-400',
      Fraud: 'border-cyan-500/15 bg-cyan-950/5 text-cyan-400',
      Cybercrime: 'border-violet-500/20 bg-violet-950/5 text-violet-400',
      'Hate Speech': 'border-pink-500/20 bg-pink-950/5 text-pink-400',
      Harassment: 'border-blue-500/20 bg-blue-950/5 text-blue-400',
      'General Crime': 'border-slate-500/20 bg-slate-900/60 text-slate-300'
    };

    return categoryChartData
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        percentage: Math.round((item.count / total) * 100),
        color: palette[item.name] || palette['General Crime']
      }));
  }, [categoryChartData]);

  const crimeTrendAnalysis = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const currentWeekStart = startOfToday - (6 * 24 * 60 * 60 * 1000);
    const previousWeekStart = currentWeekStart - (7 * 24 * 60 * 60 * 1000);

    const baseCategories = {
      Extremism: { current: 0, previous: 0, risk: 'Critical', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-950/10' },
      Violence: { current: 0, previous: 0, risk: 'High', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-950/10' },
      Fraud: { current: 0, previous: 0, risk: 'Medium', color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-950/10' },
      Cybercrime: { current: 0, previous: 0, risk: 'Medium', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-950/10' },
      'Hate Speech': { current: 0, previous: 0, risk: 'Watch', color: 'text-pink-400', border: 'border-pink-500/20', bg: 'bg-pink-950/10' },
      Harassment: { current: 0, previous: 0, risk: 'Watch', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-950/10' },
      'General Crime': { current: 0, previous: 0, risk: 'Watch', color: 'text-slate-300', border: 'border-slate-500/20', bg: 'bg-slate-900/60' }
    };

    parsedPredictions
      .filter((prediction) => prediction.isCrime || prediction.threatScore >= 50)
      .forEach((prediction) => {
        const timestamp = new Date(prediction.createdAt).getTime();
        if (!Number.isFinite(timestamp)) return;
        const category = baseCategories[prediction.category] ? prediction.category : 'General Crime';
        if (timestamp >= currentWeekStart) {
          baseCategories[category].current += 1;
        } else if (timestamp >= previousWeekStart && timestamp < currentWeekStart) {
          baseCategories[category].previous += 1;
        }
      });

    const risingCrimes = Object.entries(baseCategories)
      .map(([name, item]) => {
        const change = item.current - item.previous;
        const percentage = item.previous > 0
          ? Math.round((change / item.previous) * 100)
          : item.current > 0
          ? 100
          : 0;
        return { name, ...item, change, percentage };
      })
      .sort((a, b) => (b.change - a.change) || (b.current - a.current))
      .slice(0, 4);

    const weeklyTotal = trendPoints.reduce((sum, day) => sum + day.count, 0);
    const peakDay = trendPoints.reduce((peak, day) => (day.count > peak.count ? day : peak), trendPoints[0] || { label: 'N/A', count: 0 });
    const latestDay = trendPoints[trendPoints.length - 1] || { count: 0 };
    const previousDay = trendPoints[trendPoints.length - 2] || { count: 0 };
    const dailyDelta = latestDay.count - previousDay.count;
    const commonThreats = [...dangerousKeywords].slice(0, 6);

    return {
      weeklyTotal,
      peakDay,
      dailyDelta,
      commonThreats,
      risingCrimes
    };
  }, [parsedPredictions, trendPoints, dangerousKeywords]);

  const threatConcentration = useMemo(() => {
    const reportStats = stats?.crime_reports || {};
    const critical = reportStats.critical_count ?? crimeReports.filter((report) => report.emergencyAlert?.detected || normalizeScore(report.confidence) >= 85).length;
    const danger = reportStats.danger_count ?? crimeReports.filter((report) => !report.emergencyAlert?.detected && normalizeScore(report.confidence) >= 60 && normalizeScore(report.confidence) < 85).length;
    const monitored = reportStats.monitored_count ?? Math.max(0, crimeReports.length - critical - danger);
    const total = Math.max(1, critical + danger + monitored);
    return {
      critical,
      danger,
      monitored,
      criticalPct: Math.round((critical / total) * 100),
      dangerPct: Math.round((danger / total) * 100),
      monitoredPct: Math.round((monitored / total) * 100)
    };
  }, [crimeReports, stats]);

  const threatLevel = useMemo(() => {
    if (threatConcentration.critical > 0 || liveAlerts.some((alert) => alert.severity === 'critical')) {
      return {
        label: 'CRITICAL',
        className: 'text-red-500',
        summary: `${threatConcentration.critical} critical case${threatConcentration.critical === 1 ? '' : 's'} detected from live data.`
      };
    }

    if (telemetry.activeThreats > 0 || threatConcentration.danger > 0) {
      return {
        label: 'ELEVATED',
        className: 'text-amber-400',
        summary: `${telemetry.activeThreats} active threat case${telemetry.activeThreats === 1 ? '' : 's'} require monitoring.`
      };
    }

    return {
      label: 'NORMAL',
      className: 'text-emerald-400',
      summary: 'No active threat cases are currently open in the live dashboard data.'
    };
  }, [liveAlerts, telemetry.activeThreats, threatConcentration]);

  const aiInsights = useMemo(() => {
    const topCategory = [...categoryChartData].sort((a, b) => b.count - a.count)[0];
    const topKeyword = dangerousKeywords[0];
    return {
      patterns: topCategory?.count
        ? `${topCategory.name} is the leading detected category across ${topCategory.count} stored prediction${topCategory.count === 1 ? '' : 's'}.`
        : 'No crime-category cluster has been detected in the current prediction store.',
      escalation: topKeyword
        ? `NLP keyword "${topKeyword.word}" appears in ${topKeyword.count} live detection${topKeyword.count === 1 ? '' : 's'}.`
        : 'No emergency keywords are present in the current suspicious post collection.',
      recommendation: telemetry.activeThreats > 0
        ? `${telemetry.activeThreats} active threat case${telemetry.activeThreats === 1 ? '' : 's'} should remain in review until investigator status is updated.`
      : 'No active threat case is waiting for investigator action.'
    };
  }, [categoryChartData, dangerousKeywords, telemetry.activeThreats]);

  const filteredHighRiskSubjects = useMemo(() => {
    if (!normalizedSearchQuery) return highRiskSubjects;
    const query = normalizedSearchQuery;
    return highRiskSubjects.filter((subject) => matchesSearch(query, [
      subject.id,
      subject.name,
      subject.handle,
      subject.platform,
      subject.status,
      subject.activity,
      formatPercent(subject.riskScore)
    ]));
  }, [highRiskSubjects, normalizedSearchQuery]);

  const filteredEvidenceRecords = useMemo(() => {
    if (!normalizedSearchQuery) return evidenceRecords;
    const query = normalizedSearchQuery;
    return evidenceRecords.filter((record) => matchesSearch(query, [
      record.id,
      record.title,
      record.format,
      record.category,
      record.status,
      record.author
    ]));
  }, [evidenceRecords, normalizedSearchQuery]);

  const filteredCategoryChartData = useMemo(() => {
    if (!normalizedSearchQuery) return categoryChartData;
    return categoryChartData.filter((category) => matchesSearch(normalizedSearchQuery, [
      category.name,
      category.count
    ]));
  }, [categoryChartData, normalizedSearchQuery]);

  const filteredCategoryMonitorCards = useMemo(() => {
    if (!normalizedSearchQuery) return categoryMonitorCards;
    return categoryMonitorCards.filter((card) => matchesSearch(normalizedSearchQuery, [
      card.name,
      card.count,
      `${card.percentage}%`
    ]));
  }, [categoryMonitorCards, normalizedSearchQuery]);

  const filteredDangerousKeywords = useMemo(() => {
    if (!normalizedSearchQuery) return dangerousKeywords;
    return dangerousKeywords.filter((keyword) => matchesSearch(normalizedSearchQuery, [
      keyword.word,
      keyword.count,
      keyword.weight
    ]));
  }, [dangerousKeywords, normalizedSearchQuery]);

  const filteredPlatformRatios = useMemo(() => {
    if (!normalizedSearchQuery) return platformRatios;
    return platformRatios.filter((source) => matchesSearch(normalizedSearchQuery, [
      source.name,
      source.count,
      `${source.percentage}%`
    ]));
  }, [platformRatios, normalizedSearchQuery]);

  const filteredLiveAlerts = useMemo(() => {
    if (!normalizedSearchQuery) return liveAlerts;
    return liveAlerts.filter((alert) => matchesSearch(normalizedSearchQuery, [
      alert._id,
      alert.title,
      alert.message,
      alert.type,
      alert.severity,
      alert.payload?.caseId
    ]));
  }, [liveAlerts, normalizedSearchQuery]);

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    const buildResult = ({ tab, type, title, subtitle, id }) => ({ tab, type, title, subtitle, id });
    return [
      ...filteredInvestigations.slice(0, 6).map((report) => buildResult({
        tab: 'investigations',
        type: 'Case',
        id: report._id,
        title: `CASE: ${report._id}`,
        subtitle: report.inputText || report.status || 'Investigation record'
      })),
      ...filteredPosts.slice(0, 6).map((post) => buildResult({
        tab: 'posts',
        type: 'Post',
        id: post._id,
        title: post.inputText || post._id || 'Suspicious post',
        subtitle: `${post.platform || 'Source'} / ${post.category || 'Uncategorized'} / ${formatPercent(post.threatScore)}`
      })),
      ...filteredHighRiskSubjects.slice(0, 4).map((subject) => buildResult({
        tab: 'users',
        type: 'User',
        id: subject.id,
        title: subject.name,
        subtitle: `${subject.handle || 'source'} / ${subject.status || 'Monitored'}`
      })),
      ...filteredEvidenceRecords.slice(0, 4).map((record) => buildResult({
        tab: 'evidence',
        type: 'Evidence',
        id: record.id,
        title: record.title,
        subtitle: `${record.category} / ${record.format}`
      })),
      ...filteredCategoryChartData.slice(0, 4).map((category) => buildResult({
        tab: 'categories',
        type: 'Category',
        id: category.name,
        title: category.name,
        subtitle: `${category.count} stored detection${category.count === 1 ? '' : 's'}`
      })),
      ...filteredDangerousKeywords.slice(0, 4).map((keyword) => buildResult({
        tab: 'threat',
        type: 'Keyword',
        id: keyword.word,
        title: keyword.word,
        subtitle: `${keyword.count} hit${keyword.count === 1 ? '' : 's'} / ${keyword.weight} risk`
      })),
      ...filteredPlatformRatios.slice(0, 4).map((source) => buildResult({
        tab: 'threat',
        type: 'Source',
        id: source.name,
        title: source.name,
        subtitle: `${source.count} item${source.count === 1 ? '' : 's'} / ${source.percentage}%`
      })),
      ...filteredLiveAlerts.slice(0, 4).map((alert) => buildResult({
        tab: 'alerts',
        type: 'Alert',
        id: alert._id,
        title: alert.title,
        subtitle: alert.message
      }))
    ].slice(0, 12);
  }, [
    filteredCategoryChartData,
    filteredDangerousKeywords,
    filteredEvidenceRecords,
    filteredHighRiskSubjects,
    filteredInvestigations,
    filteredLiveAlerts,
    filteredPlatformRatios,
    filteredPosts,
    normalizedSearchQuery
  ]);

  const totalSearchMatches = normalizedSearchQuery
    ? filteredInvestigations.length + filteredPosts.length + filteredHighRiskSubjects.length + filteredEvidenceRecords.length + filteredCategoryChartData.length + filteredDangerousKeywords.length + filteredPlatformRatios.length + filteredLiveAlerts.length
    : 0;
  const dashboardAlerts = normalizedSearchQuery ? filteredLiveAlerts : liveAlerts;
  const dashboardCaseFeed = normalizedSearchQuery ? filteredInvestigations : crimeReports;

  const diagnostics = stats?.system || {};
  const alertPipelineStatus = channelStatus({
    enabled: diagnostics.emergency_alerts?.pipeline?.enabled,
    configured: diagnostics.emergency_alerts?.pipeline?.enabled
  });
  const smsDispatchStatus = channelStatus(diagnostics.emergency_alerts?.sms);
  const emailDispatchStatus = channelStatus(diagnostics.emergency_alerts?.email);
  const socketGatewayStatus = channelStatus({
    enabled: true,
    configured: diagnostics.notifications?.socket_ready ?? socketConnected
  });

  if (loading) {
    return (
      <div className="dashboard-shell fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b13] text-cyan-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="relative h-16 w-16 mb-4"
        >
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400"></div>
        </motion.div>
        <span className="font-mono text-sm tracking-[0.2em] uppercase animate-pulse">Initializing Cyber-Telemetry Core...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex h-screen w-screen flex-col overflow-hidden bg-[#070b13] font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
      
      {/* GLOW DECORATIVE GRID */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.1),rgba(0,0,0,0))] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-cyan-500/10 bg-[#090f1d]/85 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="relative flex h-10 w-10 items-center justify-center">
            <LogoMark className="h-10 w-10" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-tight text-white uppercase">Dambi Baare AI</span>
              <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider text-cyan-400 border border-cyan-800/40">INTELLIGENCE UNIT</span>
            </div>
            <div className="text-[10px] tracking-[0.2em] font-semibold text-slate-400 uppercase">An intelligence workspace with Somali support</div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden max-w-md flex-1 px-8 md:block">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-cyan-500/60" />
            <input
              type="text"
              placeholder="Search threat matrix registers, case IDs, or user handles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-cyan-500/10 bg-[#0c152a] py-2 pl-9 pr-10 text-sm font-mono text-cyan-300 placeholder:text-slate-500 transition-all focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.05)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <AnimatePresence>
              {normalizedSearchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-cyan-500/20 bg-[#090f1d] shadow-2xl shadow-cyan-950/30"
                >
                  <div className="flex items-center justify-between border-b border-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider">
                    <span className="text-slate-500">Search results</span>
                    <span className={totalSearchMatches > 0 ? 'text-cyan-400' : 'text-rose-400'}>
                      {totalSearchMatches > 0 ? `${totalSearchMatches} match${totalSearchMatches === 1 ? '' : 'es'}` : 'Waxaas ma jiraan'}
                    </span>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto p-1.5">
                      {searchResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => {
                            setActiveTab(result.tab);
                            if (result.tab === 'investigations') {
                              setSelectedCaseId(result.id);
                            }
                          }}
                          className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-cyan-500/10"
                        >
                          <span className="mt-0.5 rounded border border-cyan-800/40 bg-cyan-950 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-cyan-300">
                            {result.type}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs font-semibold text-slate-200">{result.title}</span>
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{result.subtitle}</span>
                          </span>
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center font-mono text-xs text-slate-500">
                      Wax natiijo ah lama helin. Isku day case ID, category, user handle, ama keyword kale.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-3">
          {/* Sound Mute/Unmute */}
          <ThemeToggle />

          <button
            onClick={() => setAlertSound(!alertSound)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
              alertSound
                ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title={alertSound ? 'Mute Alert Bleeps' : 'Enable Alert Audio Warning'}
          >
            {alertSound ? <Siren className="h-4 w-4 animate-pulse" /> : <WifiOff className="h-4 w-4" />}
          </button>

          {/* Connection Status Badge */}
          <div className="hidden items-center gap-2 rounded-lg border border-cyan-500/10 bg-[#0a1122] px-3 py-1.5 font-mono text-xs sm:flex">
            <Wifi className={`h-3.5 w-3.5 ${socketConnected ? 'text-cyan-400' : 'text-rose-500 animate-pulse'}`} />
            <span className="text-slate-400">SOC STATUS:</span>
            <span className={socketConnected ? 'text-cyan-400' : 'text-rose-500'}>
              {socketConnected ? (socketPing ? `ONLINE (${socketPing}ms)` : 'ONLINE') : 'OFFLINE'}
            </span>
          </div>

          {/* Live Notification Indicator Badge */}
          <div className="relative">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/10 bg-[#0a1122] text-slate-400 transition-colors hover:text-white ${
                liveAlerts.length > 0 ? 'border-red-500/20 bg-red-500/5 text-red-400' : ''
              }`}
            >
              {liveAlerts.length > 0 ? <BellRing className="h-4.5 w-4.5 text-red-400" /> : <Bell className="h-4.5 w-4.5" />}
              {liveAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  {liveAlerts.length}
                </span>
              )}
            </button>
          </div>

          {/* User profile dropdown info */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/10 bg-[#0a1122] p-1.5 transition-colors hover:bg-cyan-500/5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-900 font-mono text-xs font-bold text-cyan-300">
                {user?.name?.slice(0, 2).toUpperCase() || 'IN'}
              </div>
              <span className="hidden text-xs font-medium text-slate-300 sm:inline">{user?.name || 'Investigator'}</span>
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2.5 z-50 w-52 rounded-xl border border-cyan-500/20 bg-[#090f1d] p-2 shadow-2xl"
                  >
                    <div className="border-b border-cyan-500/10 px-3 py-2 text-left">
                      <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                      <div className="text-[10px] font-mono text-cyan-400">{ROLE_LABELS[user?.role] || 'Officer'}</div>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <button
                        onClick={() => { setActiveTab('settings'); setProfileDropdownOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition-colors hover:bg-cyan-500/5 hover:text-white"
                      >
                        <SettingsIcon className="h-3.5 w-3.5" />
                        System Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Term Session (Logout)
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* DASHBOARD WORKSPACE BODY */}
      <div className="relative flex flex-1 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className="hidden w-64 shrink-0 border-r border-cyan-500/10 bg-[#080d19]/90 py-4 lg:block overflow-y-auto">
          <div className="px-4 mb-4 text-[10px] tracking-[0.2em] font-bold text-cyan-500/60 uppercase">OPERATIONAL MATRIX</div>
          
          <nav className="space-y-1 px-2" aria-label="Command Navigation">
            {[
              { id: 'dashboard', label: 'Dashboard Control', icon: Activity, badge: null },
              { id: 'investigations', label: 'Investigations', icon: FileCheck, badge: telemetry.openCases > 0 ? telemetry.openCases : null },
              { id: 'threat', label: 'Threat Analysis', icon: ShieldAlert, badge: null },
              { id: 'posts', label: 'Suspicious Posts', icon: MessageSquare, badge: null },
              { id: 'categories', label: 'Crime Categories', icon: Layers, badge: null },
              { id: 'users', label: 'Users Monitoring', icon: Users, badge: telemetry.highRiskUsers },
              { id: 'evidence', label: 'Evidence Center', icon: HardDrive, badge: null },
              { id: 'reports', label: 'Reports Export', icon: FileText, badge: null },
              { id: 'alerts', label: 'Alerts Dashboard', icon: Siren, badge: liveAlerts.length > 0 ? 'ALERT' : null },
              { id: 'settings', label: 'Settings Diagnostics', icon: SettingsIcon, badge: null }
            ].map((item) => {
              const IconComponent = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-mono text-xs transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                      : 'text-slate-400 border border-transparent hover:bg-cyan-500/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`h-4 w-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      item.id === 'alerts' || item.id === 'investigations'
                        ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-800/40'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-cyan-500/10 pt-4 px-4">
            <div className="rounded-lg border border-cyan-500/10 bg-[#060b13] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 mb-1">
                <Terminal className="h-3.5 w-3.5" />
                <span>AI SERVICE MODEL</span>
              </div>
              <div className="space-y-1 font-mono text-[10px] text-slate-400">
                <p>Status: <span className={modelStatus.className}>{modelStatus.label}</span></p>
                <p>Type: <span>{modelStatus.message}</span></p>
                <p>Confidence Thresh: <span>{formatPercent(modelInfo?.crime_threshold ?? stats?.crime_percentage ?? 0)}</span></p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-mono text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/15"
            >
              <LogOut className="h-3.5 w-3.5" />
              Secure Logout
            </button>
          </div>
        </aside>

        {/* ACTIVE MODULE CONTAINER */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#070b13]">
          
          {/* Quick Stats Dashboard header bar for desktop */}
          <div className="grid grid-cols-2 gap-px border-b border-cyan-500/10 bg-cyan-500/5 md:grid-cols-6 sm:grid-cols-3">
            {[
              { label: 'ACTIVE THREATS', value: telemetry.activeThreats, color: 'text-red-400', icon: ShieldAlert },
              { label: 'OPEN INVESTIGATIONS', value: telemetry.openCases, color: 'text-orange-400', icon: FileCheck },
              { label: 'HIGH RISK USERS', value: telemetry.highRiskUsers, color: 'text-cyan-400', icon: Users },
              { label: 'SUSPICIOUS DETECTIONS', value: telemetry.crimeCount, color: 'text-rose-400', icon: AlertTriangle },
              { label: 'TOTAL MATRICES', value: telemetry.total, color: 'text-slate-300', icon: Database },
              { label: 'AI CORE ACCURACY', value: `${telemetry.aiAccuracy}%`, color: 'text-emerald-400', icon: Sparkles }
            ].map((stat, idx) => {
              const StatIcon = stat.icon;
              return (
                <div key={idx} className="bg-[#080d19]/80 px-4 py-3 border-r border-cyan-500/10">
                  <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider text-slate-500">
                    <StatIcon className="h-3 w-3 text-slate-500" />
                    <span>{stat.label}</span>
                  </div>
                  <div className={`mt-1 font-mono text-xl font-bold ${stat.color}`}>{stat.value}</div>
                </div>
              );
            })}
          </div>

          {/* MAIN INTERNAL SCREEN VIEW SWITCHER */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Grid Layout: Real-Time Alerts Feed + AI Insights */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    
                    {/* Live Alerts Console */}
                    <div className="lg:col-span-2 rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-400" />
                      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Siren className="h-5 w-5 text-cyan-400 animate-pulse" />
                          <h2 className="font-mono text-sm font-bold tracking-wider text-slate-200 uppercase">LIVE suspicious activity feed</h2>
                        </div>
                        <button
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="flex h-7 w-7 items-center justify-center rounded border border-cyan-500/10 text-slate-400 transition-colors hover:text-white disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Alerts list */}
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {dashboardAlerts.length > 0 ? (
                          dashboardAlerts.map((alert) => (
                            <motion.div
                              key={alert._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`rounded-lg border p-3.5 text-left transition-all ${
                                alert.severity === 'critical'
                                  ? 'border-red-500/30 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                                  : 'border-amber-500/20 bg-amber-950/10'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${
                                    alert.severity === 'critical' ? 'bg-red-500 animate-ping' : 'bg-amber-400'
                                  }`} />
                                  <span className={`font-mono text-xs font-bold uppercase tracking-wider ${
                                    alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                                  }`}>
                                    {alert.severity === 'critical' ? 'CRITICAL INCIDENT' : 'WARNING DETECTED'}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-500">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-200">{alert.title}</p>
                              <p className="mt-1 text-xs text-slate-400 line-clamp-2 bg-black/10 rounded p-1.5 font-mono">{alert.message}</p>
                            </motion.div>
                          ))
                        ) : dashboardCaseFeed.length > 0 ? (
                          // Fallback to existing reports
                          dashboardCaseFeed.slice(0, 4).map((report) => {
                            const isCrit = normalizeScore(report.confidence) > 85 || report.emergencyAlert?.detected;
                            return (
                              <div
                                key={report._id}
                                className={`rounded-lg border p-3 text-left transition-all ${
                                  isCrit ? 'border-red-500/20 bg-red-950/5' : 'border-cyan-500/10 bg-[#070b13]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isCrit ? 'bg-red-500' : 'bg-cyan-400'}`} />
                                    <span className="font-mono text-[10px] text-slate-400 uppercase">CASE REF: {report._id?.slice(0, 8)}</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="mt-1.5 font-mono text-xs text-slate-300 line-clamp-1">{report.inputText}</p>
                                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                                  <span>CONFIDENCE: <span className="text-cyan-400">{formatPercent(report.confidence)}</span></span>
                                  <span className="rounded bg-cyan-950 px-1 border border-cyan-800/40 text-cyan-300">{report.status}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded border border-cyan-500/10 bg-cyan-950/5 p-5 text-center font-mono text-xs text-slate-500">
                            {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching alerts or case records found.' : 'No live alerts or case records are available yet.'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Investigation Insights */}
                    <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-400" />
                      <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-4 mb-4">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        <h2 className="font-mono text-sm font-bold tracking-wider text-slate-200 uppercase">AI REASONING CORE</h2>
                      </div>

                      <div className="space-y-4 text-left font-mono text-xs">
                        <div className="rounded-lg bg-cyan-500/5 p-3.5 border border-cyan-500/10">
                          <h4 className="text-cyan-400 font-bold mb-1">Pattern Detections</h4>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {aiInsights.patterns}
                          </p>
                        </div>

                        <div className="rounded-lg bg-amber-500/5 p-3.5 border border-amber-500/10">
                          <h4 className="text-amber-400 font-bold mb-1">Escalation Predictions</h4>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {aiInsights.escalation}
                          </p>
                        </div>

                        <div className="rounded-lg bg-rose-500/5 p-3.5 border border-rose-500/10">
                          <h4 className="text-rose-400 font-bold mb-1">Response Recommendation</h4>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {aiInsights.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Crime Trend Analysis */}
                  <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md shadow-xl">
                    <div className="mb-5 flex flex-col gap-3 border-b border-cyan-500/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-cyan-400" />
                        <div>
                          <h2 className="font-mono text-sm font-bold tracking-wider text-slate-200 uppercase">CRIME TREND ANALYSIS</h2>
                          <p className="mt-1 font-mono text-[10px] text-slate-500">Weekly trends, common threats, rising crimes, and dangerous keyword signals.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] sm:min-w-[360px]">
                        <div className="rounded-lg border border-cyan-500/10 bg-black/30 p-2">
                          <span className="block text-slate-500">WEEKLY SIGNALS</span>
                          <strong className="text-base text-cyan-300">{crimeTrendAnalysis.weeklyTotal}</strong>
                        </div>
                        <div className="rounded-lg border border-amber-500/10 bg-black/30 p-2">
                          <span className="block text-slate-500">PEAK DAY</span>
                          <strong className="text-base text-amber-300">{crimeTrendAnalysis.peakDay.label}</strong>
                        </div>
                        <div className="rounded-lg border border-rose-500/10 bg-black/30 p-2">
                          <span className="block text-slate-500">TODAY TREND</span>
                          <strong className={crimeTrendAnalysis.dailyDelta >= 0 ? 'text-base text-rose-300' : 'text-base text-emerald-300'}>
                            {crimeTrendAnalysis.dailyDelta >= 0 ? '+' : ''}{crimeTrendAnalysis.dailyDelta}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                      <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Trends</h3>
                          <Calendar className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="flex h-32 items-end gap-2">
                          {trendPoints.map((point) => {
                            const height = Math.max(8, 100 - ((point.y - 30) / 110) * 92);
                            return (
                              <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
                                <div className="flex h-24 w-full items-end rounded bg-slate-950/70 px-1">
                                  <div
                                    className="w-full rounded-t bg-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                                    style={{ height: `${height}%` }}
                                    title={`${point.count} suspicious post${point.count === 1 ? '' : 's'}`}
                                  />
                                </div>
                                <div className="text-center font-mono text-[9px] text-slate-500">
                                  <span className="block">{point.label}</span>
                                  <span className="text-slate-300">{point.count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Common Threats</h3>
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="space-y-3">
                          {crimeTrendAnalysis.commonThreats.length > 0 ? crimeTrendAnalysis.commonThreats.map((keyword) => (
                            <div key={keyword.word}>
                              <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
                                <span className="font-semibold text-slate-300">#{keyword.word}</span>
                                <span className="text-slate-500">{keyword.count} hits</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                                <div
                                  className={`h-full rounded-full ${
                                    keyword.weight === 'high' ? 'bg-red-400' : keyword.weight === 'mid' ? 'bg-amber-400' : 'bg-cyan-400'
                                  }`}
                                  style={{ width: `${Math.min(100, keyword.count * 20)}%` }}
                                />
                              </div>
                            </div>
                          )) : (
                            <div className="rounded border border-cyan-500/10 bg-cyan-950/5 p-4 text-center font-mono text-xs text-slate-500">
                              No dangerous topics are trending yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Rising Crimes</h3>
                          <ShieldAlert className="h-4 w-4 text-rose-400" />
                        </div>
                        <div className="space-y-3">
                          {crimeTrendAnalysis.risingCrimes.map((crime) => (
                            <div key={crime.name} className={`rounded-lg border p-3 ${crime.border} ${crime.bg}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h4 className={`font-mono text-xs font-bold uppercase ${crime.color}`}>{crime.name}</h4>
                                  <p className="mt-1 font-mono text-[10px] text-slate-500">Risk layer: {crime.risk}</p>
                                </div>
                                <div className="text-right font-mono">
                                  <span className={crime.change > 0 ? 'block text-sm font-bold text-rose-300' : 'block text-sm font-bold text-slate-300'}>
                                    {crime.change > 0 ? '+' : ''}{crime.change}
                                  </span>
                                  <span className="text-[9px] text-slate-500">{crime.percentage > 0 ? `+${crime.percentage}%` : `${crime.percentage}%`}</span>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-500">
                                <span>This week: <span className="text-slate-300">{crime.current}</span></span>
                                <span>Last week: <span className="text-slate-300">{crime.previous}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Charts and Breakdown matrices */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* SVG Trend Line Graph */}
                    <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md">
                      <h3 className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">SUSPICIOUS POSTS TRENDS (PAST 7 DAYS)</h3>
                      <div className="h-48 w-full flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 400 160">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* Grid Lines */}
                          <line x1="10" y1="20" x2="390" y2="20" stroke="rgba(6,182,212,0.05)" strokeDasharray="3" />
                          <line x1="10" y1="60" x2="390" y2="60" stroke="rgba(6,182,212,0.05)" strokeDasharray="3" />
                          <line x1="10" y1="100" x2="390" y2="100" stroke="rgba(6,182,212,0.05)" strokeDasharray="3" />
                          <line x1="10" y1="140" x2="390" y2="140" stroke="rgba(6,182,212,0.1)" />

                          <path
                            d={trendPath}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="3"
                          />
                          <path
                            d={`${trendPath} L390,140 L10,140 Z`}
                            fill="url(#chartGradient)"
                          />
                          {trendPoints.map((point) => (
                            <g key={point.key}>
                              <circle cx={point.x} cy={point.y} r="3" fill="#22d3ee" />
                              <text x={point.x - 8} y="155" fill="#64748b" fontSize="8" fontFamily="monospace">{point.label}</text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>

                    {/* SVG Donut Chart Breakdown */}
                    <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md flex flex-col justify-between">
                      <h3 className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">THREAT LEVEL CONCENTRATION</h3>
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 flex-1">
                        <div className="relative h-32 w-32">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0e172a" strokeWidth="3" />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#ef4444" // Critical
                              strokeWidth="3.2"
                              strokeDasharray={`${threatConcentration.criticalPct} 100`}
                              strokeDashoffset="25"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#f59e0b" // Danger
                              strokeWidth="3.2"
                              strokeDasharray={`${threatConcentration.dangerPct} 100`}
                              strokeDashoffset={100 - threatConcentration.criticalPct}
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#06b6d4" // Info/Safe
                              strokeWidth="3.2"
                              strokeDasharray={`${threatConcentration.monitoredPct} 100`}
                              strokeDashoffset={100 - threatConcentration.criticalPct - threatConcentration.dangerPct}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-lg font-bold text-white">{threatConcentration.criticalPct}%</span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">CRITICAL</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="text-left font-mono text-xs space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm bg-red-500" />
                            <span className="text-slate-300">Critical Threat ({threatConcentration.criticalPct}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm bg-amber-500" />
                            <span className="text-slate-300">Danger Threat ({threatConcentration.dangerPct}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm bg-cyan-500" />
                            <span className="text-slate-300">Monitored / Safe ({threatConcentration.monitoredPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {activeTab === 'investigations' && (
                <motion.div
                  key="investigations"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-3 text-left"
                >
                  {/* Cases List */}
                  <div className="lg:col-span-2 rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md flex flex-col h-[calc(100vh-14rem)]">
                    <div className="border-b border-cyan-500/10 pb-4 mb-4 flex items-center justify-between">
                      <h2 className="font-mono text-sm font-bold tracking-wider text-slate-200 uppercase">ACTIVE CASE MATRIX</h2>
                      <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-xs text-cyan-400 border border-cyan-800/40">
                        {filteredInvestigations.length} cases registered
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                      {filteredInvestigations.length > 0 ? (
                        filteredInvestigations.map((caseItem) => {
                          const isCrit = normalizeScore(caseItem.confidence) > 85 || caseItem.emergencyAlert?.detected;
                          const isSelected = selectedCaseId === caseItem._id;
                          return (
                            <div
                              key={caseItem._id}
                              onClick={() => setSelectedCaseId(caseItem._id)}
                              className={`rounded-lg border p-3.5 transition-all cursor-pointer relative overflow-hidden ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-950/15 shadow-[0_0_15px_rgba(34,211,238,0.08)]'
                                  : isCrit
                                  ? 'border-red-500/25 bg-red-950/5 hover:border-red-500/40'
                                  : 'border-cyan-500/10 bg-[#070b13] hover:border-cyan-500/20'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      caseItem.status === 'closed' ? 'bg-emerald-400' : isCrit ? 'bg-red-500 animate-ping' : 'bg-cyan-400'
                                    }`} />
                                    <span className="font-mono text-xs font-bold text-slate-200">CASE: {caseItem._id}</span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-1">{caseItem.inputText}</p>
                                </div>
                                <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                                  caseItem.status === 'closed'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/30'
                                    : caseItem.status === 'reviewing'
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800/30'
                                    : 'bg-red-950 text-red-400 border border-red-800/30'
                                }`}>
                                  {caseItem.status}
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                                <span>DATE: {new Date(caseItem.createdAt).toLocaleString()}</span>
                                <span className="text-cyan-400 font-bold">CONFIDENCE: {formatPercent(caseItem.confidence)}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500 font-mono text-xs">
                          {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching investigation file found.' : 'No investigation files are registered yet.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investigation Details Panel */}
                  <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md h-[calc(100vh-14rem)] overflow-y-auto">
                    {selectedCaseId ? (
                      (() => {
                        const target = crimeReports.find((r) => r._id === selectedCaseId);
                        if (!target) return <div className="text-slate-500 text-xs font-mono">Case not found.</div>;
                        const isCrit = normalizeScore(target.confidence) > 85 || target.emergencyAlert?.detected;
                        return (
                          <div className="space-y-5 font-mono text-xs">
                            <div className="border-b border-cyan-500/10 pb-3">
                              <span className="text-[10px] tracking-wider text-slate-500 uppercase">INVESTIGATION DOSSIER</span>
                              <h3 className="text-sm font-bold text-white mt-1 break-all">{target._id}</h3>
                            </div>

                            <div>
                              <span className="text-slate-500 block mb-1">THREAT CLASSIFICATION</span>
                              <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                                isCrit ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-cyan-500/10 text-cyan-400'
                              }`}>
                                {isCrit ? <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> : <Shield className="h-3.5 w-3.5" />}
                                {target.prediction || 'crime-related'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500 block mb-1">TELEMETRY DATA STREAM</span>
                              <div className="max-h-36 overflow-y-auto rounded-lg bg-black/40 border border-cyan-500/5 p-3 text-slate-300 text-[11px] leading-relaxed break-words">
                                {target.inputText}
                              </div>
                            </div>

                            {target.investigatorNotes && (
                              <div className="rounded-lg bg-cyan-950/10 border border-cyan-800/20 p-3">
                                <span className="text-cyan-400 font-bold block mb-1">INVESTIGATOR LOG</span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">{target.investigatorNotes}</p>
                              </div>
                            )}

                            {/* Action Form */}
                            <div className="border-t border-cyan-500/10 pt-4 space-y-3">
                              <span className="text-slate-500 block">CASE STATUS WORKFLOW</span>
                              
                              <textarea
                                value={caseNoteInput}
                                onChange={(e) => setCaseNoteInput(e.target.value)}
                                placeholder="Append investigation log notes..."
                                className="w-full rounded bg-[#070b13] border border-cyan-500/10 p-2.5 text-cyan-300 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                                rows={3}
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(target._id, 'reviewing')}
                                  disabled={updatingCaseId === target._id}
                                  className="rounded bg-amber-500/15 border border-amber-500/30 py-2 text-center text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                                >
                                  Investigate
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(target._id, 'closed')}
                                  disabled={updatingCaseId === target._id}
                                  className="rounded bg-emerald-500/15 border border-emerald-500/30 py-2 text-center text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                                >
                                  Resolve Case
                                </button>
                              </div>

                              <button
                                onClick={() => handleDeleteReport(target._id)}
                                className="w-full rounded bg-rose-500/10 border border-rose-500/20 py-2 text-center text-rose-400 transition-colors hover:bg-rose-500/20 flex items-center justify-center gap-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Purge Threat File
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500 font-mono text-xs">
                        Select a case dossier from active matrix list.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'threat' && (
                <motion.div
                  key="threat"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 text-left font-mono"
                >
                  <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md">
                    <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-4">THREAT LEVEL SPECIFICATION MATRIX</h2>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      
                      {/* Critical */}
                      <div className="rounded-lg border border-red-500/25 bg-red-950/5 p-4 relative">
                        <div className="absolute top-2 right-2 rounded-full h-2 w-2 bg-red-500 animate-ping" />
                        <span className="text-red-400 font-bold text-xs uppercase block">CRITICAL SEVERITY</span>
                        <div className="text-2xl font-bold text-white mt-1.5">{telemetry.openCases}</div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          Incidents matching immediate violence indicators, bomb plans, or kidnapping coordinate networks. Actions required immediately.
                        </p>
                      </div>

                      {/* Danger */}
                      <div className="rounded-lg border border-amber-500/20 bg-amber-950/5 p-4">
                        <span className="text-amber-400 font-bold text-xs uppercase block">MODERATE SEVERITY</span>
                        <div className="text-2xl font-bold text-white mt-1.5">{telemetry.reviewingCases}</div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          Incidents flagged for cyber harassment, coordinated fraud, or hate speech patterns. Require investigation within 12 hours.
                        </p>
                      </div>

                      {/* Monitored */}
                      <div className="rounded-lg border border-cyan-500/15 bg-cyan-950/5 p-4">
                        <span className="text-cyan-400 font-bold text-xs uppercase block">MONITORED CELLS</span>
                        <div className="text-2xl font-bold text-white mt-1.5">{telemetry.closedCases}</div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          Archived and resolved cases. Model logs and training vectors aggregated to prevent future false positives.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Dangerous keywords module */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md">
                      <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">CRITICAL THREAT KEYWORDS</h3>
                      <div className="flex flex-wrap gap-2.5">
                        {filteredDangerousKeywords.length > 0 ? filteredDangerousKeywords.map((kw, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs border ${
                              kw.weight === 'high'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]'
                                : kw.weight === 'mid'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}
                          >
                            <span>{kw.word}</span>
                            <span className="rounded bg-black/40 px-1 py-0.5 text-[9px] font-bold">{kw.count}</span>
                          </div>
                        )) : (
                          <div className="text-xs text-slate-500">
                            {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching threat keyword found.' : 'No dangerous NLP keywords detected in stored predictions.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md">
                      <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">PLATFORM SOURCE RATIOS</h3>
                      <div className="space-y-3.5">
                        {filteredPlatformRatios.length > 0 ? filteredPlatformRatios.map((src, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-300 font-semibold">{src.name}</span>
                              <span className="text-slate-500 font-mono">{src.count} items ({src.percentage}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${src.color}`} style={{ width: `${src.percentage}%` }} />
                            </div>
                          </div>
                        )) : (
                          <div className="text-xs text-slate-500">
                            {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching platform source found.' : 'No platform source records available yet.'}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {activeTab === 'posts' && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md text-left font-mono"
                >
                  <div className="border-b border-cyan-500/10 pb-4 mb-4 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">SUSPICIOUS POSTS MANAGEMENT MATRIX</h2>
                      <p className="text-[10px] text-slate-500 mt-1">Fetched live predictions showing threat scores and category designations.</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefresh}
                        className="rounded border border-cyan-500/20 bg-[#070b13] px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Force Pull
                      </button>
                    </div>
                  </div>

                  {/* Table Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-cyan-500/15 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 text-left">SOURCE</th>
                          <th className="pb-3 text-left">POST EXCERPT PREVIEW</th>
                          <th className="pb-3 text-center">THREAT SCORE</th>
                          <th className="pb-3 text-left">CATEGORY</th>
                          <th className="pb-3 text-left">TIMESTAMP</th>
                          <th className="pb-3 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/5">
                        {filteredPosts.length > 0 ? (
                          filteredPosts.map((post) => {
                            const isCrit = post.threatScore > 80 || post.isCrime;
                            return (
                              <tr key={post._id} className="hover:bg-cyan-500/5 transition-colors">
                                <td className="py-3.5 pr-2 font-bold text-cyan-400">
                                  {post.platform}
                                </td>
                                <td className="py-3.5 pr-4 max-w-xs sm:max-w-sm truncate text-slate-200">
                                  {post.inputText}
                                </td>
                                <td className="py-3.5 text-center">
                                  <span className={`rounded font-bold px-1.5 py-0.5 border ${
                                    isCrit ? 'bg-red-500/10 border-red-500/35 text-red-400' : 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400'
                                  }`}>
                                    {formatPercent(post.threatScore)}
                                  </span>
                                </td>
                                <td className="py-3.5 text-slate-400 font-semibold">{post.category}</td>
                                <td className="py-3.5 text-slate-500 text-[11px]">{new Date(post.createdAt).toLocaleDateString()}</td>
                                <td className="py-3.5 text-right space-x-1">
                                  <button
                                    onClick={() => {
                                      const matchingReport = findReportForPrediction(post);
                                      if (matchingReport) {
                                        setSelectedCaseId(matchingReport._id);
                                        setActiveTab('investigations');
                                      } else {
                                        alert('No active crime report case dossier exists for this post yet.');
                                      }
                                    }}
                                    className="rounded bg-cyan-950 px-2.5 py-1 text-[10px] text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900 transition-colors"
                                  >
                                    Investigate
                                  </button>
                                  <button
                                    onClick={() => handleFlagPost(post)}
                                    className="rounded bg-amber-950 px-2 py-1 text-[10px] text-amber-300 border border-amber-800/30 hover:bg-amber-900 transition-colors"
                                    title="Flag Content"
                                  >
                                    <Flag className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRemovePost(post)}
                                    className="rounded bg-rose-950 px-2 py-1 text-[10px] text-rose-300 border border-rose-800/30 hover:bg-rose-900 transition-colors"
                                    title="Purge Incident"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleViewPostDetails(post)}
                                    className="rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500">
                              {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching suspicious post found.' : 'No suspicious posts registered.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'categories' && (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 text-left font-mono"
                >
                  <div className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md">
                    <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-4">CRIME CATEGORY TELEMETRY</h2>

                    {/* SVG bar chart showing crime categories */}
                    <div className="h-60 w-full flex items-end justify-between px-6 pt-6 border-b border-cyan-500/10">
                      {filteredCategoryChartData.length > 0 ? filteredCategoryChartData.map((data, idx) => {
                        const maxCount = Math.max(...filteredCategoryChartData.map((d) => d.count)) || 1;
                        const pct = Math.round((data.count / maxCount) * 80) + 10; // min height 10%
                        return (
                          <div key={idx} className="flex flex-col items-center w-1/8 group">
                            <span className="text-[10px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                              {data.count}
                            </span>
                            <div
                              className="w-8 rounded-t bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:from-cyan-400 hover:to-white transition-all duration-300"
                              style={{ height: `${pct}%` }}
                            />
                            <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">
                              {data.name}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-xs text-slate-500">
                          {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching crime category found.' : 'No crime category data is available yet.'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {filteredCategoryMonitorCards.length > 0 ? filteredCategoryMonitorCards.map((card) => (
                      <div key={card.name} className={`rounded-lg border p-4.5 ${card.color}`}>
                        <h4 className="font-bold text-xs uppercase mb-1.5">{card.name} MONITOR</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {card.count} stored detection{card.count === 1 ? '' : 's'} currently represent {card.percentage}% of the live category dataset.
                        </p>
                      </div>
                    )) : (
                      <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-5 text-center text-xs text-slate-500 sm:col-span-3">
                        {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching category monitor found.' : 'No live crime category detections are available yet.'}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'users' && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md text-left font-mono"
                >
                  <div className="border-b border-cyan-500/10 pb-4 mb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">HIGH RISK USERS WATCHLIST</h2>
                      <p className="text-[10px] text-slate-500 mt-1">Social handles and profile vectors flagged for persistent incitement or fraud coordination.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-cyan-500/15 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 text-left">SUSPECT RECORD</th>
                          <th className="pb-3 text-left">HANDLE</th>
                          <th className="pb-3 text-center">RISK INDEX</th>
                          <th className="pb-3 text-left">ACTIVITY LAYER</th>
                          <th className="pb-3 text-left">LAST SIGNAL</th>
                          <th className="pb-3 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/5">
                        {filteredHighRiskSubjects.length > 0 ? filteredHighRiskSubjects.map((sus) => (
                          <tr key={sus.id} className="hover:bg-cyan-500/5 transition-colors">
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 border border-slate-700">
                                  {sus.name.slice(0, 2)}
                                </div>
                                <span className="font-semibold text-slate-200">{sus.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-cyan-400 font-bold">{sus.handle}</td>
                            <td className="py-3.5 text-center">
                              <span className="rounded bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-red-400 font-bold">
                                {formatPercent(sus.riskScore)}
                              </span>
                            </td>
                            <td className="py-3.5 text-slate-400">{sus.activity}</td>
                            <td className="py-3.5 text-slate-500 text-[11px]">{relativeTime(sus.lastSignalAt)}</td>
                            <td className="py-3.5 text-right">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                sus.status === 'Monitored'
                                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                                  : sus.status === 'Under Review'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800/35 animate-pulse'
                                  : 'bg-red-950 text-red-400 border border-red-800/30'
                              }`}>
                                {sus.status}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500">
                              {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching high-risk user found.' : 'No high-risk users or source actors found in live predictions.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'evidence' && (
                <motion.div
                  key="evidence"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md text-left font-mono"
                >
                  <div className="border-b border-cyan-500/10 pb-4 mb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">DIGITAL EVIDENCE VAULT</h2>
                      <p className="text-[10px] text-slate-500 mt-1">Aggregated text clippings, PDF file buffers, and scraping reports archived for judicial use.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {filteredEvidenceRecords.length > 0 ? filteredEvidenceRecords.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                            <span>FILE REF: {ev.id}</span>
                            <span className="rounded bg-cyan-950 px-1 border border-cyan-800/30 text-cyan-300">{ev.format}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">{ev.title}</h4>
                          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                            <span>CATEGORY: <span className="text-cyan-400">{ev.category}</span></span>
                            <span>SIZE: {ev.size}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-cyan-500/5 flex justify-between items-center">
                          <span className="text-[9px] text-slate-500">ARCHIVED: {new Date(ev.date).toLocaleDateString()}</span>
                          <button
                            onClick={() => { setSelectedCaseId(ev.id); setActiveTab('investigations'); }}
                            className="rounded bg-cyan-950 border border-cyan-800/30 px-3 py-1 text-[10px] text-cyan-300 hover:bg-cyan-900"
                          >
                            Open Case
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-6 text-center text-xs text-slate-500 sm:col-span-2">
                        {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching evidence record found.' : 'No crime report evidence records are available yet.'}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md text-left font-mono"
                >
                  <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-2">INTELLIGENCE REPORT GENERATOR</h2>
                  <p className="text-[10px] text-slate-500 mb-6">Compile and export active threat databases into standard file arrays for distribution.</p>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    
                    <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-5 flex flex-col justify-between">
                      <div>
                        <FileText className="h-8 w-8 text-cyan-400 mb-3" />
                        <h3 className="text-xs font-bold text-white uppercase mb-1">Standard CSV Export</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Generates comma-separated values database matching active cases, platform sources, timestamps, and confidence coordinates.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExport('csv')}
                        className="mt-6 rounded bg-cyan-500/10 border border-cyan-500/20 py-2.5 text-center text-xs text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Download className="h-4 w-4" /> Export CSV Array
                      </button>
                    </div>

                    <div className="rounded-lg border border-cyan-500/10 bg-[#070b13] p-5 flex flex-col justify-between">
                      <div>
                        <Code className="h-8 w-8 text-cyan-400 mb-3" />
                        <h3 className="text-xs font-bold text-white uppercase mb-1">Raw JSON Array</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Extracts structured Javascript Object Notation documents containing the full database schema including alerts and segments.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExport('json')}
                        className="mt-6 rounded bg-cyan-500/10 border border-cyan-500/20 py-2.5 text-center text-xs text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Download className="h-4 w-4" /> Export JSON Document
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}

              {activeTab === 'alerts' && (
                <motion.div
                  key="alerts"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-red-500/20 bg-red-950/5 p-6 backdrop-blur-md text-left font-mono relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-48 w-48 bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="flex flex-wrap justify-between items-center border-b border-red-500/20 pb-4 mb-4 gap-3">
                    <div className="flex items-center gap-2.5">
                      <Siren className="h-6 w-6 text-red-500 animate-pulse" />
                      <div>
                        <h2 className="text-sm font-bold tracking-wider text-red-400 uppercase">TACTICAL EMERGENCY PANEL</h2>
                        <p className="text-[10px] text-slate-500">Live emergency triggers monitored by threat recognition servers.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sound-alert"
                        checked={alertSound}
                        onChange={(e) => setAlertSound(e.target.checked)}
                        className="rounded border-red-500/30 bg-black text-red-500 focus:ring-0"
                      />
                      <label htmlFor="sound-alert" className="text-xs text-slate-400">Audio Alarm enabled</label>
                    </div>
                  </div>

                  {/* Pulsing Alert Display */}
                  <div className="rounded-lg border border-red-500/20 bg-black/40 p-12 text-center flex flex-col items-center justify-center mb-6">
                    <div className="relative h-20 w-20 flex items-center justify-center">
                      <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500/20" />
                      <div className="rounded-full bg-red-500/10 border border-red-500/30 p-5">
                        <Siren className="h-10 w-10 text-red-500" />
                      </div>
                    </div>
                    <h3 className={`text-lg font-bold uppercase mt-4 ${threatLevel.className}`}>THREAT ALERT LEVEL: {threatLevel.label}</h3>
                    <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                      {threatLevel.summary} AI recognition is scanning live reports, stored predictions, and emergency alert events from the backend.
                    </p>
                  </div>

                  {/* Alert history */}
                  <div className="space-y-3">
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider">RECENT INCIDENTS FILED</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {filteredLiveAlerts.length > 0 ? (
                        filteredLiveAlerts.map((a) => (
                          <div key={a._id} className="rounded bg-black/40 border border-red-500/15 p-3 flex justify-between items-center text-xs">
                            <div>
                              <span className="text-red-400 font-bold uppercase">{a.severity} alert</span>
                              <p className="text-slate-300 font-medium mt-0.5">{a.title}</p>
                            </div>
                            <span className="text-slate-500">{new Date(a.createdAt).toLocaleTimeString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 text-xs">
                          {normalizedSearchQuery ? 'Waxaas ma jiraan. No matching incident alert found.' : 'No critical incident alerts recorded in current session.'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-cyan-500/10 bg-[#090f1d]/75 p-5 backdrop-blur-md text-left font-mono text-xs"
                >
                  <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-4">SYSTEM DIAGNOSTICS CONTROL</h2>

                  <div className="space-y-4 max-w-xl">
                    <div className="rounded-lg bg-black/40 border border-cyan-500/5 p-4">
                      <h3 className="text-cyan-400 font-bold mb-2 uppercase">Core API Configurations</h3>
                      <div className="space-y-2 text-slate-400">
                        <div className="flex justify-between border-b border-cyan-500/5 pb-1.5">
                          <span>Backend Host Address:</span>
                          <span className="text-slate-300 select-all">{API_URL}</span>
                        </div>
                        <div className="flex justify-between border-b border-cyan-500/5 pb-1.5">
                          <span>Model API Address:</span>
                          <span className="text-slate-300 select-all">{modelInfo?.python_api || 'http://localhost:5000'}</span>
                        </div>
                        <div className="flex justify-between border-b border-cyan-500/5 pb-1.5">
                          <span>Socket Gateway Address:</span>
                          <span className="text-slate-300 select-all">{SOCKET_URL}</span>
                        </div>
                        <div className="flex justify-between border-b border-cyan-500/5 pb-1.5">
                          <span>Database Adapter:</span>
                          <span className="text-slate-300 select-all">
                            {diagnostics.database?.connected ? 'MongoDB connected' : diagnostics.database?.fallback_storage ? 'Local JSON fallback' : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-black/40 border border-cyan-500/5 p-4">
                      <h3 className="text-cyan-400 font-bold mb-2 uppercase">Diagnostic Status</h3>
                      <div className="space-y-2 text-slate-400">
                        <div className="flex justify-between items-center border-b border-cyan-500/5 pb-1.5">
                          <span>Emergency Alerts Pipeline:</span>
                          <span className={`rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${alertPipelineStatus.className}`}>
                            {alertPipelineStatus.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-cyan-500/5 pb-1.5">
                          <span>Socket Notifications:</span>
                          <span className={`rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${socketGatewayStatus.className}`}>
                            {socketGatewayStatus.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-cyan-500/5 pb-1.5">
                          <span>Twilio SMS Dispatch:</span>
                          <span className={`rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${smsDispatchStatus.className}`}>
                            {smsDispatchStatus.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-cyan-500/5 pb-1.5">
                          <span>SMTP Email Dispatch:</span>
                          <span className={`rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${emailDispatchStatus.className}`}>
                            {emailDispatchStatus.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

// SVG mock icon/markup for JSON Code representation in exporting tab
const Code = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

export default Dashboard;
