import { useEffect, useState } from 'react';
import api from '../../api';

const EventTab = ({ role, userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [sortOrder, setSortOrder] = useState('nearest'); 
  
  const [formData, setFormData] = useState({
    titleSelection: 'Worship Service', 
    reservationName: '',              
    category: 'Worship', 
    date: '', 
    time: '08:00 AM', 
    room: '',                         
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

  // UPDATED: Now performs a soft-delete by updating status to 'archived'
  const archiveEvent = async (id) => {
    if (!window.confirm("Archive this event? It will no longer be editable.")) return;
    try {
      // We use updateEvent to change the status instead of deleteEvent
      await api.updateEvent(id, { status: 'archived' }); 
      fetchEvents();
    } catch (err) {
      alert("Error archiving event");
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

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const combinedTitle = `${formData.titleSelection} for ${formData.reservationName}`;
    // Ensures status is 'active' on creation or update
    const submissionData = { ...formData, title: combinedTitle, status: 'active' };

    try {
      if (editingId) {
        await api.updateEvent(editingId, submissionData); 
      } else {
        await api.createEvent(submissionData); 
      }
      setEditingId(null);
      setFormData({ 
        titleSelection: 'Worship Service', reservationName: '', 
        category: 'Worship', date: '', time: '08:00 AM', 
        room: '', role: '' 
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
    input: { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' },
    editBtn: { border: '1px solid #6366f1', background: '#fff', color: '#6366f1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    archiveBtn: { border: 'none', background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }
  };

  const groupedEvents = groupEventsByMonth(getSortedEvents());

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '20px' }}>Church Calendar</h2>
        </div>
        <select style={styles.input} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="nearest">Nearest First</option>
          <option value="furthest">Furthest First</option>
        </select>
      </div>

      {canManage && (
        <div style={styles.formCard}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>{editingId ? "Edit Event" : "Schedule New Event"}</h3>
          <form onSubmit={handleCreateOrUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <select style={styles.input} value={formData.titleSelection} onChange={e => setFormData({...formData, titleSelection: e.target.value})}>
                <option value="Worship Service">Worship Service</option>
                <option value="Bible Study">Bible Study</option>
                <option value="Youth Meeting">Youth Meeting</option>
              </select>
              <input style={styles.input} placeholder="Booking Name" value={formData.reservationName} onChange={e => setFormData({...formData, reservationName: e.target.value})} required />
              <input type="date" style={styles.input} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              <input type="time" style={styles.input} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={styles.submitBtn}>{editingId ? "Update" : "Create"}</button>
              {editingId && <button type="button" style={{...styles.submitBtn, backgroundColor: '#94a3b8'}} onClick={() => setEditingId(null)}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvents]) => (
          <div key={month}>
            <h3 style={styles.monthHeader}>{month}</h3>
            <div style={styles.grid}>
              {monthEvents.map((event) => {
                const isArchived = event.status === 'archived';
                const eventDate = new Date(event.date);
                
                return (
                  <div key={event._id} style={styles.card(isArchived)}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={styles.dateBox}>
                        <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold' }}>{eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{eventDate.getDate()}</div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <span style={styles.badge(event.category, isArchived)}>
                          {isArchived ? "Archived" : event.category}
                        </span>
                        <h4 style={{ margin: '5px 0 0 0', fontSize: '15px' }}>{event.title}</h4>
                        <div style={styles.infoGrid}>
                          <span>🕒 {event.time} | 📍 {event.room || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.footer}>
                      {isArchived ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Record Locked</span>
                      ) : (
                        canManage && (
                          <>
                            <button style={styles.editBtn} onClick={() => { setEditingId(event._id); setFormData(event); }}>Edit</button>
                            <button style={styles.archiveBtn} onClick={() => archiveEvent(event._id)}>Archive</button>
                          </>
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