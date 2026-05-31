export const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  POLICE: 'police',
  USER: 'user'
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.ANALYST]: 'Analyzeye',
  [ROLES.POLICE]: 'Police/Investigator',
  [ROLES.USER]: 'Standard User'
};

export const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.ANALYST, ROLES.POLICE];
export const ADMIN_ROLES = [ROLES.ADMIN];
export const POLICE_INVESTIGATOR_ROLES = [ROLES.POLICE];

export const canViewDashboard = (role) => DASHBOARD_ROLES.includes(role);
export const canViewAdmin = (role) => ADMIN_ROLES.includes(role);
export const canViewPoliceInvestigatorTools = (role) => POLICE_INVESTIGATOR_ROLES.includes(role);
