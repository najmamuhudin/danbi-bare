const ROLES = Object.freeze({
  ADMIN: 'admin',
  ANALYST: 'analyst',
  POLICE: 'police',
  USER: 'user'
});

const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.ANALYST]: 'Analyst',
  [ROLES.POLICE]: 'Police/Investigator',
  [ROLES.USER]: 'Normal User'
});

const ALL_ROLES = Object.values(ROLES);
const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.ANALYST, ROLES.POLICE];

const normalizeRole = (role) => {
  const normalized = String(role || ROLES.USER).trim().toLowerCase();
  if (normalized === 'investigator' || normalized === 'police/investigator') {
    return ROLES.POLICE;
  }
  return ALL_ROLES.includes(normalized) ? normalized : ROLES.USER;
};

module.exports = {
  ALL_ROLES,
  DASHBOARD_ROLES,
  ROLE_LABELS,
  ROLES,
  normalizeRole
};
