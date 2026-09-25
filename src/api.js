import axios from 'axios';

const API_BASE_RAW = import.meta.env.VITE_API_URL;
const API_BASE = API_BASE_RAW && /^https?:\/\//i.test(API_BASE_RAW)
  ? API_BASE_RAW
  : API_BASE_RAW
    ? `https://${API_BASE_RAW}`
    : API_BASE_RAW;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {

  // Inventory
  getInventory: (status) => apiClient.get('/api/inventory', { params: status ? { status } : {} }),
  getInventoryActivity: (params) => apiClient.get('/api/inventory/activity', { params }),
  createInventory: (itemData) => apiClient.post('/api/inventory', itemData),
  updateInventory: (id, itemData) => apiClient.put(`/api/inventory/${id}`, itemData),
  archiveInventory: (id) => apiClient.patch(`/api/inventory/${id}/archive`),
  unarchiveInventory: (id) => apiClient.patch(`/api/inventory/${id}/unarchive`),
  deleteInventory: (id) => apiClient.delete(`/api/inventory/${id}`),


  //announcement
  getAnnouncement: () => apiClient.get('/api/settings/announcement'),
  getAnnouncementHistory: () => apiClient.get('/api/settings/announcement/history'),
  updateAnnouncement: (text, userName) => apiClient.post('/api/settings/announcement', { text, userName }),

  //qr thing
  recordAttendance: (checkInData) => apiClient.post('/api/attendance', checkInData),
  
  //AI stuff
  analyzeSchedule: (aiData) => apiClient.post('/api/ai/analyze-schedule', aiData),
  analyzeMetrics: (stats) => apiClient.post('/api/ai/analyze-metrics', stats),

  // Authentication
  login: (credentials) => apiClient.post('/login', credentials),
  register: (formData) => apiClient.post('/register', formData),
  verifyOtp: (data) => apiClient.post('/verify-otp', data),
  forgotPassword: (data) => apiClient.post('/forgot-password', data),
  resetPassword: (data) => apiClient.post('/reset-password', data),

  // Members
  getMembers: () => apiClient.get('/api/members'),
  getMember: (id) => apiClient.get(`/api/members/${id}`),
  createMember: (memberData) => apiClient.post('/api/members', memberData),
  updateMember: (id, memberData) => apiClient.put(`/api/members/${id}`, memberData),
  deleteMember: (id) => apiClient.delete(`/api/members/${id}`),

  // Community chat
  getChatConversations: (userId) => apiClient.get('/api/chat/conversations', {
    headers: { 'x-user-id': userId }
  }),
  createChatConversation: (conversationData, userId) => apiClient.post('/api/chat/conversations', conversationData, {
    headers: { 'x-user-id': userId }
  }),
  getChatMessages: (conversationId, userId) => apiClient.get(`/api/chat/conversations/${conversationId}/messages`, {
    headers: { 'x-user-id': userId }
  }),
  
  sendChatMessage: (conversationId, messageData, userId) => apiClient.post(`/api/chat/conversations/${conversationId}/messages`, messageData, {
    headers: { 'x-user-id': userId }
  }),
  addChatMembers: (conversationId, memberIds, userId) => 
  apiClient.post(`/api/chat/conversations/${conversationId}/members`, { memberIds }, {
    headers: { 'x-user-id': userId }
  }),
  removeChatMember: (conversationId, memberId, userId) => apiClient.delete(`/api/chat/conversations/${conversationId}/members/${memberId}`, {
    headers: { 'x-user-id': userId }
  }),
  transferChatOwnership: (conversationId, newOwnerId, userId) => apiClient.patch(`/api/chat/conversations/${conversationId}/owner`, { newOwnerId }, {
    headers: { 'x-user-id': userId }
  }),
  deleteChatConversation: (conversationId, userId) => apiClient.delete(`/api/chat/conversations/${conversationId}`, {
    headers: { 'x-user-id': userId }
  }),
  
  // Events
  getEvents: () => apiClient.get('/api/events'), 
  getLocations: () => apiClient.get('/api/locations'),
  createEvent: (eventData) => apiClient.post('/api/events', eventData), 
  updateEvent: (id, eventData) => apiClient.put(`/api/events/${id}`, eventData), 
  archiveEvent: (id) => apiClient.patch(`/api/events/${id}/archive`),
  toggleEventAttendance: (eventId, userId) => 
  apiClient.post(`/api/events/${eventId}/toggle-attendance`, { userId }),

  // Attendance
  getAttendance: () => apiClient.get('/api/attendance'),

  // Finances
  getFinances: (userId, role) => apiClient.get('/api/finances', {
    headers: {
      'x-user-id': userId,
      'x-user-role': role
    }
  }),
  addFinanceRecord: (recordData, role, userId, userName) => apiClient.post('/api/finances', recordData, {
    headers: {
      'x-user-role': role,
      'x-user-id': userId,
      'x-user-name': userName || ''
    }
  }),
  

  // Ministries
  getMinistries: (role) => apiClient.get('/api/ministries', {
    headers: { 'x-user-role': role }
  }),
  getMinistryByName: (name, role) => apiClient.get(`/api/ministries/name/${encodeURIComponent(name)}`, {
    headers: { 'x-user-role': role }
  }),
  createMinistry: (ministryData) => apiClient.post('/api/ministries', ministryData),
  updateMinistry: (id, editFormData) => apiClient.patch(`/api/ministries/${id}`, editFormData),
  deleteMinistry: (id) => apiClient.delete(`/api/ministries/${id}`),
  announceToMinistry: (id, announcementText, role, userName) => apiClient.post(`/api/ministries/${id}/announcement`, { announcementText }, {
    headers: { 'x-user-role': role, 'x-user-name': userName || '' }
  }),
  applyForMinistry: (id, requestData) => apiClient.post(`/api/ministries/${id}/join-request`, requestData),
  approveMinistryRequest: (ministryId, requestId, role) => apiClient.patch(`/api/ministries/${ministryId}/join-request/${requestId}/approve`, {}, {
    headers: { 'x-user-role': role }
  }),
  rejectMinistryRequest: (ministryId, requestId, role) => apiClient.patch(`/api/ministries/${ministryId}/join-request/${requestId}/reject`, {}, {
    headers: { 'x-user-role': role }
  }),

  // Prayers
  getPrayers: (userId, role) => apiClient.get('/api/prayers', {
    headers: {
      'x-user-id': userId,
      'x-user-role': role
    }
  }),
  submitPrayer: (newEntry) => apiClient.post('/api/prayers', newEntry),
  incrementPraying: (id) => apiClient.patch(`/api/prayers/${id}/pray`),
  
  markAnswered: (id, role) => apiClient.patch(`/api/prayers/${id}/answer`, {}, {
    headers: {
      'x-user-role': role
    }
  }),
  getNotifications: (userId, role) => apiClient.get('/api/notifications', {
    headers: {
      'x-user-id': userId,
      'x-user-role': role
    }
  }),
  markNotificationRead: (notificationId, userId) => apiClient.patch(`/api/notifications/${notificationId}/read`, {}, {
    headers: {
      'x-user-id': userId
    }
  }),
  clearNotifications: (userId) => apiClient.patch(`/api/notifications/clear`, {}, {
    headers: {
      'x-user-id': userId
    }
  }),

  // Advising
  getAdvising: (userId, role) => apiClient.get('/api/advising', {
    headers: {
      'x-user-id': userId,
      'x-user-role': role
    }
  }),
  submitAdvising: (requestData) => apiClient.post('/api/advising', requestData),
  acceptAdvising: (id, scheduleData, role) => apiClient.patch(`/api/advising/${id}/accept`, scheduleData, {
    headers: {
      'x-user-role': role
    }
  }),
  ignoreAdvising: (id, ignoreData, role) => apiClient.patch(`/api/advising/${id}/ignore`, ignoreData, {
    headers: {
      'x-user-role': role
    }
  })
};

export default api;