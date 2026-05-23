import { ShieldX, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="max-w-xl mx-auto py-8 sm:py-20">
    <div className="glass-panel p-5 text-center sm:p-8">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-danger/10 border border-danger/30 text-danger">
        <ShieldX className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold mb-3">Access Denied</h1>
      <p className="text-textMuted mb-6">
        Role akoonkaaga ma furi karo goobtan shaqo.
      </p>
      <Link to="/analyze" className="btn-primary inline-flex">
        <ArrowLeft className="w-4 h-4" /> Ku noqo Analyticsta
      </Link>
    </div>
  </div>
);

export default Unauthorized;
