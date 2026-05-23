import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Database, RefreshCw, ShieldAlert, ShieldCheck, Siren } from 'lucide-react';
import { getHistory } from '../services';

const getIsCrime = (item) => item.isCrime ?? item.result?.is_crime ?? false;
const getPrediction = (item) => (getIsCrime(item) ? 'crime-related' : 'not crime-related');
const getConfidence = (item) => item.confidence ?? item.result?.confidence ?? 0;
const hasEmergencyAlert = (item) => Boolean(item.emergencyAlert?.detected);
const getInputText = (item) => (
  item.inputText ||
  item.input?.text ||
  item.input?.url ||
  item.input?.filename ||
  (item.input?.batch_count ? `${item.input.batch_count} items (Batch)` : 'No input text')
);

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const data = await getHistory(page, 20);
      setPredictions(data.predictions || data.analyses || []);
      setPagination(data.pagination || { page, pages: 1, total: 0, limit: 20 });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Prediction history could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchHistory(1), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-3 sm:text-3xl">
            <Clock className="w-8 h-8 text-primary" /> Prediction History
          </h1>
          <p className="text-textMuted text-sm">
            Saved results with input text, confidence level, user, and timestamp.
          </p>
        </div>
        <button onClick={() => fetchHistory(pagination.page)} className="btn-outline w-full sm:w-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/20 bg-danger/10 p-4 text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={<Database className="w-5 h-5 text-primary" />} label="Saved Predictions" value={pagination.total} />
        <SummaryCard icon={<ShieldAlert className="w-5 h-5 text-danger" />} label="Crime on this page" value={predictions.filter(getIsCrime).length} />
        <SummaryCard icon={<ShieldCheck className="w-5 h-5 text-success" />} label="Safe on this page" value={predictions.filter((item) => !getIsCrime(item)).length} />
      </div>

      <div className="glass-panel p-4 sm:p-6">
        <div className="table-scroll">
          <table className="responsive-table-wide w-full text-left border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-textMuted border-b border-white/5">
                <th className="pb-3 font-medium">Date / Time</th>
                <th className="pb-3 font-medium">Input Text</th>
                <th className="pb-3 font-medium">Prediction</th>
                <th className="pb-3 font-medium">Confidence</th>
                <th className="pb-3 font-medium">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {predictions.length > 0 ? (
                predictions.map((item, idx) => {
                  const isCrime = getIsCrime(item);
                  const emergency = hasEmergencyAlert(item);
                  return (
                    <motion.tr
                      key={item._id || idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`transition-colors ${
                        emergency ? 'bg-danger/10 ring-1 ring-danger/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-4 pr-4 text-sm text-textMuted whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="text-sm text-white/90 max-w-[420px] line-clamp-2">
                          {getInputText(item)}
                        </div>
                        <div className="text-xs text-textMuted mt-1 capitalize">{item.type}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                          isCrime
                            ? 'bg-danger/10 text-danger border-danger/20'
                            : 'bg-success/10 text-success border-success/20'
                        }`}>
                          {getPrediction(item)}
                        </span>
                        {emergency && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded border border-danger/40 bg-danger/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-danger">
                            <Siren className="h-3 w-3" />
                            Urgent
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="font-mono text-sm bg-white/5 px-2 py-1 rounded">
                          {Number(getConfidence(item)).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 text-sm">
                        <div className="font-medium text-white/90">{item.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-textMuted capitalize">{item.user?.role || 'user'}</div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-textMuted">
                    No predictions have been saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 mt-6 pt-4 border-t border-white/10 sm:flex-row sm:items-center">
          <button
            type="button"
            className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            disabled={pagination.page <= 1}
            onClick={() => fetchHistory(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-center text-sm text-textMuted">
            Page {pagination.page} / {pagination.pages || 1}
          </span>
          <button
            type="button"
            className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchHistory(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value }) => (
  <div className="glass-panel p-4">
    <div className="flex items-center gap-3">
      <div className="bg-surface p-2 rounded-lg border border-white/5">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-textMuted uppercase tracking-wider">{label}</div>
      </div>
    </div>
  </div>
);

export default PredictionHistory;
