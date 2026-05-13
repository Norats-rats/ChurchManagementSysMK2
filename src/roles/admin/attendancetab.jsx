import { QRCodeCanvas } from 'qrcode.react'; // You need to install this: npm install qrcode.react
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

      // Check if current user already checked in today
      setHasCheckedInToday(attData.some(log => log.userId === String(userId) && log.date === todayStr));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Find today's event for the QR Code
  const todaysEvent = upcomingEvents.find(event => event.date === todayStr);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(checkIns);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `Attendance_${todayStr}.xlsx`);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Attendance Data...</div>;

  return (
    <div style={styles.container}>
      {/* SECTION 1: LEADER QR DISPLAY */}
      {canManage && (
        <div style={styles.qrSection}>
          <h2 style={styles.headerText}>Service QR Station</h2>
          {todaysEvent ? (
            <div style={styles.qrCard}>
              <p style={styles.instructionText}>Members: Scan with your <strong>Phone Camera</strong></p>
              <div style={styles.qrWrapper}>
                <QRCodeCanvas 
                  // This URL points back to your app with the event info in the link
                  value={`${window.location.origin}/?eventId=${todaysEvent._id}&title=${encodeURIComponent(todaysEvent.title)}`}
                  size={260}
                  level={"H"}
                  includeMargin={true}
                />
              </div>
              <h3 style={styles.eventTitle}>{todaysEvent.title}</h3>
              <p style={styles.eventDetail}>{todaysEvent.time} • {todaysEvent.room}</p>
            </div>
          ) : (
            <div style={styles.noEventCard}>
              <p>No event scheduled for today. Create an event in the Events tab to enable QR check-in.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MEMBER STATUS */}
      {!canManage && (
        <div style={styles.statusCard(hasCheckedInToday)}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>
            {hasCheckedInToday ? '✅' : '📲'}
          </div>
          <h2>{hasCheckedInToday ? "Attendance Recorded" : "Ready to Check-in?"}</h2>
          <p>
            {hasCheckedInToday 
              ? `You are checked in for today's service. Thank you for joining us!` 
              : "Point your phone's built-in camera at the QR code on the leader's screen to check in automatically."}
          </p>
        </div>
      )}

      {/* SECTION 3: ATTENDANCE LOGS (For Leaders) */}
      {canManage && (
        <div style={styles.logSection}>
          <div style={styles.logHeader}>
            <h3>Today's Attendance ({checkIns.filter(c => c.date === todayStr).length})</h3>
            <button onClick={exportToExcel} style={styles.exportBtn}>Export to Excel</button>
          </div>
          
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Service</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.filter(c => c.date === todayStr).map((log, index) => (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.td}>{log.name}</td>
                    <td style={styles.td}>{log.service}</td>
                    <td style={styles.td}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  qrSection: { textAlign: 'center', marginBottom: '40px' },
  headerText: { color: '#1e3a8a', marginBottom: '10px' },
  instructionText: { color: '#64748b', marginBottom: '20px' },
  qrCard: { 
    background: '#fff', 
    padding: '30px', 
    borderRadius: '24px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
    display: 'inline-block',
    border: '1px solid #e2e8f0'
  },
  qrWrapper: { 
    padding: '10px', 
    background: '#f8fafc', 
    borderRadius: '16px', 
    display: 'inline-block',
    border: '1px solid #e2e8f0'
  },
  eventTitle: { marginTop: '20px', color: '#1e293b', marginBottom: '5px' },
  eventDetail: { color: '#64748b', fontSize: '14px' },
  noEventCard: { 
    padding: '40px', 
    background: '#f1f5f9', 
    borderRadius: '20px', 
    color: '#475569',
    border: '2px dashed #cbd5e1'
  },
  statusCard: (done) => ({
    background: done ? '#ecfdf5' : '#eff6ff',
    color: done ? '#065f46' : '#1e40af',
    padding: '60px 20px',
    borderRadius: '24px',
    textAlign: 'center',
    border: `2px solid ${done ? '#a7f3d0' : '#bfdbfe'}`
  }),
  logSection: { marginTop: '20px' },
  logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  exportBtn: { 
    background: '#10b981', 
    color: 'white', 
    border: 'none', 
    padding: '10px 20px', 
    borderRadius: '12px', 
    cursor: 'pointer',
    fontWeight: '600'
  },
  tableContainer: { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeadRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '15px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '600' },
  td: { padding: '15px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
  tableRow: { transition: 'background 0.2s', ':hover': { background: '#f8fafc' } }
};

export default AttendanceTab;