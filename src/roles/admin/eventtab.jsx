import { useEffect, useState } from 'react';
import api from '../../api';
import { canManageEvents } from '../../permissions';

const EVENT_LOCATIONS = [
  'Polytechnic University of the Philippines Taguig Branch Chapel Area',
  'Polytechnic University of the Philippines Taguig Branch Gymnasium',
  'Taguig City University Auditorium',
  'FBCFI Taguig Central Bicutan Pastoral House',
  'FBCFI Pinagsama Taguig Pastoral House',
  'FBCFI Cubao',
  'Carlos P. Garcia High School Cubao',
  'FBCFI Caloocan',
  'FBCFI Montalban Rizal',
  'FBCFI Cay Pombo, Santa Maria, Bulacan',
  'FBCFI Bagong Silangan, Quezon City',
  'FBCFI Pampanga',
  'FBCFI Iba, Zambales',
  'FBCFI Subic',
  'FBCFI Dapla',
  'FBCFI Acoje',
  'FBCFI SAN PEDRO Church',
  'Pacita Astrodome',
  'FBCFI TAGAPO STA ROSA',
  'Santa Rosa City Auditorium',
  'FBCFI Calamba Laguna',
  'La Chassah Felisa Calamba Laguna',
  'FBCFI Tanauan City Batangas',
  'Gymnasium 1 Tanauan City Batangas',
  'FBCFI Candelaria Quezon',
  'FBCFI Caluag Quezon'
];

