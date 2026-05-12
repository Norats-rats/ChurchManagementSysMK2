import { useEffect, useState } from 'react';
import api from '../../api';
import Analytics from './analyticz';
import AttendanceTab from './attendancetab';
import EventTab from './eventtab';
import Finances from './finances';
import MemberForm from './memberform';
import Ministries from './ministries';
import Prayers from './prayers';

const Dashboard = ({ user, role: rawRole, onLogout }) => {
  const role = rawRole?.toLowerCase().includes('member') ? 'Member' : rawRole;
  
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState({
    memberCount: 0,
    attendanceCount: 0,
    monthlyContributions: 0,
    upcomingEventsCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading scripture...", reference: "" });

  const navigationConfig = [
    { id: 'dashboard', label: '📊 Dashboard', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'members', label: '👥 Church Members', roles: ['Admin'] },
    { id: 'events', label: '📅 Events', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'attendance', label: '📋 Attendance', roles: ['Admin', 'Member', 'Staff'] },
    { id: 'finances', label: '💰 Finances', roles: ['Admin', 'Member', 'Staff'] }, 
    { id: 'ministries', label: '❤️ Ministries', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'prayers', label: '🙏 Prayers', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'analytics', label: '📈 Analytics', roles: ['Admin', 'Ministry Leader'] },
  ];

  const visibleTabs = navigationConfig.filter(tab => tab.roles.includes(role));

useEffect(() => {
  fetchDailyVerse();
}, []); 

useEffect(() => {
  if (currentTab === 'dashboard') {
    fetchDashboardStats();
  }
}, [currentTab]);
const fetchDailyVerse = async () => {
  try {
    const bibleStructure = [
      { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 },
      { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 },
      { name: "Matthew", chapters: 28 }, { name: "John", chapters: 21 },
      { name: "Romans", chapters: 16 }, { name: "Philippians", chapters: 4 }
    ];

    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const bookIndex = dateSeed % bibleStructure.length;
    const selectedBook = bibleStructure[bookIndex];
    const chapterIndex = (dateSeed % selectedBook.chapters) + 1;
    const response = await fetch(`https://bible-api.com/${selectedBook.name}+${chapterIndex}`);
    const data = await response.json();

    if (data.verses && data.verses.length > 0) {
      const verseIndex = dateSeed % data.verses.length;
      const selectedVerse = data.verses[verseIndex];

      setDailyVerse({
        text: selectedVerse.text,
        reference: `${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`
      });
    }
  } catch (err) {
    console.error("Bible API error:", err);
    setDailyVerse({ 
      text: "For God so loved the world, that he gave his only begotten Son.", 
      reference: "John 3:16" 
    });
  }
};
  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const [membersRes, financeRes, eventsRes, attendanceRes] = await Promise.all([
        api.getMembers(),
        api.getFinances(),
        api.getEvents(),
        api.getAttendance()
      ]);

      const members = membersRes.data;
      const financeData = financeRes.data;
      const events = eventsRes.data;
      const attendance = attendanceRes.data;

      setStats({
        memberCount: Array.isArray(members) ? members.length : 0,
        monthlyContributions: financeData.stats?.totalIncome || 0,
        upcomingEventsCount: Array.isArray(events) ? events.length : 0,
        attendanceCount: Array.isArray(attendance) ? attendance.length : 0
      });
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!user) return <div className="loading-screen">Authenticating Session...</div>;

  return (
    <div className="dashboard-wrapper">
      <nav className="top-nav">
        <div className="nav-left">
           <div className="logo-small">⛪</div>
           <div className="church-title">
             <h4>Free Believers in Christ Fellowship Inc.</h4>
             <small>{role} Portal • Taguig City</small>
           </div>
        </div>
        
        <div className="nav-right">
          <div className="admin-info">
            <strong>{user.firstName} {user.lastName}</strong>
            <span style={{ color: '#60a5fa', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>{role}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="menu-bar">
          {visibleTabs.map(tab => (
            <button 
              key={tab.id}
              className={`menu-item ${currentTab === tab.id ? 'active' : ''}`} 
              onClick={() => setCurrentTab(tab.id)}
            >
              {tab.id === 'finances' && role === 'Member' ? '💰 Donations' : tab.label}
            </button>
          ))}
        </div>

        <div className="view-container" style={{ padding: '20px' }}>
          
          {currentTab === 'dashboard' && (
            <>
              <div className="insight-banner">
                <div className="sparkle-icon">✨</div>
                <div className="insight-text">
                  <strong>Welcome to the {role} Portal</strong>
                  <p>All church management systems are active and synchronized with the live database.</p>
                </div>
              </div>

              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {(role === 'Admin' || role === 'Ministry Leader') && (
                  <StatCard label="Total Members" value={stats.memberCount} icon="👥" color="blue" />
                )}
                
                <StatCard label="Live Attendance" value={stats.attendanceCount} icon="📋" color="green" />
                <StatCard label="Scheduled Events" value={stats.upcomingEventsCount} icon="📅" color="orange" />
              </div>

              <div style={quoteContainerStyle}>
                <div style={quoteIconStyle}>"</div>
                <p style={quoteTextStyle}>{dailyVerse.text}</p>
                <cite style={quoteAuthorStyle}>— {dailyVerse.reference}</cite>
              </div>
            </>
          )}

          {currentTab === 'members' && role === 'Admin' && <MemberForm />}
          {currentTab === 'events' && <EventTab role={role} userId={user._id} />}
          {currentTab === 'attendance' && <AttendanceTab role={role} userId={user._id} user={user} />}
          {currentTab === 'finances' && <Finances role={role} userId={user._id} />}
          {currentTab === 'ministries' && <Ministries role={role} />}
          {currentTab === 'prayers' && <Prayers role={role} user={user} />}
          {currentTab === 'analytics' && (role === 'Admin' || role === 'Ministry Leader') && <Analytics />}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="stat-card" style={statCardEnhanced}>
    <div className="stat-info">
      <span className="label" style={labelEnhanced}>{label}</span>
      <h2 style={numberEnhanced}>{value}</h2>
    </div>
    <div className={`stat-icon icon-${color}`} style={iconEnhanced}>{icon}</div>
  </div>
);

const statCardEnhanced = { background: '#fff', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const labelEnhanced = { fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const numberEnhanced = { fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '4px 0' };
const iconEnhanced = { fontSize: '32px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' };

const quoteContainerStyle = {
  marginTop: '30px',
  padding: '40px',
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  borderRadius: '24px',
  textAlign: 'center',
  position: 'relative',
  border: '1px solid #e2e8f0'
};

const quoteIconStyle = {
  fontSize: '60px',
  color: '#cbd5e1',
  fontFamily: 'serif',
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  opacity: '0.5'
};

const quoteTextStyle = {
  fontSize: '20px',
  fontStyle: 'italic',
  color: '#334155',
  lineHeight: '1.6',
  marginBottom: '15px',
  position: 'relative',
  zIndex: 1
};

const quoteAuthorStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

export default Dashboard;