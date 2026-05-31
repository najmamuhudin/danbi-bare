import { Link } from 'react-router-dom';
import { FileSearch, History, Mail, MapPin, ShieldCheck, Users } from 'lucide-react';
import { BrandLogo } from './Logo';

const quickLinks = [
  { to: '/', label: 'Home', icon: ShieldCheck },
  { to: '/analyze', label: 'Analyze', icon: FileSearch },
  { to: '/history', label: 'History', icon: History },
  { to: '/team', label: 'Team', icon: Users },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-surface/90 backdrop-blur-lg">
      <div className="container mx-auto px-3 py-8 sm:px-4 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="max-w-xl">
            <Link to="/" className="group inline-flex">
              <BrandLogo />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-textMuted">
              Nidaam caqli macmal ah oo ka caawiya falanqeynta qoraallada, URL-yada,
              dukumentiyada, iyo xogta dambiyada si shaqada baaristu u noqoto mid degdeg ah.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Links</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
              {quickLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-transparent px-2 text-sm text-textMuted transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Contact</h2>
            <div className="mt-4 grid gap-3 text-sm text-textMuted">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>support@dambibaare.ai</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>Somali Intelligence Center</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-textMuted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} Dambi Baare AI. All rights reserved.</p>
          <p>Built for secure crime detection and analysis workflows.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
