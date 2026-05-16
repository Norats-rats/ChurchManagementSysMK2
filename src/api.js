import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {

  //announcement
getAnnouncement: () => apiClient.get('/api/settings/announcement'),
  updateAnnouncement: (text) => apiClient.post('/api/settings/announcement', { text }),

  //qr thing
  recordAttendance: (checkInData) => apiClient.post('/api/attendance', checkInData),
  
  //AI stuff
  analyzeSchedule: (aiData) => apiClient.post('/api/ai/analyze-schedule', aiData),
  analyzeMetrics: (stats) => axios.post('/api/ai/analyze-metrics', stats),

  // Authentication
  login: (credentials) => apiClient.post('/login', credentials),
  register: (formData) => apiClient.post('/register', formData),
  verifyOtp: (data) => apiClient.post('/verify-otp', data),
  forgotPassword: (data) => apiClient.post('/forgot-password', data),
  resetPassword: (data) => apiClient.post('/reset-password', data),

  // Members
  getMembers: () => apiClient.get('/api/members'),
  createMember: (memberData) => apiClient.post('/api/members', memberData),
  updateMember: (id, memberData) => apiClient.put(`/api/members/${id}`, memberData),
  deleteMember: (id) => apiClient.delete(`/api/members/${id}`),

  // Events
  getEvents: () => apiClient.get('/api/events'), 
  createEvent: (eventData) => apiClient.post('/api/events', eventData), 
  updateEvent: (id, eventData) => apiClient.put(`/api/events/${id}`, eventData), 
  archiveEvent: (id) => apiClient.patch(`/api/events/${id}/archive`),
  toggleEventAttendance: (eventId, userId) => 
  apiClient.post(`/api/events/${eventId}/toggle-attendance`, { userId }),

  // Attendance
  getAttendance: () => apiClient.get('/api/attendance'),
  recordAttendance: (checkInData) => apiClient.post('/api/attendance', checkInData),

  // Ministries
  getMinistries: () => apiClient.get('/api/ministries'),
  createMinistry: (ministryData) => apiClient.post('/api/ministries', ministryData),
  updateMinistry: (id, editFormData) => apiClient.patch(`/api/ministries/${id}`, editFormData),
  deleteMinistry: (id) => apiClient.delete(`/api/ministries/${id}`),

  // Prayers
  getPrayers: () => apiClient.get('/api/prayers'),
  submitPrayer: (newEntry) => apiClient.post('/api/prayers', newEntry),
  incrementPraying: (id) => apiClient.patch(`/api/prayers/${id}/pray`),
  markAnswered: (id) => apiClient.patch(`/api/prayers/${id}/answer`),
};

export default api;