import { useEffect, useState } from 'react';
import api from '../../api';
import Analytics from './analyticz';
import AttendanceTab from './attendancetab';
import EBible from './ebible';
import EventTab from './eventtab';
import MemberForm from './memberform';
import Ministries from './ministries';
import Prayers from './prayers';

const Dashboard = ({ user, role: rawRole, onLogout }) => {
  const role = rawRole?.toLowerCase().includes('member') ? 'Member' : rawRole;
  const isLeader = role === 'Admin' || role === 'Ministry Leader';

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState({ memberCount: 0, attendanceCount: 0, upcomingEventsCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading scripture...", reference: "" });

  const [announcement, setAnnouncement] = useState("Peace be with you! Welcome to our new digital bulletin.");
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const navigationConfig = [
    { id: 'dashboard', label: '📊 Dashboard', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'ebible', label: '📖 eBible', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'members', label: '👥 Church Members', roles: ['Admin'] },
    { id: 'events', label: '📅 Events', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'attendance', label: '📋 Attendance', roles: ['Admin', 'Member', 'Staff'] },
    { id: 'ministries', label: '❤️ Ministries', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'prayers', label: '🙏 Prayers', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'analytics', label: '📈 Analytics', roles: ['Admin', 'Ministry Leader'] },
  ];

  const visibleTabs = navigationConfig.filter(tab => tab.roles.includes(role));

  useEffect(() => { fetchDailyVerse(); }, []);
  useEffect(() => { if (currentTab === 'dashboard') fetchDashboardStats(); }, [currentTab]);

  const fetchDailyVerse = async () => {
    try {
      const bibleStructure = [
        { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 },
        { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 },
        { name: "Matthew", chapters: 28 }, { name: "John", chapters: 21 }
      ];
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const selectedBook = bibleStructure[dateSeed % bibleStructure.length];
      const response = await fetch(`https://bible-api.com/${selectedBook.name}+${(dateSeed % selectedBook.chapters) + 1}`);
      const data = await response.json();
      if (data.verses) {
        const v = data.verses[dateSeed % data.verses.length];
        setDailyVerse({ text: v.text, reference: `${v.book_name} ${v.chapter}:${v.verse}` });
      }
    } catch (err) {
      setDailyVerse({ text: "For God so loved the world...", reference: "John 3:16" });
    }
  };

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const [membersRes, eventsRes, attendanceRes] = await Promise.all([
        api.getMembers(), api.getEvents(), api.getAttendance()
      ]);
      setStats({
        memberCount: membersRes.data?.length || 0,
        upcomingEventsCount: eventsRes.data?.length || 0,
        attendanceCount: attendanceRes.data?.length || 0
      });
    } catch (err) { console.error(err); } finally { setLoadingStats(false); }
  };

  const postAnnouncement = () => {
    if(!newAnnouncement.trim()) return;
    setAnnouncement(newAnnouncement);
    setNewAnnouncement("");
    alert("Bulletin Updated!");
  };

  const getTrivia = () => {
    const day = new Date().getDate();
    const trivias = [
      "The shortest verse in the Bible is 'Jesus wept' (John 11:35).",
      "The longest chapter in the Bible is Psalm 119.",
      "The word 'Christian' only appears three times in the New Testament.",
      "Esther and Song of Solomon are the only books that don't mention God's name.",
      "The Bible was written by over 40 different authors over 1,500 years."
    ];
    return trivias[day % trivias.length];
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
            <button key={tab.id} className={`menu-item ${currentTab === tab.id ? 'active' : ''}`} onClick={() => setCurrentTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="view-container" style={{ padding: '20px' }}>
          
          {currentTab === 'dashboard' && (
            <>
              {role === 'Member' ? (
                <div className="bulletin-board" style={bulletinBoardStyle}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                    
                    <div className="bulletin-main" style={bulletinCardStyle}>
                      <h3 style={{ color: '#1e40af', marginBottom: '15px' }}>📢 Announcements</h3>
                      <div style={announcementBoxStyle}>
                        <p>{announcement}</p>
                      </div>
                      
                      <div style={{ marginTop: '25px', padding: '15px', borderTop: '2px dashed #e2e8f0' }}>
                        <h4 style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>💡 Daily Bible Trivia</h4>
                        <p style={{ color: '#334155', fontWeight: '500' }}>{getTrivia()}</p>
                      </div>
                    </div>

                    <div className="bulletin-side">
                      <div style={{ ...bulletinCardStyle, marginBottom: '15px', background: '#eff6ff' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>📅 Next Events</h4>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.upcomingEventsCount}</div>
                        <small>Check the Events tab for details</small>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="insight-banner">
                    <div className="sparkle-icon">✨</div>
                    <div className="insight-text">
                      <strong>Leader Dashboard</strong>
                      <p>Update the member bulletin board below.</p>
                    </div>
                  </div>

                  <div style={{ ...bulletinCardStyle, marginBottom: '20px', border: '2px solid #3b82f6' }}>
                    <h4>Update Member Bulletin</h4>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Type a message for all members..." 
                        style={inputStyle}
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                      />
                      <button onClick={postAnnouncement} style={postBtnStyle}>Post Announcement</button>
                    </div>
                  </div>

                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <StatCard label="Total Members" value={stats.memberCount} icon="👥" color="blue" />
                    <StatCard label="Live Attendance" value={stats.attendanceCount} icon="📋" color="green" />
                    <StatCard label="Scheduled Events" value={stats.upcomingEventsCount} icon="📅" color="orange" />
                  </div>
                </>
              )}

              <div style={quoteContainerStyle}>
                <div style={quoteIconStyle}>"</div>
                <p style={quoteTextStyle}>{dailyVerse.text}</p>
                <cite style={quoteAuthorStyle}>— {dailyVerse.reference}</cite>
              </div>
            </>
          )}

          {currentTab === 'ebible' && <EBible />}
          {currentTab === 'members' && role === 'Admin' && <MemberForm />}
          {currentTab === 'events' && <EventTab role={role} userId={user._id} />}
          {currentTab === 'attendance' && <AttendanceTab role={role} userId={user._id} user={user} />}
          {currentTab === 'ministries' && <Ministries role={role} />}
          {currentTab === 'prayers' && <Prayers role={role} user={user} />}
          {currentTab === 'analytics' && isLeader && <Analytics />}
        </div>
      </div>
    </div>
  );
};

const bulletinBoardStyle = { marginTop: '10px' };
const bulletinCardStyle = { background: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };
const announcementBoxStyle = { background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', fontSize: '18px', color: '#1e293b', lineHeight: '1.5' };
const inputStyle = { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' };
const postBtnStyle = { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' };

const StatCard = ({ label, value, icon, color }) => (
  <div className="stat-card" style={statCardEnhanced}>
    <div className="stat-info">
      <span className="label" style={labelEnhanced}>{label}</span>
      <h2 style={numberEnhanced}>{value}</h2>
    </div>
    <div className={`stat-icon icon-${color}`} style={iconEnhanced}>{icon}</div>
  </div>
);

const statCardEnhanced = { background: '#fff', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' };
const labelEnhanced = { fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' };
const numberEnhanced = { fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '4px 0' };
const iconEnhanced = { fontSize: '32px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' };

const quoteContainerStyle = { marginTop: '30px', padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '24px', textAlign: 'center', position: 'relative', border: '1px solid #e2e8f0' };
const quoteIconStyle = { fontSize: '60px', color: '#cbd5e1', fontFamily: 'serif', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', opacity: '0.5' };
const quoteTextStyle = { fontSize: '20px', fontStyle: 'italic', color: '#334155', lineHeight: '1.6', marginBottom: '15px', position: 'relative', zIndex: 1 };
const quoteAuthorStyle = { fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' };

export default Dashboard;