const EventTab = ({ role, userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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
    date: new Date().toISOString().split('T')[0],
    timeStart: '08:00',
    timeEnd: '09:00',
    room: '',
    type: 'Once',
    role: '',
    leadPeople: [],
    status: 'active'
  });

  const canManage = canManageEvents(role);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    fetchEvents();
    fetchLeaderOptions();
  }, []);

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
    
    const offset = newSelected.getTimezoneOffset();
    const localDate = new Date(newSelected.getTime() - (offset*60*1000)).toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: localDate }));
  };

  const hasEventsOnDate = (day) => {
    if (!day) return false;
    const checkDate = new Date(currentYear, currentMonth, day).toDateString();
    return events.some(e => new Date(e.date).toDateString() === checkDate && e.status !== 'archived');
  };

  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const eDate = new Date(event.date);
      return eDate.getFullYear() === selectedDate.getFullYear() &&
             eDate.getMonth() === selectedDate.getMonth() &&
             eDate.getDate() === selectedDate.getDate();
    }).sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
  };

  const handleAIRecommendation = async () => {
    if (!formData.reservationName) {
      alert('Please enter a Booking/Reservation Name first!');
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
    const timeMatch = aiSuggestion.suggestion.match(/(0\d|1[0-2]):[0-5]\d\s?(AM|PM)/i);

    const roomKeywords = ["Sanctuary", "Main Hall", "Room A", "Room B", "Fellowship Hall", "Youth Room", "Chapel"];
    const foundRoom = roomKeywords.find(room => 
      aiSuggestion.suggestion.toLowerCase().includes(room.toLowerCase())
    );

    const newDate = dateMatch ? dateMatch[0] : formData.date;
    
    setFormData(prev => ({
      ...prev,
      date: newDate,
      time: timeMatch ? timeMatch[0].toUpperCase() : prev.time,
      room: foundRoom ? foundRoom : prev.room
    }));

    if (dateMatch) {
      const aiDateObj = new Date(newDate);
      setCurrentCalendarDate(aiDateObj);
      setSelectedDate(aiDateObj);
    }

    setAiSuggestion(null);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();

    const selectedDateObj = new Date(formData.date + 'T00:00:00');
    if (selectedDateObj < today && !editingId) {
      alert('Cannot schedule new events for past dates.');
      return;
    }

    const trimmedReservation = formData.reservationName.trim();
    const trimmedTitle = formData.titleSelection.trim();
    if (!trimmedReservation) {
      alert('Please enter a booking/reservation name.');
      return;
    }

    if (formData.leadPeople.length < 2 || formData.leadPeople.length > 3) {
      alert('Please select between 2 and 3 ministry leaders for this event.');
      return;
    }

    const combinedTitle = `${trimmedTitle} for ${trimmedReservation}`;
    const duplicateEvent = events.some(ev =>
      ev.date === formData.date &&
      ev.reservationName?.trim().toLowerCase() === trimmedReservation.toLowerCase() &&
      ev.titleSelection?.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
      ev.room?.trim().toLowerCase() === formData.room.trim().toLowerCase() &&
      ((ev.timeStart || ev.time || '00:00') === formData.timeStart || (ev.timeEnd || ev.time || '00:00') === formData.timeEnd) &&
      ev._id !== editingId
    );

    if (duplicateEvent) {
      alert(`This exact event is already scheduled for ${formData.date}. Please choose a different time, room, or event title.`);
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
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Error saving event';
      alert(message);
    }
  };

  const handleToggleAttendance = async (eventId) => {
    try {
      await api.toggleEventAttendance(eventId, userId);
      fetchEvents();
    } catch (err) {
      console.error("Attendance toggle failed", err);
    }
  };

  const archiveEvent = async (id) => {
    if (!window.confirm("Archive this event? It will no longer be editable.")) return;
    try {
      await api.archiveEvent(id); 
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert("Error archiving event");
    }
  };

  const styles = {
    container: { padding: '20px', backgroundColor: '#f7fafc', minHeight: '100vh', display: 'flex', gap: '25px', alignItems: 'flex-start', flexWrap: 'wrap' },
    
    sidebar: { flex: '0 0 300px', backgroundColor: '#18181b', padding: '15px', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
    calNavBtn: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '16px', padding: '5px 10px' },
    calTitle: { margin: 0, fontSize: '18px', fontWeight: '600', cursor: 'pointer' },
    calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' },
    calDayHeader: { fontSize: '12px', fontWeight: 'bold', color: '#a1a1aa', paddingBottom: '6px' },
    calDayCell: (day, isSelected) => ({
      padding: '6px 0',
      cursor: day ? 'pointer' : 'default',
      borderRadius: '6px',
      backgroundColor: isSelected ? '#4f46e5' : 'transparent',
      color: isSelected ? 'white' : (day ? '#f4f4f5' : 'transparent'),
      fontSize: '14px',
      position: 'relative',
      transition: 'background-color 0.2s',
      ':hover': { backgroundColor: day && !isSelected ? '#27272a' : '' }
    }),
    eventDot: { height: '4px', width: '4px', backgroundColor: '#10b981', borderRadius: '50%', position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)' },

    mainContent: { flex: '1', minWidth: '300px' },
    headerTitle: { margin: '0 0 5px 0', color: '#2d3748', fontSize: '24px' },
    headerSub: { color: '#718096', margin: '0 0 20px 0', fontSize: '14px' },
    
    formCard: { background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' },
    card: (isArchived) => ({ 
      background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
      display: 'flex', flexDirection: 'column', borderLeft: isArchived ? '4px solid #94a3b8' : '4px solid #4f46e5',
      opacity: isArchived ? 0.6 : 1, filter: isArchived ? 'grayscale(0.5)' : 'none'
    }),
    badge: (cat, isArchived) => ({
      padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
      backgroundColor: isArchived ? '#e2e8f0' : (cat === 'Worship' ? '#e0e7ff' : '#fef3c7'),
      color: isArchived ? '#475569' : (cat === 'Worship' ? '#4338ca' : '#92400e')
    }),
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '12px', fontSize: '13px', color: '#4a5568' },
    footer: { marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' },
    submitBtn: { padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    aiBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
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
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={styles.container}>
      
      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.calHeader}>
          <h3 style={styles.calTitle} onClick={() => setMonthPickerOpen(prev => !prev)} title="Click to change month and year">
            {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
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

            return (
              <div 
                key={`day-${idx}`} 
                style={{
                  ...styles.calDayCell(day, isSelected),
                  ...(day && !isSelected ? { ':hover': { backgroundColor: '#27272a' } } : {})
                }}
                onClick={() => handleDateSelect(day)}
              >
                {day || ''}
                {hasEvent && <div style={styles.eventDot} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div style={styles.mainContent}>
        <h2 style={styles.headerTitle}>Daily Schedule</h2>
        <p style={styles.headerSub}>
          Events for {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '600' }}>Sort Events:</span>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ ...styles.input, width: '170px' }}>
            <option value="nearest">Nearest First</option>
            <option value="furthest">Furthest First</option>
          </select>
        </div>

        {canManage && (
          <div style={styles.formCard}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1a202c' }}>
              {editingId ? "Edit Event" : "Schedule New Event"}
            </h3>
            <form onSubmit={handleCreateOrUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
                  <option value="">Select location</option>
                  {EVENT_LOCATIONS.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
                <div style={{ gridColumn: '1 / -1', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
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
                          <label key={leader._id || fullName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const selected = prev.leadPeople || [];
                                  if (e.target.checked) {
                                    if (selected.length >= 3) {
                                      alert('You can select up to 3 ministry leaders for an event.');
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" style={styles.submitBtn}>{editingId ? "Update Event" : "Create Event"}</button>
                {!editingId && (
                  <button type="button" onClick={handleAIRecommendation} disabled={aiLoading} style={styles.aiBtn}>
                    {aiLoading ? "Thinking..." : "✨ AI Suggest"}
                  </button>
                )}
                {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...styles.submitBtn, backgroundColor: '#a0aec0'}}>Cancel</button>}
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

        {loading ? (
          <p style={{ fontSize: '14px', color: '#718096' }}>Loading activities...</p>
        ) : sortedSelectedEvents.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>No events scheduled for this day.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {sortedSelectedEvents.map((event) => {
              const isAttending = event.attendees?.includes(userId);
              
              const eventDateObj = new Date(event.date + 'T00:00:00');
              const isPastEvent = eventDateObj < today;
              const isArchived = event.status === 'archived' || isPastEvent;
              
              return (
                <div key={event._id} style={styles.card(isArchived)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={styles.badge(event.category, isArchived)}>
                        {isArchived ? "Archived" : event.category}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1a202c' }}>{event.title}</h4>
                    <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>
                      Lead: {Array.isArray(event.leadPeople) && event.leadPeople.length > 0 ? event.leadPeople.join(', ') : (event.role || 'N/A')}
                    </p>

                    <div style={styles.infoGrid}>
                      <span>🕒 {event.time || `${event.timeStart || 'N/A'} - ${event.timeEnd || 'N/A'}`}</span>
                      <span>📍 {event.room || 'No location'}</span>
                      <span style={{ color: '#4f46e5', fontWeight: '600' }}>👥 {event.attendees?.length || 0} Attending</span>
                    </div>
                  </div>

                  <div style={styles.footer}>
                    {isArchived ? (
                       <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Archived Record</span>
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
                        }}>Edit</button>
                          <button style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} onClick={() => archiveEvent(event._id)}>Archive</button>
                        </>
                      ) : (
                        <button style={styles.attendBtn(isAttending)} onClick={() => handleToggleAttendance(event._id)}>
                          {isAttending ? '✕ Cancel' : '✓ Attend'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTab;