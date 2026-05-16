import { useEffect, useState } from 'react';
import api from '../../api';

const EventTab = ({ role, userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [sortOrder, setSortOrder] = useState('nearest'); 
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // Will hold { suggestion: "...", reason: "..." }

  const [formData, setFormData] = useState({
    titleSelection: 'Worship Service', 
    reservationName: '',              
    category: 'Worship', 
    date: '', 
    time: '08:00 AM', 
    room: '',                                                 
    type: 'Once', 
    role: '',
    status: 'active'
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

  // --- 1. HANDLE AI SUGGESTION ROUTING ---
const handleAIRecommendation = async () => {
    if (!newEvent.reservationName) {
      alert('Please enter a Booking/Reservation Name first!');
      return;
    }

    setIsAiLoading(true);
    setAiRecommendation(null);
    try {
      // ✅ FIX: Call your actual backend route directly via Axios
      const response = await axios.post('[https://church-management-app.lancemanemail.workers.dev/api/ai/analyze-schedule](https://church-management-app.lancemanemail.workers.dev/api/ai/analyze-schedule)', {
        userRequest: `Schedule a ${newEvent.titleSelection || newEvent.title} for ${newEvent.reservationName}`,
        currentEvents: events
      });
      
      setAiRecommendation(response.data);
    } catch (e) {
      console.error('AI Integration Error:', e);
      alert('AI Assistant unavailable right now.');
    } finally {
      setIsAiLoading(false);
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

    setFormData(prev => ({
      ...prev,
      date: dateMatch ? dateMatch[0] : prev.date,
      time: timeMatch ? timeMatch[0].toUpperCase() : prev.time,
      room: foundRoom ? foundRoom : prev.room
    }));

    setAiSuggestion(null);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const combinedTitle = `${formData.titleSelection} for ${formData.reservationName}`;
    
    const submissionData = { 
        ...formData, 
        title: combinedTitle, 
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
        titleSelection: 'Worship Service', reservationName: '', 
        category: 'Worship', date: '', time: '08:00 AM', 
        room: '', role: '', status: 'active'
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
    container: { padding: '15px', backgroundColor: '#f7fafc', minHeight: '100vh' },
    filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    monthHeader: { color: '#4a5568', fontSize: '18px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: '25px', marginBottom: '12px' },
    formCard: { background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
    card: (isArchived) => ({ 
      background: 'white', 
      padding: '15px', 
      borderRadius: '10px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
      display: 'flex', 
      flexDirection: 'column', 
      borderLeft: isArchived ? '4px solid #94a3b8' : '4px solid #6366f1',
      opacity: isArchived ? 0.6 : 1,
      filter: isArchived ? 'grayscale(0.5)' : 'none'
    }),
    badge: (cat, isArchived) => ({
      padding: '3px 8px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
      backgroundColor: isArchived ? '#e2e8f0' : (cat === 'Worship' ? '#e0e7ff' : '#fef3c7'),
      color: isArchived ? '#475569' : (cat === 'Worship' ? '#4338ca' : '#92400e')
    }),
    dateBox: { textAlign: 'center', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', minWidth: '55px' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '5px', marginTop: '10px', fontSize: '12px', color: '#4a5568' },
    footer: { marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' },
    submitBtn: { padding: '10px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    aiBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
    input: { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' },
    attendBtn: (isAttending) => ({ 
      width: '100%', padding: '8px', backgroundColor: isAttending ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
    }),
    // --- 3. STYLES FOR THE DISCOVERED SUGGESTIONS CONTAINER ---
    suggestionPanel: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      color: '#166534',
      fontSize: '13px'
    }
  };

  const sortedEvents = getSortedEvents();
  const groupedEvents = groupEventsByMonth(sortedEvents);

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '20px' }}>Church Calendar</h2>
          <p style={{ color: '#718096', margin: 0, fontSize: '13px' }}>{events.length} Scheduled Activities</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Order:</span>
          <select style={styles.input} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="nearest">Nearest First</option>
            <option value="furthest">Furthest First</option>
          </select>
        </div>
      </div>

      {canManage && (
        <div style={styles.formCard}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>{editingId ? "Edit Event" : "Schedule New Event"}</h3>
          <form onSubmit={handleCreateOrUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
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
              <input type="text" style={styles.input} placeholder="e.g. 08:00 AM" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
              <input style={styles.input} placeholder="Location (Room/Hall)" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
              
              <input style={styles.input} placeholder="Lead Person" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button type="submit" style={styles.submitBtn}>{editingId ? "Update Event" : "Create Event"}</button>
              {!editingId && (
                <button type="button" onClick={handleAiSuggest} disabled={aiLoading} style={styles.aiBtn}>
                  {aiLoading ? "Thinking..." : "✨ AI Suggest"}
                </button>
              )}
              {editingId && <button type="button" onClick={() => setEditingId(null)} style={{...styles.submitBtn, backgroundColor: '#a0aec0'}}>Cancel</button>}
            </div>
          </form>

          {/* --- 4. DISPLAY PANEL FOR COMPLETED PUTER AI SUGGESTIONS --- */}
          {aiSuggestion && (
            <div style={styles.suggestionPanel}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>💡 AI Recommendation:</div>
              <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
                <strong>Plan:</strong> {aiSuggestion.suggestion} <br />
                <strong>Reasoning:</strong> {aiSuggestion.reason}
              </p>
              <button 
                type="button" 
                onClick={applyAiValues} 
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#15803d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Apply to Form
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '14px' }}>Loading calendar...</p>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month}>
            <h3 style={styles.monthHeader}>{month}</h3>
            <div style={styles.grid}>
              {monthEvents.map((event) => {
                const isAttending = event.attendees?.includes(userId);
                const isArchived = event.status === 'archived';
                const eventDate = new Date(event.date);
                
                return (
                  <div key={event._id} style={styles.card(isArchived)}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={styles.dateBox}>
                        <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold' }}>
                          {eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
                          {eventDate.getDate()}
                        </div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '5px' }}>
                          <span style={styles.badge(event.category, isArchived)}>
                            {isArchived ? "Archived" : event.category}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', color: '#1a202c' }}>{event.title}</h4>
                        <p style={{ fontSize: '11px', color: '#718096', margin: 0 }}>Lead: {event.role || "N/A"}</p>
                        
                        <div style={styles.infoGrid}>
                          <span>🕒 {event.time}</span>
                          <span>📍 {event.room || "No location"}</span>
                          <span style={{ color: '#6366f1', fontWeight: '600' }}>👥 {event.attendees?.length || 0} Attending</span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.footer}>
                      {isArchived ? (
                         <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Archived Record</span>
                      ) : (
                        canManage ? (
                          <>
                            <button style={{ border: 'none', background: '#f1f9f8', color:'#047715' , padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }} onClick={() => { setEditingId(event._id); setFormData(event); }}>Edit</button>
                            <button style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }} onClick={() => archiveEvent(event._id)}>Archive</button>
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
          </div>
        ))
      )}
    </div>
  );
};

export default EventTab;