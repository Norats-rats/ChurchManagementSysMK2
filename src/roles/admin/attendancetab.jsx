import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api';

const AttendanceTab = ({ role, userId, user }) => {
  const [checkIns, setCheckIns] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    titleSelection: 'Worship Service',
    reservationName: 'New Session',
    category: 'Worship',
    date: new Date().toISOString().split('T')[0],
    time: '08:00 AM',
    room: 'Main Sanctuary',
    type: 'Once',
    role: '',
    status: 'active'
  });

  const canManage = role === 'Admin' || role === 'Ministry Leader';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchInitialData();
  }, [role, userId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [attRes, eventsRes] = await Promise.all([
        api.getAttendance(),
        api.getEvents()
      ]);
      
      const attData = attRes.data || [];
      setCheckIns(attData);
      setUpcomingEvents(eventsRes.data || []);

      setHasCheckedInToday(attData.some(log => log.userId === String(userId) && log.date === todayStr));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const [selectedTodayEventId, setSelectedTodayEventId] = useState(null);

  const todaysEvents = upcomingEvents.filter(event => {
    if (!event.date) return false;
    const cleanEventDate = String(event.date).replace(/\//g, '-');
    const cleanTodayStr = String(todayStr).replace(/\//g, '-');
    return cleanEventDate === cleanTodayStr;
  });

  useEffect(() => {
    if (!selectedTodayEventId && todaysEvents.length > 0) {
      setSelectedTodayEventId(todaysEvents[0]._id || todaysEvents[0].id);
    }
  }, [todaysEvents, selectedTodayEventId]);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const selectedTodayEvent = todaysEvents.find(event => String(event._id || event.id) === String(selectedTodayEventId)) || null;

  const qrValueForEvent = (event) => `${window.location.origin}?checkIn=true&eventId=${event._id || event.id}&eventTitle=${encodeURIComponent(event.titleSelection || event.title || 'Event')}`;

  const selectedEventAttendees = selectedTodayEvent
    ? checkIns.filter(record => String(record.eventId) === String(selectedTodayEvent._id || selectedTodayEvent.id))
    : [];

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (creatingEvent) return;
    setCreatingEvent(true);
    try {
      await api.createEvent(newEventData);
      setShowCreateEventModal(false);
      setNewEventData(prev => ({ ...prev, titleSelection: 'Worship Service', reservationName: 'New Session', room: 'Main Sanctuary', time: '08:00 AM' }));
      await fetchInitialData();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Unable to create event QR screen.');
    } finally {
      setCreatingEvent(false);
    }
  };

  const exportToExcel = () => {
    const targetRecords = selectedTodayEvent ? selectedEventAttendees : checkIns;
    const formattedRows = targetRecords.map((record) => {
      const event = upcomingEvents.find(ev => String(ev._id || ev.id) === String(record.eventId));
      return {
        Event: event ? (event.titleSelection || event.title) : (record.service || `Event ${record.eventId}`),
        Attendee: record.userName || record.userId,
        Date: record.date,
        Time: record.time,
        Status: record.status || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows, {
      header: ['Event', 'Attendee', 'Date', 'Time', 'Status']
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");
    XLSX.writeFile(workbook, `Attendance_Report_${todayStr}.xlsx`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#6366f1' }}>
        <p>Loading attendance data files...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div style={{ maxWidth: '450px', margin: '40px auto', padding: '0 20px' }}>
        <div style={styles.statusCard(hasCheckedInToday)}>
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>{hasCheckedInToday ? '🎉' : '📍'}</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            {hasCheckedInToday ? 'Checked In' : 'Ready to Check In'}
          </h2>
          <p style={{ opacity: 0.9, fontSize: '15px', lineHeight: '1.5' }}>
            {hasCheckedInToday 
              ? "Your attendance record has been compiled and saved for today's session logs." 
              : "Please approach the front administration booth monitor station and scan the active QR code to verify your presence."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px' }}>
        <div style={{ ...styles.card, padding: '16px', minWidth: sidebarExpanded ? '290px' : '72px', transition: 'min-width 0.25s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            {sidebarExpanded ? (
              <div>
                <h3 style={styles.cardTitle}>Today's Event Selector</h3>
                <p style={styles.cardSubtitle}>Pick an event, then close the sidebar to free screen space.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>Today's Events</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{todaysEvents.length} available</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarExpanded(prev => !prev)}
              style={styles.toggleSidebarBtn}
            >
              {sidebarExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div style={{ ...styles.eventSidebar, ...(sidebarExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed) }}>
            {todaysEvents.length === 0 ? (
              <div style={styles.noEventCard}>
                <p style={{ margin: 0, color: '#475569' }}>No events scheduled for today.</p>
              </div>
            ) : (
              todaysEvents.map((event) => {
                const eventId = event._id || event.id;
                const count = checkIns.filter(record => String(record.eventId) === String(eventId)).length;
                const selected = String(selectedTodayEventId) === String(eventId);
                return (
                  <button
                    key={eventId}
                    type="button"
                    onClick={() => {
                      setSelectedTodayEventId(eventId);
                      setSidebarExpanded(false);
                    }}
                    style={{
                      ...(sidebarExpanded ? styles.eventToggle : styles.eventToggleCompact),
                      ...(selected ? styles.eventToggleActive : {})
                    }}
                  >
                    <span>{sidebarExpanded ? (event.titleSelection || event.title || 'Untitled Event') : (event.titleSelection || event.title || 'Event').slice(0, 1)}</span>
                    {sidebarExpanded && <span style={styles.eventCount}>{count} checked in</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h3 style={styles.cardTitle}>Selected Event Check-In</h3>
              <p style={styles.cardSubtitle}>{selectedTodayEvent ? `${selectedEventAttendees.length} checked in for this event` : 'Choose an event from the left to view the QR and logs.'}</p>
            </div>
            <button style={styles.exportBtn} onClick={exportToExcel} disabled={!selectedTodayEvent || selectedEventAttendees.length === 0}>
              📥 Export Sheet
            </button>
          </div>

          {selectedTodayEvent ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '22px', marginTop: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '18px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <QRCodeCanvas 
                  value={qrValueForEvent(selectedTodayEvent)}
                  size={260}
                  level={"H"}
                  includeMargin={true}
                />
                <div>
                  <h4 style={styles.eventTitle}>{selectedTodayEvent.titleSelection || selectedTodayEvent.title || 'Event'}</h4>
                  <p style={styles.eventDetail}>🕒 {selectedTodayEvent.time || 'TBD'} | 🏛️ {selectedTodayEvent.room || 'Main Sanctuary'}</p>
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Attendance History</h4>
                {selectedEventAttendees.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>No attendees have checked in yet for this event.</p>
                ) : (
                  <div style={styles.historyTable}>
                    {selectedEventAttendees.map((att, idx) => (
                      <div key={`${selectedTodayEvent._id || selectedTodayEvent.id}-${idx}`} style={styles.historyRow}>
                        <span>{att.name || att.userName || att.userId}</span>
                        <span>{att.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', borderRadius: '20px', background: '#f8fafc', border: '1px dashed #cbd5e0', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#475569', fontSize: '15px' }}>Select an event from the left sidebar to display its QR code, attendance summary, and event-specific log.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '24px', background: '#f8fafc', minHeight: '80vh' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' },
  card: { background: '#ffffff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' },
  cardTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 },
  cardSubtitle: { fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' },
  exportBtn: { background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  qrWrapper: { padding: '10px', background: '#f8fafc', borderRadius: '16px', display: 'inline-block', border: '1px solid #e2e8f0' },
  eventTitle: { marginTop: '20px', color: '#1e293b', marginBottom: '5px', fontSize: '16px', fontWeight: '600' },
  eventDetail: { color: '#64748b', fontSize: '14px', margin: 0 },
  noEventCard: { padding: '40px', background: '#f1f5f9', borderRadius: '20px', color: '#475569', border: '2px dashed #cbd5e1', maxWidth: '260px', fontSize: '14px' },
  statusCard: (done) => ({
    background: done ? '#059669' : '#2563eb', 
    color: '#ffffff', 
    padding: '60px 30px', 
    borderRadius: '32px', 
    textAlign: 'center', 
    boxShadow: done ? '0 20px 25px -5px rgba(5, 150, 105, 0.2)' : '0 20px 25px -5px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.3s ease'
  }),
  logSection: { marginTop: '20px' },
  logHeaderRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', padding: '0 8px 8px 8px' },
  logContainer: { maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  logRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' },
  avatarPlaceholder: { width: '28px', height: '28px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  userIdText: { fontSize: '14px', fontWeight: '500', color: '#334155' },
  timestampText: { fontSize: '13px', color: '#64748b', fontWeight: '500' },
  formInput: { width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },
  historyTable: { display: 'grid', gap: '10px', marginTop: '10px' },
  historyRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#334155', fontSize: '13px' },
  eventSidebar: { padding: '18px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' },
  eventToggle: { width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  eventToggleCompact: { width: '100%', textAlign: 'center', padding: '12px 10px', borderRadius: '18px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' },
  eventToggleActive: { background: '#2563eb', color: 'white', borderColor: '#1d4ed8' },
  sidebarExpanded: { width: '100%', transition: 'width 0.25s ease' },
  sidebarCollapsed: { width: '100%', display: 'grid', gap: '10px', justifyContent: 'center' },
  toggleSidebarBtn: { padding: '10px 14px', borderRadius: '14px', border: '1px solid #cbd5e0', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', fontWeight: '700', fontSize: '12px' },
  eventCount: { fontSize: '12px', opacity: 0.85 },
  formButton: { width: '100%', padding: '12px 16px', borderRadius: '16px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }
};

export default AttendanceTab;