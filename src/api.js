import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
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
  deleteEvent: (id) => apiClient.delete(`/api/events/${id}`),
  toggleEventAttendance: (eventId, userId) => 
    apiClient.post(`/api/events/${eventId}/toggle-attendance`, { userId }),

  // Attendance
  getAttendance: () => apiClient.get('/api/attendance'),
  recordAttendance: (checkInData) => apiClient.post('/api/attendance', checkInData),

  // Finances
  getFinances: () => apiClient.get('/api/finances'),
  addFinanceRecord: (transactionData) => apiClient.post('/api/finances', transactionData),
  createCheckoutSession: (data) => apiClient.post('/api/paymongo/create-session', data),

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