import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BellRing,
  Database,
  FileText,
  Globe,
  LockKeyhole,
  Radar,
  ShieldCheck,
  UploadCloud,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { getModelInfo } from '../services';

const formatPercent = (value) => (
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : 'Unavailable'
);

const getClassifierLabel = (info) => {
  if (!info) return 'Loading classifier metadata';
  if (!info.model_loaded) return 'Model unavailable';
  return [info.vectorizer_type, info.model_type].filter(Boolean).join(' + ') || 'Python classifier';
};

const Home = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoLoaded, setModelInfoLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getModelInfo()
      .then((info) => {
        if (mounted) setModelInfo(info);
      })
      .catch((err) => {
        if (mounted) {
          setModelInfo({
            model_loaded: false,
            model_error: err.response?.data?.model_error || err.response?.data?.error || err.message
          });
        }
      })
      .finally(() => {
        if (mounted) setModelInfoLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const modelReady = Boolean(modelInfo?.model_loaded);
  const statusLabel = !modelInfoLoaded
    ? 'Checking Python model state'
    : modelReady
      ? `${modelInfo.model_type || 'Python model'} loaded from live service`
      : 'Python model is unavailable';
  const classifierLabel = getClassifierLabel(modelInfo);
  const thresholdLabel = formatPercent(modelInfo?.crime_probability_threshold);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 py-4 sm:gap-16 sm:py-8">
      <section className="grid min-h-[72vh] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="mb-6 flex items-center gap-4">
            <LogoMark className="h-16 w-16 sm:h-20 sm:w-20" />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Dambi Baare AI</div>
              <div className="mt-2 text-sm text-textMuted">An intelligence workspace with Somali  support</div>
            </div>
          </div>

          <div className={`mb-6 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 ${
            modelReady
              ? 'border-success/25 bg-success/10 text-success'
              : modelInfoLoaded
                ? 'border-danger/25 bg-danger/10 text-danger'
                : 'border-primary/25 bg-primary/10 text-primary'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                modelReady ? 'bg-success' : modelInfoLoaded ? 'bg-danger' : 'bg-primary'
              }`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${
                modelReady ? 'bg-success' : modelInfoLoaded ? 'bg-danger' : 'bg-primary'
              }`}></span>
            </span>
            <span className="text-xs font-medium sm:text-sm">{statusLabel}</span>
          </div>
          
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Detect risky text before it slips through.
          </h1>
          
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-textMuted sm:text-xl">
            Analyze text, URLs, documents, and batch data with a trained model that detects crime-related signals and raises urgent alerts.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/analyze" className="btn-primary w-full py-4 px-8 text-base group sm:w-auto sm:text-lg">
              Start Analysis <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/team" className="btn-outline w-full py-4 px-8 text-base sm:w-auto sm:text-lg">
              View Team <Users className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="glass-panel overflow-hidden p-4 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-sm font-semibold text-white">Live Detection Console</div>
              <div className="mt-1 text-xs text-textMuted">Live metadata from /api/model/info</div>
            </div>
            <div className={`rounded-lg border px-3 py-1 text-xs font-bold ${
              modelReady ? 'border-success/20 bg-success/10 text-success' : 'border-danger/20 bg-danger/10 text-danger'
            }`}>
              {modelReady ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>

          <div className="grid gap-3">
            <ConsoleRow icon={Radar} label="Input scanner" value="Text, URL, file, batch" color="text-blue-400" />
            <ConsoleRow icon={Zap} label="ML classifier" value={classifierLabel} color="text-amber-300" />
            <ConsoleRow icon={ShieldCheck} label="Crime threshold" value={thresholdLabel} color="text-success" />
            <ConsoleRow icon={BellRing} label="Urgent alerts" value="Live, SMS, and email ready" color="text-danger" />
            <ConsoleRow icon={Database} label="Feature count" value={modelInfo?.feature_count ? `${modelInfo.feature_count} features` : 'Waiting for metadata'} color="text-emerald-400" />
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-background/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-success" />
              Model details
            </div>
            <div className="rounded-lg bg-surface p-3 font-mono text-xs leading-relaxed text-textMuted">
              classifier: <span className="text-white">{modelInfo?.model_type || 'pending'}</span><br />
              crime_threshold: <span className="text-white">{thresholdLabel}</span><br />
              state: <span className={modelReady ? 'text-success' : 'text-danger'}>{modelReady ? 'model loaded' : 'model unavailable'}</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard value="4" label="Input methods" detail="Text, URL, file, and batch" />
        <MetricCard value="24/7" label="Monitoring mode" detail="Fast checks for operational teams" />
        <MetricCard value="2" label="Languages" detail="Somali and English support" />
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Built for daily investigation work</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-textMuted sm:text-base">
              The system brings the important pieces close: fast classification, source review, stored history, and alerts for urgent information.
            </p>
          </div>
          <Link to="/dashboard" className="btn-outline w-full sm:w-auto">
            View Dashboard <Activity className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
          <FeatureCard 
            icon={<Globe className="h-8 w-8 text-blue-400" />}
            title="URL Intelligence"
            description="Extract an article from a link and classify the page without manually copying every paragraph."
            delay={0.2}
          />
          <FeatureCard 
            icon={<FileText className="h-8 w-8 text-amber-300" />}
            title="Text Classification"
            description="Paste Somali or English text, then get a clear result, confidence score, and processed text."
            delay={0.3}
          />
          <FeatureCard 
            icon={<UploadCloud className="h-8 w-8 text-emerald-400" />}
            title="Document Analysis"
            description="Upload a text document and review segment-level results for reports and cases."
            delay={0.4}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel p-6">
          <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold">Role-based access</h2>
          <p className="mt-3 text-sm leading-relaxed text-textMuted">
            Admins, analysts, police, and standard users see tools that match their responsibilities. Sensitive dashboards and reports stay controlled.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <WorkflowStep step="01" title="Collect" text="Submit text, a URL, a file, or batch data." />
          <WorkflowStep step="02" title="Classify" text="Clean the text, then run it through the trained model." />
          <WorkflowStep step="03" title="Act" text="Save predictions, create reports, and send alerts." />
        </div>
      </section>
    </div>
  );
};

const ConsoleRow = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="rounded-lg bg-surface p-2">
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-white">{label}</div>
      <div className="truncate text-xs text-textMuted">{value}</div>
    </div>
  </div>
);

const MetricCard = ({ value, label, detail }) => (
  <div className="glass-panel p-5">
    <div className="text-3xl font-black text-white">{value}</div>
    <div className="mt-2 text-sm font-semibold text-white/85">{label}</div>
    <div className="mt-1 text-xs text-textMuted">{detail}</div>
  </div>
);

const WorkflowStep = ({ step, title, text }) => (
  <div className="rounded-xl border border-white/10 bg-surfaceLight/70 p-5">
    <div className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-primary">{step}</div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-textMuted">{text}</p>
  </div>
);

const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300"
  >
    <div className="bg-surface p-3 rounded-xl inline-block mb-4 border border-white/5 shadow-inner">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
    <p className="text-textMuted leading-relaxed">{description}</p>
  </motion.div>
);

export default Home;
