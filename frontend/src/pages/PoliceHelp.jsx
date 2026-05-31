import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  FileSearch,
  HelpCircle,
  History,
  ListChecks,
  ShieldAlert,
  UserCircle,
} from 'lucide-react';

const guideSteps = [
  {
    icon: FileSearch,
    title: 'Run an analysis',
    text: 'Open Analyze, paste text or upload a file, then submit it for crime-risk detection.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review the result',
    text: 'Check the predicted category, confidence score, and any highlighted suspicious content.',
  },
  {
    icon: History,
    title: 'Track past cases',
    text: 'Use History to revisit previous analysis records and compare repeated patterns.',
  },
  {
    icon: UserCircle,
    title: 'Verify your profile',
    text: 'Keep your role and account details updated so permissions stay correct.',
  },
];

const bestPractices = [
  'Use clear case notes before submitting text for analysis.',
  'Confirm high-risk predictions manually before taking action.',
  'Avoid sharing private investigation data outside authorized users.',
  'Save important results in history for later reporting and review.',
];

const PoliceHelp = () => (
  <div className="mx-auto max-w-6xl py-4 sm:py-8">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Police Help Guide</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-textMuted">
          A quick operating guide for investigators using the crime detection system.
        </p>
      </div>
      <Link className="btn-primary w-full sm:w-fit" to="/analyze">
        <FileSearch className="h-4 w-4" />
        Start analysis
      </Link>
    </div>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {guideSteps.map(({ icon: Icon, title, text }) => (
        <div key={title} className="rounded-lg border border-white/10 bg-surface/70 p-4">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">{text}</p>
        </div>
      ))}
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="glass-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Investigator workflow</h2>
            <p className="text-sm text-textMuted">Recommended steps for handling a suspected case.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            'Collect the message, URL, file, or report details.',
            'Analyze the content and note the confidence level.',
            'Review the prediction against the original evidence.',
            'Escalate urgent threats through the proper police channel.',
          ].map((item, index) => (
            <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">
                {index + 1}
              </div>
              <p className="text-sm leading-relaxed text-textMuted">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Best practice</h2>
            <p className="text-sm text-textMuted">Keep investigations accurate and secure.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {bestPractices.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <p className="text-sm leading-relaxed text-textMuted">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>

    <section className="mt-6 grid gap-4 md:grid-cols-3">
      <InfoTile icon={AlertTriangle} label="Urgent detections" value="Escalate immediately" />
      <InfoTile icon={Clock3} label="History records" value="Use for follow-up" />
      <InfoTile icon={HelpCircle} label="Support" value="Contact system admin" />
    </section>
  </div>
);

const InfoTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border border-white/10 bg-surface/70 p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textMuted">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
    <div className="text-sm font-semibold text-white">{value}</div>
  </div>
);

export default PoliceHelp;
