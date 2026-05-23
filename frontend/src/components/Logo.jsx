const LogoMark = ({ className = 'h-10 w-10' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    role="img"
    aria-label="CrimeSense AI logo"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="crimeSenseLogoGradient" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.52" stopColor="#2563eb" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="crimeSenseLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#2563eb" floodOpacity="0.35" />
      </filter>
    </defs>
    <rect width="64" height="64" rx="16" fill="#07111f" />
    <path
      d="M32 8 50 15.5v14.2c0 12.4-7.5 21.8-18 26.3-10.5-4.5-18-13.9-18-26.3V15.5L32 8Z"
      fill="url(#crimeSenseLogoGradient)"
      filter="url(#crimeSenseLogoGlow)"
    />
    <path
      d="M23.4 33.2c2.3 5.1 5.4 8.4 8.6 8.4s6.3-3.3 8.6-8.4M23.4 30.8c2.3-5.1 5.4-8.4 8.6-8.4s6.3 3.3 8.6 8.4M18.8 32h26.4"
      fill="none"
      stroke="#dbeafe"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
    <circle cx="32" cy="32" r="5.4" fill="#ffffff" />
    <circle cx="32" cy="32" r="2.3" fill="#0f172a" />
    <path
      d="M44.7 19.6 50 15.5v8.7"
      fill="none"
      stroke="#ffffff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.85"
      strokeWidth="2.4"
    />
  </svg>
);

const BrandLogo = ({ compact = false }) => (
  <span className="flex min-w-0 items-center gap-3">
    <LogoMark className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105 lg:h-11 lg:w-11" />
    {!compact && (
      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="truncate text-xl font-bold tracking-tight text-text lg:text-2xl">
          Dambi Baare AI
        </span>
        <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary">
          Somali Intelligence Center
        </span>
      </span>
    )}
  </span>
);

export { BrandLogo, LogoMark };
