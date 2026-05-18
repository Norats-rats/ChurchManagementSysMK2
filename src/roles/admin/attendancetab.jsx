import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api';

const AttendanceTab = ({ role, userId, user }) => {
  const [checkIns, setCheckIns] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

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

  const todaysEvent = upcomingEvents.find(event => {
    if (!event.date) return false;
    const cleanEventDate = event.date.replace(/\//g, '-');
    const cleanTodayStr = todayStr.replace(/\//g, '-');
    return cleanEventDate === cleanTodayStr;
  });

  const qrValue = todaysEvent 
    ? `${window.location.origin}?checkIn=true&eventId=${todaysEvent._id || todaysEvent.id}&eventTitle=${encodeURIComponent(todaysEvent.titleSelection || todaysEvent.title || 'Event')}` 
    : '';

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(checkIns);
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
              ? 'Your attendance record has been compiled and saved for today\'s session logs.' 
              : 'Please approach the front administration booth monitor station and scan the active QR code to verify your presence.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Station Check-In Gateway</h3>
          <p style={styles.cardSubtitle}>Position this screen clearly for arriving members to complete check-ins.</p>
          
          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <div style={styles.qrWrapper}>
              {qrValue ? (
                <QRCodeCanvas 
                  value={qrValue}
                  size={260}
                  level={"H"}
                  includeMargin={true}
                />
              ) : (
                <div style={styles.noEventCard}>
                  <p>No event items populated on the dashboard calendar for today ({todayStr}).</p>
                </div>
              )}
            </div>

            {todaysEvent && (
              <>
                <h4 style={styles.eventTitle}>{todaysEvent.titleSelection || todaysEvent.title}</h4>
                <p style={styles.eventDetail}>🕒 {todaysEvent.time} | 🏛️ {todaysEvent.room || 'Main Sanctuary'}</p>
              </>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h3 style={styles.cardTitle}>Live Tracking Logs</h3>
              <p style={styles.cardSubtitle}>Total verified check-ins logged today: {checkIns.length}</p>
            </div>
            <button style={styles.exportBtn} onClick={exportToExcel} disabled={checkIns.length === 0}>
              📥 Export Sheet
            </button>
          </div>

          <div style={styles.logSection}>
            <div style={styles.logHeaderRow}>
              <span>Attendee ID Reference</span>
              <span>Timestamp</span>
            </div>
            
            <div style={styles.logContainer}>
              {checkIns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                  No members have scanned through this console terminal gateway today yet.
                </div>
              ) : (
                [...checkIns].reverse().map((log, index) => (
                  <div key={log._id || index} style={styles.logRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={styles.avatarPlaceholder}>👤</div>
                      <span style={styles.userIdText}>{log.userId}</span>
                    </div>
                    <span style={styles.timestampText}>{log.time || 'Logged'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
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
  timestampText: { fontSize: '13px', color: '#64748b', fontWeight: '500' }
};

export default AttendanceTab;