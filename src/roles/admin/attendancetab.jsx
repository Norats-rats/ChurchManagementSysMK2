import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AttendanceTab = ({ role, userId, user }) => {
  const [checkIns, setCheckIns] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const canSeeAttendance = role === 'Admin' || role === 'Ministry Leader';

  useEffect(() => {
    fetchInitialData();
  }, [role, userId]);

const fetchInitialData = async () => {
    setLoading(true);
    try {
      const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;

      const attResponse = await fetch(`${cleanBase}/api/attendance`);
      
      if (!attResponse.ok || !attResponse.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Server did not return JSON. Check backend routes.");
      }
      
      const attData = await attResponse.json();
      setCheckIns(Array.isArray(attData) ? attData : []);

      const eventsResponse = await fetch(`${cleanBase}/api/events`);
      if (eventsResponse.ok && eventsResponse.headers.get("content-type")?.includes("application/json")) {
        const eventsData = await eventsResponse.json();
        setUpcomingEvents(Array.isArray(eventsData) ? eventsData : []);
      }

    } catch (err) {
      console.error("Initialization error:", err);
      setStatusMessage("Could not connect to server or invalid data received.");
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayTime = (timeString) => {
    if (!timeString) return "N/A";
    if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
    
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return timeString;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysEvent = upcomingEvents.find(event => event.date === todayStr);

  const eventDetails = todaysEvent ? {
    title: todaysEvent.title,
    time: formatDisplayTime(todaysEvent.time),
    location: todaysEvent.room || 'Main Sanctuary'
  } : null;

const handleSelfCheckIn = async () => {
  if (!todaysEvent || isSubmitting || hasCheckedInToday) return;

  setIsSubmitting(true);
  setStatusMessage("");

  try {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    
    const now = new Date();
    const checkInData = {
      userId: String(userId),
      name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : "Member",
      service: todaysEvent.title,
      date: todayStr,
      time: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      status: 'Present'
    };
    const res = await fetch(`${cleanBase}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkInData)
    });
    if (res.ok) {
      setHasCheckedInToday(true);
      setStatusMessage("Attendance recorded successfully!");
      await fetchInitialData();
    } else {
      const result = await res.json();
      setStatusMessage(result.error || "Failed to check in.");
    }
  } catch (err) {
    console.error("Check-in error:", err);
    setStatusMessage("Server error. Check connection.");
  } finally {
    setIsSubmitting(false);
  }
};

  const exportToExcel = () => {
    const worksheetData = checkIns.map(item => ({
      "Full Name": item.name,
      "Service": item.service,
      "Date": item.date,
      "Time": formatDisplayTime(item.time),
      "Status": item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `Attendance_${new Date().toLocaleDateString()}.xlsx`);
  };

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    exportBtn: { padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    memberHero: { background: 'linear-gradient(135deg, #34058c 0%, #4c1d95 100%)', padding: '40px', borderRadius: '24px', color: 'white', textAlign: 'center', marginBottom: '30px' },
    details: { fontSize: '15px', marginTop: '10px', opacity: 0.9, fontWeight: '500' },
    checkInBtn: (disabled) => ({
      padding: '16px 32px', fontSize: '18px', fontWeight: '800', borderRadius: '12px', border: 'none',
      backgroundColor: disabled ? '#64748b' : '#10b981', color: 'white', 
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.7 : 1,
      boxShadow: disabled ? 'none' : '0 10px 15px -3px rgba(16, 185, 129, 0.3)', marginTop: '20px',
      transition: 'all 0.2s ease'
    }),
    reactiveMsg: { marginTop: '15px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', fontWeight: '600' },
    eventGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
    eventCard: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' },
    tableCard: { background: 'white', borderRadius: '15px', border: '1px solid #edf2f7', overflow: 'hidden', marginTop: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '15px', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' },
    td: { padding: '15px', borderTop: '1px solid #f1f5f9', fontSize: '14px' },
    statusPill: (status) => ({
      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
      backgroundColor: status === 'Present' ? '#dcfce7' : '#fee2e2',
      color: status === 'Present' ? '#166534' : '#991b1b'
    })
  };

  if (loading) return <div style={styles.container}>Loading Attendance...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.memberHero}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⛪</div>
        <h2 style={{ fontSize: '28px' }}>
          {eventDetails ? `Today's Service: ${eventDetails.title}` : "No Service Today"}
        </h2>
        
        {eventDetails && (
          <div style={styles.details}>
            🕒 {eventDetails.time} | 📍 {eventDetails.location}
          </div>
        )}
        
        {!eventDetails && <p style={{ opacity: 0.9 }}>Check the schedule below for upcoming events.</p>}

        <button 
          onClick={handleSelfCheckIn} 
          disabled={!todaysEvent || hasCheckedInToday || isSubmitting}
          style={styles.checkInBtn(!todaysEvent || hasCheckedInToday || isSubmitting)}
        >
          {isSubmitting 
            ? "Processing..." 
            : hasCheckedInToday 
                ? "✓ Attendance Confirmed" 
                : !todaysEvent 
                    ? "No Event Today" 
                    : "I Attended Today's Service"}
        </button>

        {statusMessage && <div style={styles.reactiveMsg}>{statusMessage}</div>}
      </div>

      {canSeeAttendance && (
        <>
          <div style={styles.headerFlex}>
            <h3 style={{ margin: 0 }}>Attendance Logs</h3>
            <button style={styles.exportBtn} onClick={exportToExcel}>Export to Excel</button>
          </div>

          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Service</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.length > 0 ? (
                  checkIns.map((person) => (
                    <tr key={person._id}>
                      <td style={styles.td}><strong>{person.name}</strong></td>
                      <td style={styles.td}>{person.service}</td>
                      <td style={styles.td}>{person.date}</td>
                      <td style={styles.td}>{formatDisplayTime(person.time)}</td>
                      <td style={styles.td}><span style={styles.statusPill(person.status)}>{person.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ marginTop: '40px', marginBottom: '20px' }}>
        <h3 style={{ color: '#1e293b' }}>Upcoming Schedule</h3>
      </div>

      <div style={styles.eventGrid}>
        {upcomingEvents
          .filter(e => e.date >= todayStr)
          .slice(0, 3)
          .map(event => (
          <div key={event._id} style={styles.eventCard}>
            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', marginBottom: '8px' }}>
              {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              {' • '}
              {formatDisplayTime(event.time)}
            </div>
            <h4 style={{ margin: '0 0 8px 0' }}>{event.title}</h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>📍 {event.room || 'Main Sanctuary'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceTab;