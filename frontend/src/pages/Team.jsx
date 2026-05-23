import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Database,
  Mail,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';

const teamMembers = [
  {
    name: 'Yasin Mohamud Abdullahi',
    role: 'Project Lead',
    focus: 'System architecture, project direction, and full-stack coordination.',
    location: 'Mogadishu, Somalia',
    icon: ShieldCheck,
    accent: 'text-blue-400',
  },
  {
    name: 'Nimco Abdiaziz Said',
    role: 'AI Model Engineer',
    focus: 'Model training, feature extraction, and prediction quality assurance.',
    location: 'Mogadishu, Somalia',
    icon: BrainCircuit,
    accent: 'text-amber-300',
  },
  {
    name: 'Nasteha Mohamud Mohamed',
    role: 'Backend Developer',
    focus: 'API design, authentication, data storage, and alert services.',
    location: 'Mogadishu, Somalia',
    icon: Database,
    accent: 'text-emerald-400',
  },
  {
    name: 'Najma Muhudin Mohamed',
    role: 'Frontend Developer',
    focus: 'Dashboards, analysis workspace, usability, and UI polish.',
    location: 'Mogadishu, Somalia',
    icon: UserRoundCheck,
    accent: 'text-purple-300',
  },
];

const Team = () => (
  <div className="mx-auto max-w-7xl py-4 sm:py-8">
    <section className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Team
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">The team behind Detect AI</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-textMuted sm:text-base">
          A cross-functional team working across machine learning, backend, frontend, and security review to build a trusted crime-related content detection system.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel p-5"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TeamStat value="4" label="Core members" />
          <TeamStat value="4" label="Workstreams" />
          <TeamStat value="1" label="Shared mission" />
        </div>
      </motion.div>
    </section>

    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {teamMembers.map((member, index) => (
        <TeamCard key={member.name} member={member} index={index} />
      ))}
    </section>

    <section className="mt-10 grid gap-5 lg:grid-cols-3">
      <TeamPrinciple
        title="Accuracy First"
        text="Model results are treated as operational signals, so the team prioritizes text cleanup and clear confidence scoring."
      />
      <TeamPrinciple
        title="Fast Response"
        text="Emergency alerts, dashboards, and reports quickly route critical information to the right people."
      />
      <TeamPrinciple
        title="Responsible Access"
        text="Role-based controls protect sensitive analytics and administrative actions."
      />
    </section>
  </div>
);

const TeamCard = ({ member, index }) => {
  const Icon = member.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="glass-panel flex min-h-[330px] flex-col p-5"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface">
        <Icon className={`h-8 w-8 ${member.accent}`} />
      </div>

      <div className="min-h-20">
        <h2 className="text-xl font-bold text-white">{member.name}</h2>
        <p className={`mt-2 text-sm font-semibold ${member.accent}`}>{member.role}</p>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-textMuted">{member.focus}</p>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-textMuted">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{member.location}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-textMuted">
          <Mail className="h-4 w-4 shrink-0" />
          <span>{member.name.toLowerCase().replace(/\s+/g, '.')}@crimesense.ai</span>
        </div>
      </div>
    </motion.article>
  );
};

const TeamStat = ({ value, label }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="text-3xl font-black text-white">{value}</div>
    <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-textMuted">{label}</div>
  </div>
);

const TeamPrinciple = ({ title, text }) => (
  <div className="rounded-xl border border-white/10 bg-surfaceLight/70 p-5">
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-textMuted">{text}</p>
  </div>
);

export default Team;
