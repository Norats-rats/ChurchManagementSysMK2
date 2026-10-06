/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import api from '../../api';
import { useFeedbackModal } from '../../components/shared/feedbackmodal';
import { canManageEvents, canUploadEventImages } from '../../permissions';
import {
  PH_TIMEZONE_LABEL,
  formatPhDateObject,
  getPhDateString,
  getPhTodayDateObject,
  normalizeDateString,
  phWallClockToMillis
} from '../../utils/philippinesTime';
import EventHistoryModal from './eventhistory';

const EVENT_HISTORY_GRACE_MS = 24 * 60 * 60 * 1000;

const getEventEndedAt = (event) => {
  const recordedEnd = event.endedAt ? new Date(event.endedAt) : null;
  if (recordedEnd && !Number.isNaN(recordedEnd.getTime())) return recordedEnd;

  const eventDate = normalizeDateString(event.date);
  if (!eventDate) return null;
  const legacyTimes = String(event.time || '').split('-');
  const startTime = event.timeStart || legacyTimes[0]?.trim() || '00:00';
  const endTime = event.timeEnd || legacyTimes[1]?.trim() || '23:59';
  const startAt = phWallClockToMillis(eventDate, startTime);
  const endAt = phWallClockToMillis(eventDate, endTime);
  return new Date(endAt < startAt ? endAt + EVENT_HISTORY_GRACE_MS : endAt);
};

const isVisibleInEventHistory = (event) => {
  if (event.status === 'archived') return true;
  if (event.status !== 'ended') return false;
  const endedAt = getEventEndedAt(event);
  return endedAt && Date.now() - endedAt.getTime() >= EVENT_HISTORY_GRACE_MS;
};

