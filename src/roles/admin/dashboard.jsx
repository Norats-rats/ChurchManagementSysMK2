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
  const [stats, setStats] = useState({ memberCount: 0, attendanceCount: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [announcement, setAnnouncement] = useState("Loading church updates...");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading scripture...", reference: "" });

  const navigationConfig = [
    { id: 'dashboard', label: role === 'Member' ? '📌 Bulletin Board' : '📊 Dashboard', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'ebible', label: '📖 eBible', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'members', label: '👥 Church Members', roles: ['Admin'] },
    { id: 'events', label: '📅 Events', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'attendance', label: '📋 Attendance', roles: ['Admin', 'Member', 'Staff'] },
    { id: 'ministries', label: '❤️ Ministries', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'prayers', label: '🙏 Prayers', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'analytics', label: '📈 Analytics', roles: ['Admin', 'Ministry Leader'] },
  ];

  const visibleTabs = navigationConfig.filter(tab => tab.roles.includes(role));

  useEffect(() => {
    fetchDailyVerse();
    if (currentTab === 'dashboard') {
      fetchBulletinData();
    }
  }, [currentTab]);

const fetchBulletinData = async () => {
  try {
    const [membersRes, eventsRes, attendanceRes, announceRes] = await Promise.all([
      api.getMembers(), 
      api.getEvents(), 
      api.getAttendance(),
      api.getAnnouncement().catch(() => ({ data: { text: "Welcome to our Fellowship!" } })) 
    ]);

    const allEvents = eventsRes.data || [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const futureEvents = allEvents
      .filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setStats({
      memberCount: Array.isArray(membersRes.data) ? membersRes.data.length : 0,
      attendanceCount: Array.isArray(attendanceRes.data) ? attendanceRes.data.length : 0,
    });
    setNextEvent(futureEvents[0] || null);
    setAnnouncement(announceRes.data?.text || "Peace be with you!");
  } catch (err) {
    console.error("Data fetch error:", err);
  }
};

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      await api.updateAnnouncement(newAnnouncement);
      setAnnouncement(newAnnouncement);
      setNewAnnouncement("");
      alert("Bulletin Updated for all members!");
    } catch (err) {
      alert("Error syncing announcement to database.");
    }
  };

  const fetchDailyVerse = async () => {
    try {
      const bibleStructure = [{ name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "John", chapters: 21 }];
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

  const getTrivia = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const trivias = [
      "The word 'Christian' appears only 3 times in the Bible.",
      "Psalm 118 is the middle chapter of the entire Bible.",
      "The shortest verse is 'Jesus wept' (John 11:35).",
      "The Bible was written in three languages: Hebrew, Aramaic, and Greek.",
      "Esther is the only book in the Bible that does not mention God.",
      "The longest word in the Bible is 'Mahershalalhashbaz'."
    ];
    return trivias[dayOfYear % trivias.length];
  };

  if (!user) return <div className="loading-screen">Authenticating...</div>;

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
            <span style={{ color: '#60a5fa', fontSize: '11px', display: 'block' }}>{role}</span>
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
              <div className="bulletin-board">
                {isLeader && (
                  <div style={leaderInputCard}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>📢 Update Bulletin Announcement</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        style={inputStyle} 
                        placeholder="Type a message for all members..." 
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                      />
                      <button onClick={postAnnouncement} style={postBtnStyle}>Sync Bulletin</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  <div style={bulletinCardStyle}>
                    <h2 style={{ color: '#1e3a8a', marginTop: 0 }}>Community Bulletin</h2>
                    <div style={announcementBoxStyle}>
                      <p>{announcement}</p>
                    </div>
                    
                    <div style={triviaBoxStyle}>
                      <small style={{ fontWeight: '800', color: '#b45309' }}>💡 DAILY TRIVIA</small>
                      <p style={{ margin: '5px 0 0 0', color: '#92400e' }}>{getTrivia()}</p>
                    </div>
                  </div>

                  <div style={{ ...bulletinCardStyle, background: '#1e293b', color: '#fff' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#94a3b8' }}>Next Gathering</h4>
                    {nextEvent ? (
                      <>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{nextEvent.title}</div>
                        <div style={{ margin: '10px 0', fontSize: '14px' }}>
                          📅 {new Date(nextEvent.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>📍 {nextEvent.location || 'Church Main Hall'}</div>
                      </>
                    ) : (
                      <p style={{ color: '#64748b' }}>Stay tuned for upcoming events!</p>
                    )}
                  </div>
                </div>
              </div>

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

const bulletinCardStyle = { background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const announcementBoxStyle = { background: '#f8fafc', padding: '25px', borderRadius: '16px', borderLeft: '5px solid #3b82f6', fontSize: '19px', color: '#1e293b', margin: '20px 0' };
const triviaBoxStyle = { marginTop: '20px', padding: '15px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' };
const leaderInputCard = { background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '2px solid #bfdbfe', marginBottom: '20px' };
const inputStyle = { flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' };
const postBtnStyle = { background: '#2563eb', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const quoteContainerStyle = { marginTop: '30px', padding: '40px', background: '#f1f5f9', borderRadius: '24px', textAlign: 'center', position: 'relative' };
const quoteIconStyle = { fontSize: '50px', color: '#cbd5e1', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const quoteTextStyle = { fontSize: '18px', fontStyle: 'italic', color: '#334155', position: 'relative', zIndex: 1 };
const quoteAuthorStyle = { display: 'block', marginTop: '15px', fontWeight: 'bold', color: '#64748b' };

export default Dashboard;