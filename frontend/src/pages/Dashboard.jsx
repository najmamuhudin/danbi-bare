import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, ShieldCheck, Database, Clock, RefreshCw, Siren } from 'lucide-react';
import { getStats, getHistory, getModelInfo } from '../services';
import { Link } from 'react-router-dom';

const hasEmergencyAlert = (item) => Boolean(item.emergencyAlert?.detected);
const getIsCrime = (item) => item.isCrime ?? item.result?.is_crime ?? false;
const getPredictionLabel = (item) => (getIsCrime(item) ? 'crime-related' : 'not crime-related');

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, historyData, modelData] = await Promise.all([
        getStats(),
        getHistory(1, 10),
        getModelInfo().catch(() => null)
      ]);
      setStats(statsData);
      setHistory(historyData.predictions || historyData.analyses || []);
      setModelInfo(modelData);
      setError(null);
    } catch (err) {
      setError('Dashboard data could not be loaded. Check that the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-danger/10 text-danger p-4 rounded-xl border border-danger/20 max-w-md text-center">
          <p>{error}</p>
        </div>
        <button onClick={fetchData} className="btn-outline">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 sm:text-3xl">System Analytics</h1>
          <p className="text-textMuted text-sm">Overview of model performance and analysis history.</p>
        </div>
        <button onClick={fetchData} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-textMuted transition-colors hover:bg-white/10 hover:text-white" title="Refresh Data">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:mb-10">
        <StatCard 
          icon={<Database className="w-6 h-6 text-blue-400" />}
          title="Total Analyses"
          value={stats?.total || 0}
          subtitle="All processed inputs"
          delay={0.1}
        />
        <StatCard 
          icon={<ShieldAlert className="w-6 h-6 text-danger" />}
          title="Crime Detected"
          value={stats?.crime_count || 0}
          subtitle={`${stats?.crime_percentage || 0}% of all inputs`}
          delay={0.2}
          highlight="danger"
        />
        <StatCard 
          icon={<ShieldCheck className="w-6 h-6 text-success" />}
          title="Safe Content"
          value={stats?.not_crime_count || 0}
          subtitle={`${100 - (stats?.crime_percentage || 0)}% of all inputs`}
          delay={0.3}
          highlight="success"
        />
        <StatCard 
          icon={<Activity className="w-6 h-6 text-purple-400" />}
          title="Model Status"
          value={modelInfo?.model_loaded ? 'Online' : 'Offline'}
          subtitle={modelInfo?.model_type || 'Python AI Service'}
          delay={0.4}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Recent History Table */}
        <div className="lg:col-span-2 glass-panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Recent Activity
            </h2>
          </div>
          
          <div className="table-scroll">
            <table className="responsive-table w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/5">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Text excerpt</th>
                  <th className="pb-3 font-medium">Result</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.length > 0 ? (
                  history.map((item, idx) => {
                    const emergency = hasEmergencyAlert(item);
                    return (
                      <motion.tr
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item._id || idx}
                        className={`transition-colors group ${
                          emergency ? 'bg-danger/10 ring-1 ring-danger/20' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-4">
                          <span className="text-xs bg-surface border border-white/10 px-2 py-1 rounded capitalize text-white/80">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="text-sm text-white/90 truncate max-w-[250px] md:max-w-[350px]">
                            {item.inputText || item.input?.text || item.input?.url || item.input?.filename || `${item.input?.batch_count} items (Batch)`}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.type === 'batch' || item.type === 'file' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-danger font-medium">{item.summary?.crime_count || 0}</span>
                                <span className="text-xs text-textMuted">/</span>
                                <span className="text-xs text-success font-medium">{item.summary?.not_crime_count || 0}</span>
                              </div>
                            ) : (
                              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                getIsCrime(item) ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'
                              }`}>
                                {getPredictionLabel(item)}
                              </span>
                            )}
                            {emergency && (
                              <span className="inline-flex items-center gap-1 rounded border border-danger/40 bg-danger/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-danger">
                                <Siren className="h-3 w-3" />
                                Alert
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-xs text-textMuted group-hover:text-white/70 transition-colors">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-textMuted text-sm">
                      No analysis history found. <Link to="/analyze" className="text-primary hover:underline">Run an analysis</Link> so it appears here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="glass-panel p-4 flex flex-col sm:p-6">
          <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Usage by Type</h2>
          
          <div className="flex-1 flex flex-col justify-center gap-6">
            {stats && stats.by_type ? (
              Object.entries(stats.by_type).map(([type, count], idx) => {
                const percentage = Math.round((count / stats.total) * 100);
                const colors = {
                  text: 'bg-blue-500',
                  url: 'bg-purple-500',
                  file: 'bg-emerald-500',
                  batch: 'bg-amber-500'
                };
                
                return (
                  <div key={type} className="mb-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="capitalize text-white/90 font-medium">{type}</span>
                      <span className="text-textMuted">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surfaceLight rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                        className={`h-full rounded-full ${colors[type] || 'bg-primary'}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-textMuted text-sm">Not enough data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle, delay, highlight }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`glass-panel p-5 sm:p-6 relative overflow-hidden ${
      highlight === 'danger' ? 'border-danger/30 shadow-danger/10' : 
      highlight === 'success' ? 'border-success/30 shadow-success/10' : ''
    }`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="bg-surface p-2.5 rounded-lg border border-white/5">
        {icon}
      </div>
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm font-medium text-white/80 mb-1">{title}</div>
    <div className="text-xs text-textMuted">{subtitle}</div>
  </motion.div>
);

export default Dashboard;
