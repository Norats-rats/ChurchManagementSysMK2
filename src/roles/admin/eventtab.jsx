import { useEffect, useState } from 'react';
import api from '../../api';

const EventTab = ({ role, userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [sortOrder, setSortOrder] = useState('nearest'); // 'nearest' or 'furthest'
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [formData, setFormData] = useState({
    titleSelection: 'Worship Service', 
    reservationName: '',              
    category: 'Worship', 
    date: '', 
    time: '08:00 AM', 
    room: '',                         
    expected: 0, 
    type: 'Once', 
    role: ''
  });

  const canManage = role === 'Admin' || role === 'Ministry Leader';

  useEffect(() => {
    fetchEvents();
  }, []);

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

  // Helper to sort and group events
  const getSortedEvents = () => {
    return [...events].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return sortOrder === 'nearest' ? dateA - dateB : dateB - dateA;
    });
  };

  const groupEventsByMonth = (sortedEvents) => {
    const groups = {};
    sortedEvents.forEach(event => {
      const month = new Date(event.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(event);
    });
    return groups;
  };

  const handleAiSuggest = async () => {
    if (!formData.reservationName) {
      alert("Please enter a Booking/Reservation Name first!");
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.analyzeSchedule({
        userRequest: `Schedule a ${formData.titleSelection} for ${formData.reservationName}`,
        currentEvents: events 
      });
      setAiSuggestion(response.data);
    } catch (err) {
      alert("AI Assistant unavailable.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const combinedTitle = `${formData.titleSelection} for ${formData.reservationName}`;
    const submissionData = { ...formData, title: combinedTitle };

    try {
      if (editingId) {
        await api.updateEvent(editingId, submissionData); 
      } else {
        await api.createEvent(submissionData); 
      }
      setEditingId(null);
      setAiSuggestion(null);
      setFormData({ 
        titleSelection: 'Worship Service', reservationName: '', 
        category: 'Worship', date: '', time: '08:00 AM', 
        room: '', expected: 0, type: 'Once', role: '' 
      });
      fetchEvents();
    } catch (err) {
      alert("Error saving event");
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

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await api.deleteEvent(id); 
      fetchEvents();
    } catch (err) {
      alert("Error deleting event");
    }
  };

  const styles = {
    container: { padding: '20px', backgroundColor: '#f7fafc', minHeight: '100vh' },
    filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    monthHeader: { color: '#4a5568', fontSize: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: '30px', marginBottom: '15px' },
    formCard: { background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '5px solid #6366f1' },
    badge: (cat) => ({
      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '10px',
      backgroundColor: cat === 'Worship' ? '#e0e7ff' : '#fef3c7',
      color: cat === 'Worship' ? '#4338ca' : '#92400e'
    }),
    dateBox: { textAlign: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', minWidth: '60px' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '15px', fontSize: '13px', color: '#4a5568' },
    footer: { marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #edf2f7', display: 'flex', gap: '10px' },
    submitBtn: { padding: '12px 24px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    select: { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' },
    attendBtn: (isAttending) => ({ 
      width: '100%', padding: '10px', backgroundColor: isAttending ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' 
    }),
  };

  const groupedEvents = groupEventsByMonth(getSortedEvents());

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748' }}>Church Calendar</h2>
          <p style={{ color: '#718096', margin: 0 }}>{events.length} Upcoming Events</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#4a5568' }}>Sort by:</span>
          <select 
            style={styles.select} 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="nearest">Nearest Date</option>
            <option value="furthest">Furthest Date</option>
          </select>
        </div>
      </div>

      {canManage && (
        <div style={styles.formCard}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Event" : "Schedule New Event"}</h3>
          <form onSubmit={handleCreateOrUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <select 
                style={styles.select} 
                value={formData.titleSelection} 
                onChange={e => setFormData({...formData, titleSelection: e.target.value})}
              >
                <option value="Worship Service">Worship Service</option>
                <option value="Bible Study">Bible Study</option>
                <option value="Youth Camp">Youth Camp</option>
                <option value="Wedding">Wedding</option>
                <option value="Baptism">Baptism</option>
                {/* ... other options */}
              </select>

              <input 
                style={styles.select} 
                placeholder="Reservation Name" 
                value={formData.reservationName} 
                onChange={e => setFormData({...formData, reservationName: e.target.value})} 
                required 
              />
              
              <input type="date" style={styles.select} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              <input type="time" style={styles.select} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
              <input style={styles.select} placeholder="Location" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" style={styles.submitBtn}>{editingId ? "Update" : "Create"}</button>
              {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...styles.submitBtn, backgroundColor: '#a0aec0'}}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading your calendar...</p>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px' }}>
          <p style={{ color: '#718096' }}>No events found for this selection.</p>
        </div>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month}>
            <h3 style={styles.monthHeader}>{month}</h3>
            <div style={styles.grid}>
              {monthEvents.map((event) => {
                const isAttending = event.attendees?.includes(userId);
                const eventDate = new Date(event.date);
                
                return (
                  <div key={event._id} style={styles.card}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={styles.dateBox}>
                        <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 'bold' }}>
                          {eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a202c' }}>
                          {eventDate.getDate()}
                        </div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={styles.badge(event.category)}>{event.category}</span>
                        </div>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1a202c' }}>{event.title}</h4>
                        
                        <div style={styles.infoGrid}>
                          <span>🕒 {event.time}</span>
                          <span>📍 {event.room || "Main Hall"}</span>
                          <span style={{ color: '#6366f1', fontWeight: '600' }}>👥 {event.attendees?.length || 0} Attending</span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.footer}>
                      {canManage ? (
                        <>
                          <button style={{ border: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => { setEditingId(event._id); setFormData(event); }}>Edit</button>
                          <button style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => deleteEvent(event._id)}>Delete</button>
                        </>
                      ) : (
                        <button 
                          style={styles.attendBtn(isAttending)} 
                          onClick={() => handleToggleAttendance(event._id)}
                        >
                          {isAttending ? '✕ Cancel' : '✓ Attend'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default EventTab;