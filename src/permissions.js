export const ROLE_NAMES = {
  ADMIN: 'Admin',
  MINISTRY_LEADER: 'Ministry Leader',
  STAFF: 'Staff',
  MEMBER: 'Member'
};

export const normalizeRole = (role) => {
  if (!role) return null;
  const value = String(role).trim().toLowerCase();
  if (value.includes('admin')) return ROLE_NAMES.ADMIN;
  if (value.includes('ministry')) return ROLE_NAMES.MINISTRY_LEADER;
  if (value.includes('staff')) return ROLE_NAMES.STAFF;
  return ROLE_NAMES.MEMBER;
};

export const PERMISSIONS = {
  dashboard: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  bible: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  members: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER],
  events: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  attendance: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  ministries: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  prayers: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  advising: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER],
  finances: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF],
  analytics: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER],
  inventory: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF],
  profile: [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER]
};

export const hasPermission = (role, permissionKey) => {
  const normalized = normalizeRole(role);
  return normalized && PERMISSIONS[permissionKey]?.includes(normalized);
};

export const canManageEvents = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER].includes(normalizeRole(role));
export const canManageAttendance = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF].includes(normalizeRole(role));
export const canManageMinistries = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER].includes(normalizeRole(role));
export const canSubmitAdvising = (role) => [ROLE_NAMES.STAFF, ROLE_NAMES.MEMBER].includes(normalizeRole(role));
export const canManageAdvising = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER].includes(normalizeRole(role));
export const canManagePrayers = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER].includes(normalizeRole(role));
export const canManageFinances = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF].includes(normalizeRole(role));
export const canViewAnalytics = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER].includes(normalizeRole(role));
export const canViewInventory = (role) => [ROLE_NAMES.ADMIN, ROLE_NAMES.MINISTRY_LEADER, ROLE_NAMES.STAFF].includes(normalizeRole(role));