const formatLocalDateInput = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const EventTab = ({ role, userId, user, searchRequest }) => {
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyPanel, setHistoryPanel] = useState('attendance');
  const [searchFocusedEventId, setSearchFocusedEventId] = useState(null);
  const [showEventHistory, setShowEventHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('all');
  const [historyYear, setHistoryYear] = useState('all');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyView, setHistoryView] = useState('grid');
  const handledSearchRequestRef = useRef(null);
  const searchFocusTimerRef = useRef(null);
  const HISTORY_ITEMS_PER_PAGE = 6;

  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => getPhTodayDateObject());
  const [selectedDate, setSelectedDate] = useState(() => getPhTodayDateObject());

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); 
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('nearest');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [leaderOptions, setLeaderOptions] = useState([]);

  const [formData, setFormData] = useState({
    titleSelection: 'Worship Service',
    reservationName: '',
    category: 'Worship',
    date: getPhDateString(),
    timeStart: '08:00',
    timeEnd: '09:00',
    room: '',
    type: 'Once',
    role: '',
    leadPeople: [],
    status: 'active'
  });

  const canManage = canManageEvents(role);
  const canUploadImages = canUploadEventImages(role);
  const { showFeedback, askConfirmation, FeedbackModal } = useFeedbackModal();

  const today = getPhTodayDateObject();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    fetchEvents();
    fetchLocations();
    if (canManage) fetchLeaderOptions();
    const lifecycleRefresh = setInterval(fetchEvents, 60 * 1000);
    return () => clearInterval(lifecycleRefresh);
  }, [canManage]);

  const fetchLocations = async () => {
    try {
      const response = await api.getLocations();
      setLocations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch event locations:', err);
      setLocations([]);
    }
  };

  const fetchLeaderOptions = async () => {
    try {
      const response = await api.getMembers();
      const members = Array.isArray(response.data) ? response.data : [];
      const ministryLeaders = members.filter(member =>
        member.role === 'Ministry Leader' || member.role === 'Ministry'
      );
      setLeaderOptions(ministryLeaders);
    } catch (err) {
      console.error('Failed to fetch ministry leaders:', err);
      setLeaderOptions([]);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await api.getEvents(); 
      const data = response.data;
      if (Array.isArray(data)) setEvents(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setLoading(false);
    }
  };

  const currentYear = currentCalendarDate.getFullYear();
  const currentMonth = currentCalendarDate.getMonth();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDateSelect = (day) => {
    if (!day) return;
    const newSelected = new Date(currentYear, currentMonth, day);
    setSelectedDate(newSelected);

    setFormData(prev => ({ ...prev, date: formatLocalDateInput(newSelected) }));
  };

  const hasEventsOnDate = (day) => {
    if (!day) return false;
    const checkDate = new Date(currentYear, currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    return events.some(event => {
      if (['ended', 'archived'].includes(event.status)) return false;
      const eventDateText = normalizeDateString(event.date);
      if (!eventDateText) return false;
      const eventDate = new Date(`${eventDateText}T00:00:00`);
      const overnight = event.timeStart && event.timeEnd && event.timeEnd < event.timeStart;
      const nextDate = new Date(eventDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return eventDate.getTime() === checkDate.getTime() ||
        (overnight && nextDate.getTime() === checkDate.getTime());
    });
  };

  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    return events.filter(event => {
      if (['ended', 'archived'].includes(event.status)) return false;
      const eventDateText = normalizeDateString(event.date);
      if (!eventDateText) return false;
      const eDate = new Date(`${eventDateText}T00:00:00`);
      const sameStartDate = eDate.getFullYear() === selectedDate.getFullYear() &&
        eDate.getMonth() === selectedDate.getMonth() &&
        eDate.getDate() === selectedDate.getDate();
      if (sameStartDate) return true;

      const overnight = event.timeStart && event.timeEnd && event.timeEnd < event.timeStart;
      const nextDate = new Date(eDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return overnight &&
        nextDate.getFullYear() === selectedDate.getFullYear() &&
        nextDate.getMonth() === selectedDate.getMonth() &&
        nextDate.getDate() === selectedDate.getDate();
    }).sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
  };

  const handleAIRecommendation = async () => {
    if (!formData.reservationName) {
      showFeedback('Please enter a Booking/Reservation Name first!');
      return;
    }

    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const response = await api.analyzeSchedule({
        userRequest: `Schedule a ${formData.titleSelection} for ${formData.reservationName}`,
        currentEvents: events
      });
      setAiSuggestion(response.data);
    } catch (err) {
      setAiSuggestion({
        suggestion: "Please pick an alternative date, time, and room manually by reviewing the calendar list.",
        reason: `The AI Scheduling Assistant is undergoing brief routine updates. (${err.message})`
      });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiValues = () => {
    if (!aiSuggestion || !aiSuggestion.suggestion) return;

    const dateMatch = aiSuggestion.suggestion.match(/\d{4}-\d{2}-\d{2}/);
    const timeMatch = aiSuggestion.suggestion.match(/\b(0?\d|1\d|2[0-3]):([0-5]\d)\s*(AM|PM)?\b/i);

    const roomKeywords = ["Sanctuary", "Main Hall", "Room A", "Room B", "Fellowship Hall", "Youth Room", "Chapel"];
    const foundRoom = roomKeywords.find(room => 
      aiSuggestion.suggestion.toLowerCase().includes(room.toLowerCase())
    );

    const newDate = dateMatch ? dateMatch[0] : formData.date;
    let suggestedStartTime = formData.timeStart;
    let suggestedEndTime = formData.timeEnd;

    if (timeMatch) {
      let suggestedHour = Number(timeMatch[1]);
      const suggestedMinute = Number(timeMatch[2]);
      const meridiem = timeMatch[3]?.toUpperCase();
      if (meridiem) {
        suggestedHour %= 12;
        if (meridiem === 'PM') suggestedHour += 12;
      }

      const [startHour, startMinute] = formData.timeStart.split(':').map(Number);
      const [endHour, endMinute] = formData.timeEnd.split(':').map(Number);
      const currentDuration = (endHour * 60 + endMinute - startHour * 60 - startMinute + 1440) % 1440 || 60;
      const suggestedStartMinutes = suggestedHour * 60 + suggestedMinute;
      const suggestedEndMinutes = (suggestedStartMinutes + currentDuration) % 1440;
      const formatTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      suggestedStartTime = formatTime(suggestedStartMinutes);
      suggestedEndTime = formatTime(suggestedEndMinutes);
    }

    setFormData(prev => ({
      ...prev,
      date: newDate,
      timeStart: suggestedStartTime,
      timeEnd: suggestedEndTime,
      room: foundRoom ? foundRoom : prev.room
    }));

    if (dateMatch) {
      const [year, month, day] = newDate.split('-').map(Number);
      const aiDateObj = new Date(year, month - 1, day);
      setCurrentCalendarDate(aiDateObj);
      setSelectedDate(aiDateObj);
    }

    setAiSuggestion(null);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();

    const selectedDateObj = new Date(`${normalizeDateString(formData.date) || formData.date}T00:00:00`);
    if (selectedDateObj < today && !editingId) {
      showFeedback('Cannot schedule new events for past dates.');
      return;
    }

    if (formData.timeEnd === formData.timeStart) {
      showFeedback('The event start and end times must be different.');
      return;
    }

    const trimmedReservation = formData.reservationName.trim();
    const trimmedTitle = formData.titleSelection.trim();
    if (!trimmedReservation) {
      showFeedback('Please enter a booking/reservation name.');
      return;
    }

    if (formData.leadPeople.length < 2 || formData.leadPeople.length > 3) {
      showFeedback('Please select between 2 and 3 ministry leaders for this event.');
      return;
    }

    const timeRangesOverlap = (firstRange, secondRange) => {
      const toMinutes = (value) => {
        const [hours, minutes] = value.split(':').map(Number);
        return hours * 60 + minutes;
      };
      const startOne = toMinutes(firstRange.start) + (firstRange.dayOffset * 24 * 60);
      const endOne = toMinutes(firstRange.end) + (firstRange.dayOffset * 24 * 60) + (firstRange.end < firstRange.start ? 24 * 60 : 0);
      const startTwo = toMinutes(secondRange.start) + (secondRange.dayOffset * 24 * 60);
      const endTwo = toMinutes(secondRange.end) + (secondRange.dayOffset * 24 * 60) + (secondRange.end < secondRange.start ? 24 * 60 : 0);
      return startOne < endTwo && startTwo < endOne;
    };

    const dateDifferenceInDays = (firstDate, secondDate) => {
      const first = new Date(`${firstDate}T00:00:00`);
      const second = new Date(`${secondDate}T00:00:00`);
      return Math.round((first - second) / (24 * 60 * 60 * 1000));
    };

    const locationConflict = events.some(event => {
      const eventStart = event.timeStart || '';
      const eventEnd = event.timeEnd || '';
      const dayOffset = dateDifferenceInDays(formData.date, event.date);
      const relevantDay = dayOffset === 0 ||
        (dayOffset === 1 && eventStart && eventEnd && eventEnd < eventStart) ||
        (dayOffset === -1 && formData.timeEnd < formData.timeStart);
      return event._id !== editingId &&
        !['ended', 'archived'].includes(event.status) &&
        relevantDay &&
        event.room?.trim().toLowerCase() === formData.room.trim().toLowerCase() &&
        eventStart && eventEnd &&
        timeRangesOverlap(
          { start: formData.timeStart, end: formData.timeEnd, dayOffset },
          { start: eventStart, end: eventEnd, dayOffset: 0 }
        );
    });

    if (locationConflict) {
      showFeedback(`The ${formData.room} is already booked on ${formData.date} during that time range.`);
      return;
    }

    const combinedTitle = `${trimmedTitle} for ${trimmedReservation}`;
    const duplicateEvent = events.some(ev =>
      normalizeDateString(ev.date) === normalizeDateString(formData.date) &&
      ev.reservationName?.trim().toLowerCase() === trimmedReservation.toLowerCase() &&
      ev.titleSelection?.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
      ev.room?.trim().toLowerCase() === formData.room.trim().toLowerCase() &&
      ((ev.timeStart || ev.time || '00:00') === formData.timeStart || (ev.timeEnd || ev.time || '00:00') === formData.timeEnd) &&
      ev._id !== editingId
    );

    if (duplicateEvent) {
      showFeedback(`This exact event is already scheduled for ${formData.date}. Please choose a different time, room, or event title.`);
      return;
    }

    const submissionData = {
      ...formData,
      reservationName: trimmedReservation,
      title: combinedTitle,
      time: `${formData.timeStart} - ${formData.timeEnd}`,
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      leadPeople: formData.leadPeople,
      role: formData.leadPeople.join(', '),
      status: editingId ? formData.status : 'active'
    };

    try {
      if (editingId) {
        await api.updateEvent(editingId, submissionData);
      } else {
        await api.createEvent(submissionData);
      }
      setEditingId(null);
      setFormOpen(false);
      setAiSuggestion(null);
      setFormData({
        titleSelection: 'Worship Service',
        reservationName: '',
        category: 'Worship',
        date: formData.date,
        timeStart: '08:00',
        timeEnd: '09:00',
        room: '',
        role: '',
        leadPeople: [],
        status: 'active'
      });
      fetchEvents();
      showFeedback(editingId ? 'Event updated successfully.' : 'Event created successfully.');
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Error saving event';
      showFeedback(message);
    }
  };

  const handleToggleAttendance = (eventId, isAttending) => {
    const action = isAttending ? 'cancel your attendance for' : 'register for';
    askConfirmation(`Are you sure you want to ${action} this event?`, async () => {
      try {
        await api.toggleEventAttendance(eventId, userId);
        await fetchEvents();
        showFeedback(isAttending ? 'Your event attendance was canceled.' : 'You are registered for this event.');
      } catch (err) {
        console.error("Attendance toggle failed", err);
        showFeedback(isAttending ? 'Unable to cancel event attendance.' : 'Unable to register for this event.');
      }
    });
  };

  const archiveEvent = async (id) => {
    askConfirmation('End this event now? It will become unavailable immediately and be archived after one month.', async () => {
      try {
        await api.archiveEvent(id);
        fetchEvents();
        showFeedback('Event ended. It will be archived after one month.');
      } catch (err) {
        console.error(err);
        showFeedback('Error archiving event');
      }
    });
  };

  const openHistory = (event, panel) => {
    setHistoryPanel(panel);
    setHistoryTarget(event);
  };

  const renderHistoryActions = (event) => (
    <div className="event-card-actions">
      {canManage && <button type="button" className="event-action-button primary" onClick={() => openHistory(event, 'attendance')}>Attendance</button>}
      {canUploadImages && <button type="button" className="event-action-button" onClick={() => openHistory(event, 'upload')}>Upload photos</button>}
      <button type="button" className="event-action-button" onClick={() => openHistory(event, 'gallery')}>View photos</button>
    </div>
  );

  useEffect(() => {
    const eventId = searchRequest?.eventId;
    const requestId = searchRequest?.requestId;
    if (!eventId || !events.length || handledSearchRequestRef.current === requestId) return;
    const event = events.find(item => String(item._id) === String(eventId));
    if (!event) return;
    handledSearchRequestRef.current = requestId;

    const eventDate = normalizeDateString(event.date);
    if (eventDate) {
      const selected = new Date(`${eventDate}T00:00:00`);
      setSelectedDate(selected);
      setCurrentCalendarDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }

    setSearchFocusedEventId(String(event._id));
    if (['ended', 'archived'].includes(event.status)) {
      const historyIndex = events
        .filter(isVisibleInEventHistory)
        .sort((a, b) => getEventEndedAt(b) - getEventEndedAt(a))
        .findIndex(item => String(item._id) === String(event._id));
      if (historyIndex >= 0) {
        setHistorySearch('');
        setHistoryMonth('all');
        setHistoryYear('all');
        setHistoryStatus('all');
        setShowEventHistory(true);
        setHistoryPage(Math.floor(historyIndex / HISTORY_ITEMS_PER_PAGE) + 1);
        openHistory(event, canManage ? 'attendance' : canUploadImages ? 'upload' : 'gallery');
      }
    }

    window.clearTimeout(searchFocusTimerRef.current);
    searchFocusTimerRef.current = window.setTimeout(() => {
      document.getElementById(`event-card-${event._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setSearchFocusedEventId(null), 2200);
    }, 100);
  }, [searchRequest, events, canManage, canUploadImages]);

  useEffect(() => () => window.clearTimeout(searchFocusTimerRef.current), []);

  const styles = {
    container: { padding: '20px', backgroundColor: '#f7fafc', minHeight: '100vh', display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' },
    
    sidebar: { flex: '0 0 300px', backgroundColor: '#ffffff', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1f2937', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' },
    calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
    calNavBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', padding: '5px 10px' },
    calTitle: { margin: 0, fontSize: '18px', fontWeight: '600', cursor: 'pointer' },
    calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' },
    calDayHeader: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', paddingBottom: '6px' },
    calDayCell: { width: '100%', minHeight: '34px', padding: '6px 0', border: 0, borderRadius: '6px', backgroundColor: 'transparent', color: '#334155', fontSize: '14px', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' },
    eventDot: { display: 'block', height: '4px', width: '4px', backgroundColor: '#10b981', borderRadius: '50%', position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)' },

    mainContent: { flex: '1', minWidth: '300px' },
    headerTitle: { margin: '0 0 5px 0', color: '#2d3748', fontSize: '24px' },
    headerSub: { color: '#718096', margin: '0 0 20px 0', fontSize: '14px' },
    
    formCard: { background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' },
    card: (isArchived) => ({ 
      background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
      display: 'flex', flexDirection: 'column', borderLeft: isArchived ? '4px solid #94a3b8' : '4px solid #15803d',
      opacity: isArchived ? 0.6 : 1, filter: isArchived ? 'grayscale(0.5)' : 'none'
    }),
    cardFrame: { position: 'relative' },
    historyFooterBtn: { width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    badge: (cat, isArchived) => ({
      padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
      backgroundColor: isArchived ? '#e2e8f0' : (cat === 'Worship' ? '#dcfce7' : '#fef3c7'),
      color: isArchived ? '#475569' : (cat === 'Worship' ? '#166534' : '#92400e')
    }),
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '12px', fontSize: '13px', color: '#4a5568' },
    footer: { marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' },
    submitBtn: { padding: '10px 20px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    aiBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1f2937', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    attendBtn: (isAttending) => ({ width: '100%', padding: '10px', backgroundColor: isAttending ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' })
  };

  const parseTimeValue = (value) => {
    if (!value) return 0;
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  };

  const selectedEvents = getEventsForSelectedDate();
  const sortedSelectedEvents = [...selectedEvents].sort((a, b) => {
    const aTime = parseTimeValue(a.timeStart || a.time || '00:00');
    const bTime = parseTimeValue(b.timeStart || b.time || '00:00');
    return sortOrder === 'furthest' ? bTime - aTime : aTime - bTime;
  });
  const historyEvents = events
    .filter(isVisibleInEventHistory)
    .sort((a, b) => getEventEndedAt(b) - getEventEndedAt(a));
  const historyYears = [...new Set(historyEvents
    .map(event => normalizeDateString(event.date).slice(0, 4))
    .filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredHistoryEvents = historyEvents.filter(event => {
    const eventDate = normalizeDateString(event.date);
    const searchFields = [event.title, event.reservationName, event.room, event.category, event.role,
      ...(Array.isArray(event.leadPeople) ? event.leadPeople : [])];
    return (historyStatus === 'all' || event.status === historyStatus) &&
      (historyMonth === 'all' || eventDate.slice(5, 7) === historyMonth) &&
      (historyYear === 'all' || eventDate.slice(0, 4) === historyYear) &&
      (!normalizedHistorySearch || searchFields.some(value => String(value || '').toLowerCase().includes(normalizedHistorySearch)));
  });
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryEvents.length / HISTORY_ITEMS_PER_PAGE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedHistoryEvents = filteredHistoryEvents.slice(
    (safeHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE,
    safeHistoryPage * HISTORY_ITEMS_PER_PAGE
  );
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="event-tab" style={styles.container}>
      
      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.calHeader}>
          <h3 style={styles.calTitle} onClick={() => setMonthPickerOpen(prev => !prev)} title="Click to change month and year">
            {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={() => {
              const phToday = getPhTodayDateObject();
              setCurrentCalendarDate(phToday);
              setSelectedDate(phToday);
              setFormData(prev => ({ ...prev, date: getPhDateString() }));
            }}
            style={{ ...styles.calNavBtn, border: '1px solid #3f3f46', borderRadius: '6px' }}
            title={`Jump to today (${PH_TIMEZONE_LABEL})`}
          >
            Today
          </button>
        </div>

        {monthPickerOpen && (
          <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={currentMonth}
              onChange={(e) => setCurrentCalendarDate(new Date(currentYear, Number(e.target.value), 1))}
              style={styles.input}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1990"
              max="2100"
              value={currentYear}
              onChange={(e) => setCurrentCalendarDate(new Date(Number(e.target.value), currentMonth, 1))}
              style={{ ...styles.input, width: '120px' }}
            />
            <button type="button" onClick={() => setMonthPickerOpen(false)} style={{ ...styles.calNavBtn, border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', color: '#1f2937' }}>
              Done
            </button>
          </div>
        )}

        <div style={styles.calGrid}>
          {daysOfWeek.map((day, idx) => (
            <div key={`header-${idx}`} style={styles.calDayHeader}>{day}</div>
          ))}
          
          {calendarDays.map((day, idx) => {
            const isSelected = day && 
              selectedDate.getDate() === day && 
              selectedDate.getMonth() === currentMonth && 
              selectedDate.getFullYear() === currentYear;
            
            const hasEvent = hasEventsOnDate(day);

            if (!day) return <span key={`day-${idx}`} aria-hidden="true" />;
            return (
              <button
                type="button"
                key={`day-${idx}`}
                className={`event-calendar-day${isSelected ? ' selected' : ''}${hasEvent ? ' has-event' : ''}`}
                aria-label={`Select ${monthNames[currentMonth]} ${day}, ${currentYear}`}
                aria-pressed={Boolean(isSelected)}
                style={styles.calDayCell}
                onClick={() => handleDateSelect(day)}
              >
                {day}
                {hasEvent && <span className="event-calendar-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <section className="event-selected-day" aria-label="Selected date summary">
          <div className="event-selected-day-heading">
            <strong>{formatPhDateObject(selectedDate)}</strong>
            <span>{selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}</span>
          </div>
          {sortedSelectedEvents.length ? sortedSelectedEvents.slice(0, 2).map(event => (
            <div className="event-selected-day-item" key={event._id}>
              <span>{event.title || event.titleSelection || event.reservationName || 'Church event'}</span>
              <small>{event.time || `${event.timeStart || 'Time TBD'} - ${event.timeEnd || ''}`}</small>
            </div>
          )) : <p className="event-selected-day-empty">No events scheduled.</p>}
          {selectedEvents.length > 2 && <small className="event-selected-day-more">+{selectedEvents.length - 2} more in the schedule</small>}
        </section>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div style={styles.mainContent}>
        <h2 style={styles.headerTitle}>{showEventHistory ? 'Event History' : 'Daily Schedule'}</h2>
        <p style={styles.headerSub}>
          {showEventHistory
            ? `${historyEvents.length} ended or archived events`
            : `Events for ${formatPhDateObject(selectedDate)} • ${PH_TIMEZONE_LABEL}`}
        </p>

        <div role="group" aria-label="Event display" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-pressed={!showEventHistory}
            onClick={() => { setShowEventHistory(false); setHistoryPage(1); }}
            style={{ ...styles.historyFooterBtn, width: 'auto', background: !showEventHistory ? '#15803d' : '#fff', color: !showEventHistory ? '#fff' : '#334155', borderColor: !showEventHistory ? '#15803d' : '#cbd5e1' }}
          >
            Daily Schedule
          </button>
          <button
            type="button"
            aria-pressed={showEventHistory}
            onClick={() => { setShowEventHistory(true); setHistoryPage(1); }}
            style={{ ...styles.historyFooterBtn, width: 'auto', background: showEventHistory ? '#15803d' : '#fff', color: showEventHistory ? '#fff' : '#334155', borderColor: showEventHistory ? '#15803d' : '#cbd5e1' }}
          >
            Event History ({historyEvents.length})
          </button>
        </div>

        {!showEventHistory && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600' }}>Sort Events:</span>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ ...styles.input, width: '170px' }}>
              <option value="nearest">Nearest First</option>
              <option value="furthest">Furthest First</option>
            </select>
          </div>
        )}

        {canManage && !showEventHistory && !formOpen && (
          <button type="button" className="event-primary-action" onClick={() => {
            setEditingId(null);
            setFormData({
              titleSelection: 'Worship Service',
              reservationName: '',
              category: 'Worship',
              date: formatLocalDateInput(selectedDate),
              timeStart: '08:00',
              timeEnd: '09:00',
              room: '',
              role: '',
              leadPeople: [],
              status: 'active'
            });
            setFormOpen(true);
          }}>
            <span aria-hidden="true">+</span> Schedule event
          </button>
        )}

        {canManage && !showEventHistory && formOpen && (
          <div className="event-scheduler-card" style={styles.formCard}>
            <div className="event-form-header">
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a202c' }}>
                {editingId ? "Edit Event" : "Schedule New Event"}
              </h3>
              <button type="button" className="event-form-close" onClick={() => setFormOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleCreateOrUpdate}>
              <div className="event-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <select style={styles.input} value={formData.titleSelection} onChange={e => setFormData({...formData, titleSelection: e.target.value})}>
                  <option value="Jail Preaching">Jail Preaching</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Dedication">Dedication</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Healing Crusade">Healing Crusade</option>
                  <option value="Feeding Program">Feeding Program</option>
                  <option value="Baptism">Baptism</option>
                  <option value="Bible Study">Bible Study</option>
                  <option value="Prayer Meeting">Prayer Meeting</option>
                  <option value="Youth Camp">Youth Camp</option>
                  <option value="Worship Service">Worship Service</option>
                </select>

                <input style={styles.input} placeholder="Booking/Reservation Name" value={formData.reservationName} onChange={e => setFormData({...formData, reservationName: e.target.value})} required />
                <input type="date" style={styles.input} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                <input type="time" style={styles.input} value={formData.timeStart} onChange={e => setFormData({...formData, timeStart: e.target.value})} required />
                <input type="time" style={styles.input} value={formData.timeEnd} onChange={e => setFormData({...formData, timeEnd: e.target.value})} required />
                <select style={styles.input} value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} required>
                  <option value="">{locations.length ? 'Select location' : 'No locations available'}</option>
                  {locations.map(location => (
                    <option key={location._id} value={location.name}>{location.name}</option>
                  ))}
                </select>
                <div className="event-leader-selector" style={{ gridColumn: '1 / -1', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                      Lead persons (select 2-3 ministry leaders)
                    </div>
                    {formData.leadPeople.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, leadPeople: [] }))}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#475569', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    {leaderOptions.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#64748b' }}>No ministry leaders available yet.</div>
                    ) : (
                      leaderOptions.map(leader => {
                        const fullName = `${leader.firstName || ''} ${leader.lastName || ''}`.trim();
                        const checked = formData.leadPeople.includes(fullName);
                        return (
                          <label className="event-leader-option" key={leader._id || fullName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const selected = prev.leadPeople || [];
                                  if (e.target.checked) {
                                    if (selected.length >= 3) {
                                      showFeedback('You can select up to 3 ministry leaders for an event.');
                                      return prev;
                                    }
                                    return { ...prev, leadPeople: [...selected, fullName] };
                                  }
                                  return { ...prev, leadPeople: selected.filter(name => name !== fullName) };
                                });
                              }}
                            />
                            <span>{fullName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="event-form-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" style={styles.submitBtn}>{editingId ? "Update Event" : "Create Event"}</button>
                {!editingId && (
                  <button type="button" onClick={handleAIRecommendation} disabled={aiLoading} style={styles.aiBtn}>
                    {aiLoading ? "Thinking..." : "✨ AI Suggest"}
                  </button>
                )}
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormOpen(false); }} style={{...styles.submitBtn, backgroundColor: '#64748b'}}>Cancel</button>}
              </div>
            </form>

            {aiSuggestion && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>💡 AI Recommendation:</div>
                <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
                  <strong>Plan:</strong> {aiSuggestion.suggestion} <br />
                  <strong>Reasoning:</strong> {aiSuggestion.reason}
                </p>
                <button type="button" onClick={applyAiValues} style={{ padding: '6px 12px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Apply to Form
                </button>
              </div>
            )}
          </div>
        )}

        {showEventHistory ? (
          loading ? (
            <p style={{ fontSize: '14px', color: '#718096' }}>Loading event history...</p>
          ) : historyEvents.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>No events have entered history yet.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                <input
                  type="search"
                  aria-label="Search event history"
                  placeholder="Search event history..."
                  value={historySearch}
                  onChange={event => { setHistorySearch(event.target.value); setHistoryPage(1); }}
                  style={{ ...styles.input, flex: '1 1 220px' }}
                />
                <select aria-label="Filter by month" value={historyMonth} onChange={event => { setHistoryMonth(event.target.value); setHistoryPage(1); }} style={{ ...styles.input, flex: '1 1 140px' }}>
                  <option value="all">All months</option>
                  {monthNames.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
                </select>
                <select aria-label="Filter by year" value={historyYear} onChange={event => { setHistoryYear(event.target.value); setHistoryPage(1); }} style={{ ...styles.input, flex: '1 1 100px' }}>
                  <option value="all">All years</option>
                  {historyYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <select aria-label="Filter by event status" value={historyStatus} onChange={event => { setHistoryStatus(event.target.value); setHistoryPage(1); }} style={{ ...styles.input, flex: '1 1 130px' }}>
                  <option value="all">Ended and archived</option>
                  <option value="ended">Ended</option>
                  <option value="archived">Archived</option>
                </select>
                <div role="group" aria-label="History layout" style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" aria-pressed={historyView === 'grid'} onClick={() => setHistoryView('grid')} style={{ ...styles.historyFooterBtn, width: 'auto', background: historyView === 'grid' ? '#15803d' : '#fff', color: historyView === 'grid' ? '#fff' : '#334155', borderColor: historyView === 'grid' ? '#15803d' : '#cbd5e1' }}>Grid</button>
                  <button type="button" aria-pressed={historyView === 'list'} onClick={() => setHistoryView('list')} style={{ ...styles.historyFooterBtn, width: 'auto', background: historyView === 'list' ? '#15803d' : '#fff', color: historyView === 'list' ? '#fff' : '#334155', borderColor: historyView === 'list' ? '#15803d' : '#cbd5e1' }}>List</button>
                </div>
              </div>

              {filteredHistoryEvents.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'white', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>No events match these filters.</p>
                </div>
              ) : historyView === 'grid' ? (
                <div className="event-card-grid" style={{ ...styles.grid, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
                  {paginatedHistoryEvents.map(event => {
                    const isArchived = event.status === 'archived';
                    return (
                      <div
                        key={event._id}
                        id={`event-card-${event._id}`}
                        style={styles.cardFrame}
                      >
                        <article className="event-card" style={{ ...styles.card(true), opacity: 1, filter: 'none', outline: searchFocusedEventId === String(event._id) ? '3px solid #16a34a' : 'none' }}>
                          <span style={{ ...styles.badge(event.category, true), alignSelf: 'flex-start' }}>{isArchived ? 'Archived' : 'Event Ended'}</span>
                          <h3 className="event-card-title" style={{ margin: '10px 0 4px', fontSize: '16px', color: '#1a202c', overflowWrap: 'anywhere' }}>{event.title}</h3>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{formatPhDateObject(new Date(`${normalizeDateString(event.date)}T00:00:00`))}</p>
                          <div className="event-info-grid" style={styles.infoGrid}>
                            <span>Time: {event.time || `${event.timeStart || 'N/A'} - ${event.timeEnd || 'N/A'}`}</span>
                            <span>Location: {event.room || 'No location'}</span>
                            <span>Attending: {event.attendees?.length || 0}</span>
                          </div>
                          <div style={styles.footer}>
                            {renderHistoryActions(event)}
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '11px 12px' }}>Event</th>
                        <th style={{ padding: '11px 12px' }}>Date</th>
                        <th style={{ padding: '11px 12px' }}>Status</th>
                        <th style={{ padding: '11px 12px' }}>Location</th>
                        <th style={{ padding: '11px 12px' }}>Attending</th>
                        <th style={{ padding: '11px 12px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistoryEvents.map(event => (
                        <tr key={event._id} id={`event-card-${event._id}`} style={{ borderTop: '1px solid #e2e8f0', outline: searchFocusedEventId === String(event._id) ? '2px solid #16a34a' : 'none' }}>
                          <td style={{ padding: '11px 12px', color: '#1e293b', fontWeight: 600 }}>{event.title}</td>
                          <td style={{ padding: '11px 12px', color: '#475569', whiteSpace: 'nowrap' }}>{formatPhDateObject(new Date(`${normalizeDateString(event.date)}T00:00:00`))}</td>
                          <td style={{ padding: '11px 12px' }}>{event.status === 'archived' ? 'Archived' : 'Ended'}</td>
                          <td style={{ padding: '11px 12px', color: '#475569' }}>{event.room || 'No location'}</td>
                          <td style={{ padding: '11px 12px', color: '#475569' }}>{event.attendees?.length || 0}</td>
                          <td style={{ padding: '11px 12px' }}>
                            <button type="button" onClick={() => openHistory(event, canManage ? 'attendance' : canUploadImages ? 'upload' : 'gallery')} style={{ ...styles.historyFooterBtn, width: 'auto', whiteSpace: 'nowrap' }}>View history</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {historyTotalPages > 1 && (
                <nav aria-label="Event history pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                    disabled={safeHistoryPage === 1}
                    style={{ ...styles.historyFooterBtn, width: 'auto', minWidth: '88px', opacity: safeHistoryPage === 1 ? 0.55 : 1 }}
                  >
                    Previous
                  </button>
                  <span aria-live="polite" style={{ color: '#475569', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {safeHistoryPage} / {historyTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryPage(page => Math.min(historyTotalPages, page + 1))}
                    disabled={safeHistoryPage === historyTotalPages}
                    style={{ ...styles.historyFooterBtn, width: 'auto', minWidth: '88px', opacity: safeHistoryPage === historyTotalPages ? 0.55 : 1 }}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )
        ) : loading ? (
          <p style={{ fontSize: '14px', color: '#718096' }}>Loading activities...</p>
        ) : sortedSelectedEvents.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>No events scheduled for this day.</p>
          </div>
        ) : (
          <div className="event-card-grid" style={styles.grid}>
            {sortedSelectedEvents.map((event) => {
              const isAttending = event.attendees?.includes(userId);
              
              const isArchived = event.status === 'archived';
              const isEnded = event.status === 'ended';
              const isUnavailable = isArchived || isEnded;

              return (
                <div
                  key={event._id}
                  id={`event-card-${event._id}`}
                  style={styles.cardFrame}
                >
                  <div className="event-card" style={{ ...styles.card(isUnavailable), ...(searchFocusedEventId === String(event._id) ? { outline: '3px solid #16a34a', outlineOffset: '3px' } : {}) }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={styles.badge(event.category, isUnavailable)}>
                        {isArchived ? 'Archived' : isEnded ? 'Event Ended' : event.category}
                      </span>
                    </div>
                    <h4 className="event-card-title" style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1a202c' }}>{event.title}</h4>
                    <p className="event-card-lead" style={{ fontSize: '12px', color: '#718096', margin: 0 }}>
                      Lead: {Array.isArray(event.leadPeople) && event.leadPeople.length > 0 ? event.leadPeople.join(', ') : (event.role || 'N/A')}
                    </p>

                    <div className="event-info-grid" style={styles.infoGrid}>
                      <span>🕒 {event.time || `${event.timeStart || 'N/A'} - ${event.timeEnd || 'N/A'}`}</span>
                      <span>📍 {event.room || 'No location'}</span>
                      <span style={{ color: '#15803d', fontWeight: '600' }}>👥 {event.attendees?.length || 0} Attending</span>
                    </div>
                  </div>

                  <div style={styles.footer}>
                    {isUnavailable ? (
                      renderHistoryActions(event)
                    ) : (
                      canManage ? (
                        <>
                          <button style={{ border: 'none', background: '#f1f9f8', color:'#047715' , padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} onClick={() => {
                          setEditingId(event._id);
                          setFormData({
                            ...event,
                            timeStart: event.timeStart || (event.time ? event.time.split('-')[0]?.trim() : '08:00'),
                            timeEnd: event.timeEnd || (event.time ? event.time.split('-')[1]?.trim() : '09:00'),
                            leadPeople: Array.isArray(event.leadPeople) ? event.leadPeople : (event.role ? [event.role] : [])
                          });
                          setFormOpen(true);
                        }}>Edit</button>
                          <button style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} onClick={() => archiveEvent(event._id)}>End Event</button>
                        </>
                      ) : (
                        <button style={styles.attendBtn(isAttending)} onClick={() => handleToggleAttendance(event._id, isAttending)}>
                          {isAttending ? '✕ Cancel' : '✓ Attend'}
                        </button>
                      )
                    )}
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {historyTarget && (
        <EventHistoryModal
          event={historyTarget}
          userId={userId}
          role={role}
          userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || ''}
          initialPanel={historyPanel}
          onClose={() => setHistoryTarget(null)}
        />
      )}
      <FeedbackModal />
    </div>
  );
};

export default EventTab;