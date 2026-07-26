import { useEffect, useRef, useState } from 'react';
import api from '../../api';
import churchLogo from '../../assets/churchlogo.jpg';
import Advising from '../../components/shared/advisinglist';
import Profile from '../../components/shared/profile';
import {
  canManageAttendance,
  canManageEvents,
  canManageMinistries,
  canViewAnalytics,
  canViewInventory,
  hasPermission,
  normalizeRole
} from '../../permissions';
import Analytics from './analyticz';
import AttendanceTab from './attendancetab';
import EBible from './ebible';
import EventTab from './eventtab';
import Finances from './finances';
import InventoryForm from './invento';
import MemberForm from './memberform';
import Ministries from './ministries';
import Prayers from './prayers';

const Dashboard = ({ user, role: rawRole, onLogout, theme, onToggleTheme }) => {
  const role = normalizeRole(rawRole);
  const isLeader = role === 'Admin' || role === 'Ministry Leader';
  const isAdmin = role === 'Admin';
  const canManage = canManageEvents(role) || canManageAttendance(role) || canManageMinistries(role);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState({ memberCount: 0, attendanceCount: 0, eventCount: 0, ministryCount: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [announcement, setAnnouncement] = useState("Loading church updates...");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [hidePrayerNotifications, setHidePrayerNotifications] = useState(false);
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading scripture...", reference: "" });
  const notificationsRef = useRef(null);

  const navigationConfig = [
    { id: 'dashboard', label: role === 'Member' ? 'Home' : 'Dashboard', permission: 'dashboard' },
    { id: 'ebible', label: 'Bible', permission: 'bible' },
    { id: 'members', label: 'Members', permission: 'members' },
    { id: 'events', label: 'Events', permission: 'events' },
    { id: 'attendance', label: 'Attendance', permission: 'attendance' },
    { id: 'ministries', label: 'Ministries', permission: 'ministries' },
    { id: 'prayers', label: 'Prayers', permission: 'prayers' },
    { id: 'advising', label: 'Advising', permission: 'advising' },
    { id: 'finances', label: 'Finances', permission: 'finances' },
    { id: 'analytics', label: 'Reports', permission: 'analytics' },
    { id: 'inventory', label: 'Inventory', permission: 'inventory' },
  ];

  const visibleTabs = navigationConfig.filter(tab => hasPermission(role, tab.permission));

  useEffect(() => {
    if (currentTab !== 'profile' && !visibleTabs.some(tab => tab.id === currentTab)) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, visibleTabs]);

  const getLoginTimestamp = () => {
    const stored = sessionStorage.getItem('loginTimestamp');
    return stored ? Number(stored) : null;
  };

  const getPrayerNotificationExpiryMs = () => {
    const loginTs = getLoginTimestamp();
    return loginTs ? loginTs + 20 * 60 * 1000 : null;
  };

  const isPrayerNotificationExpired = () => {
    const expiryMs = getPrayerNotificationExpiryMs();
    return expiryMs !== null && Date.now() >= expiryMs;
  };

  const filterPrayerNotifications = (items) => {
    if (!isPrayerNotificationExpired()) return items;
    return items.filter(item => item.type !== 'prayer');
  };

  useEffect(() => {
    fetchDailyVerse();
    if (currentTab === 'dashboard') {
      fetchBulletinData();
    }
  }, [currentTab]);

  useEffect(() => {
    fetchNotificationBar();
  }, [user, role]);

  useEffect(() => {
    const expiryMs = getPrayerNotificationExpiryMs();
    if (expiryMs === null) {
      setHidePrayerNotifications(false);
      return;
    }

    if (Date.now() >= expiryMs) {
      setHidePrayerNotifications(true);
      return;
    }

    setHidePrayerNotifications(false);
    const timer = setTimeout(() => setHidePrayerNotifications(true), expiryMs - Date.now());
    return () => clearTimeout(timer);
  }, [user?._id]);

  useEffect(() => {
    if (hidePrayerNotifications) {
      setNotifications(prev => prev.filter(item => item.type !== 'prayer'));
    }
  }, [hidePrayerNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleNotificationToggle = () => {
    setNotificationsOpen(prev => !prev);
    if (!notificationsOpen) {
      setExpandedNotificationId(null);
    }
  };

  const handleNotificationClick = (id) => {
    setExpandedNotificationId(prev => (prev === id ? null : id));
  };

  const handleAcknowledgeNotification = async (notification) => {
    if (!notification?.notificationId) return;
    try {
      await api.markNotificationRead(notification.notificationId);
      setNotifications(prev => prev.filter(item => item.notificationId !== notification.notificationId));
      setExpandedNotificationId(null);
    } catch (err) {
      console.error('Failed to acknowledge notification', err);
    }
  };

  const handleReviewRequests = () => {
    setCurrentTab('ministries');
    setNotificationsOpen(false);
  };

  const handleGoToMinistries = () => {
    setCurrentTab('ministries');
    setNotificationsOpen(false);
  };

  const handleClearNotifications = async () => {
    try {
      await api.clearNotifications(user?._id);
      setNotifications([]);
      setNotificationsOpen(false);
      setExpandedNotificationId(null);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const fetchNotificationBar = async () => {
    try {
      const notifications = [];
      const [announceRes] = await Promise.all([
        api.getAnnouncement().catch(() => ({ data: { text: 'No bulletin updates yet.' } }))
      ]);
      const bulletinText = announceRes.data?.text || 'No bulletin updates yet.';
      notifications.push({ id: 'bulletin', title: 'Bulletin Board', message: bulletinText, type: 'bulletin' });

      const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      const userMinistries = Array.isArray(user?.ministries)
        ? user.ministries
        : user?.ministry ? [user.ministry] : [];

      for (const ministryName of userMinistries) {
        if (!ministryName) continue;

        try {
          const ministryRes = await api.getMinistryByName(ministryName, role);
          const announcementText = ministryRes.data?.announcementText;
          if (announcementText) {
            notifications.push({
              id: `ministry-${ministryName}`,
              title: `${ministryName} Announcement`,
              message: announcementText,
              type: 'ministry',
              source: ministryName
            });
          }
        } catch (err) {
          console.warn('No ministry board data available for', ministryName, err);
        }
      }

      if (role === 'Ministry Leader') {
        try {
          const ministriesRes = await api.getMinistries(role);
          const leaderMinistries = Array.isArray(ministriesRes.data)
            ? ministriesRes.data.filter(m => m.leader?.trim().toLowerCase() === userName.toLowerCase())
            : [];

          const pendingRequests = leaderMinistries.reduce((count, m) => {
            const pending = Array.isArray(m.joinRequests)
              ? m.joinRequests.filter(r => r.status === 'Pending').length
              : 0;
            return count + pending;
          }, 0);

          if (pendingRequests > 0) {
            notifications.push({
              id: 'join-applications',
              title: 'Ministry Join Requests',
              message: `${pendingRequests} pending request${pendingRequests === 1 ? '' : 's'}`,
              type: 'join-requests'
            });
          }
        } catch (err) {
          console.warn('Failed to fetch ministry leader notifications', err);
        }
      }

      try {
        if (user?._id) {
          const notifRes = await api.getNotifications(user._id, role);
          const personalNotifications = Array.isArray(notifRes.data) ? notifRes.data.filter(n => n.status !== 'Read') : [];
          personalNotifications.forEach((item) => {
            notifications.unshift({
              id: item._id?.toString() || `personal-${Math.random().toString(36).slice(2)}`,
              notificationId: item._id?.toString(),
              title: item.type === 'prayer' ? 'Prayer Answered' : 'Personal Notification',
              message: item.message,
              type: item.type || 'personal',
              source: item.source || ''
            });
          });
        }
      } catch (err) {
        console.warn('Failed to fetch personal notifications', err);
      }

      setNotifications(filterPrayerNotifications(notifications));
    } catch (err) {
      console.error('Notification bar fetch failed', err);
    }
  };

  const fetchBulletinData = async () => {
    try {
      const [membersRes, eventsRes, attendanceRes, announceRes, ministriesRes] = await Promise.all([
        api.getMembers(), 
        api.getEvents(), 
        api.getAttendance(),
        api.getAnnouncement().catch(() => ({ data: { text: "Welcome to our Fellowship!" } })),
        api.getMinistries().catch(() => ({ data: [] }))
      ]);

      const allEvents = eventsRes.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingEvents = allEvents
        .map((event) => ({
          ...event,
          normalizedDate: new Date(`${event.date}T00:00:00`)
        }))
        .filter((event) => {
          const eventDate = event.normalizedDate;
          return (
            !Number.isNaN(eventDate.getTime()) &&
            eventDate >= today &&
            event.status?.toLowerCase() !== 'archived'
          );
        })
        .sort((a, b) => a.normalizedDate - b.normalizedDate);

      const activeMinistries = Array.isArray(ministriesRes.data) ? ministriesRes.data.filter(m => m.status !== 'Deactive').length : 0;

      setStats({
        memberCount: Array.isArray(membersRes.data) ? membersRes.data.length : 0,
        attendanceCount: Array.isArray(attendanceRes.data) ? attendanceRes.data.length : 0,
        eventCount: allEvents.length,
        ministryCount: activeMinistries
      });

      setNextEvent(upcomingEvents[0] || null);
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
      const dailyReferences = [
        "John 3:16", "Jeremiah 29:11", "Romans 8:28", "Philippians 4:13", 
        "Proverbs 3:5-6", "Isaiah 41:10", "Matthew 11:28", "Joshua 1:9", 
        "2 Corinthians 5:17", "Galatians 5:22-23"
      ];
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const selectedRef = dailyReferences[dateSeed % dailyReferences.length];
      
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(selectedRef)}`);
      const data = await response.json();
      
      if (data.verses && data.verses.length > 0) {
        const combinedText = data.verses.map(v => v.text.trim()).join(" ");
        setDailyVerse({ text: combinedText, reference: data.reference });
      }
    } catch (err) {
      setDailyVerse({ text: "For God so loved the world...", reference: "John 3:16" });
    }
  };

    
  if (!user) return <div className="loading-screen">Authenticating...</div>;
  return (
    <div className="dashboard-wrapper">
      <nav className="top-nav">
        <div className="nav-left">
          <img src={churchLogo} alt="Church Logo" className="church-logo" />
          <div className="church-title">
            <h4 className="church-name">Free Believers in Christ Fellowship Inc.</h4>
            <small className="church-meta">{role} Portal • Taguig City</small>
          </div>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div ref={notificationsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={handleNotificationToggle}
              style={notificationToggleButtonStyle}
              aria-label="Toggle notifications"
            >
              🔔
              {notifications.length > 0 && (
                <span style={notificationBadgeStyle}>{notifications.length}</span>
              )}
            </button>
            {notificationsOpen && (
              <div style={notificationPopoverStyle} role="dialog" aria-label="Notifications panel">
                <div style={notificationHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>Notifications</strong>
                    {notifications.length > 0 && (
                      <button type="button" onClick={handleClearNotifications} style={notificationSmallButtonStyle}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => setNotificationsOpen(false)} style={notificationCloseButtonStyle} aria-label="Close notifications">
                    ×
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div style={notificationEmptyStyle}>No new notifications.</div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item.id)}
                      style={{
                        ...notificationItemStyle,
                        ...(expandedNotificationId === item.id ? notificationItemActiveStyle : {})
                      }}
                    >
                      <div style={notificationItemHeaderStyle}>
                        <div>
                          <div style={notificationItemTitleStyle}>{item.title}</div>
                          {item.source && <div style={notificationItemSourceStyle}>{item.source}</div>}
                        </div>
                        <span style={notificationTypeBadgeStyle}>{item.type === 'prayer' ? 'Prayer' : item.type === 'join-requests' ? 'Action' : item.type === 'ministry' ? 'Ministry' : 'Info'}</span>
                      </div>
                      <div style={notificationItemMessageStyle}>{item.message}</div>
                      {expandedNotificationId === item.id && (
                        <div style={notificationActionsStyle}>
                          {item.type === 'prayer' && (
                            <button onClick={(event) => { event.stopPropagation(); handleAcknowledgeNotification(item); }} style={notificationActionButtonStyle}>
                              Acknowledged
                            </button>
                          )}
                          {item.type === 'join-requests' && (
                            <button onClick={(event) => { event.stopPropagation(); handleReviewRequests(); }} style={notificationActionButtonStyle}>
                              Review requests
                            </button>
                          )}
                          {item.type === 'ministry' && (
                            <button onClick={(event) => { event.stopPropagation(); handleGoToMinistries(); }} style={notificationActionButtonStyle}>
                              Open ministries
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="admin-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <strong className="user-name">{user.firstName} {user.lastName}</strong>
              <span className="user-role">{role}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              style={profileAvatarButtonStyle}
              aria-label="Open profile"
            >
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} style={avatarImageStyle} />
              ) : (
                <span style={avatarInitialsStyle}>
                  {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                </span>
              )}
            </button>
          </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="logout-btn theme-toggle"
              title="Toggle theme"
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>

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
              title={tab.label}
              aria-current={currentTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="view-container">
          {currentTab === 'dashboard' && (
            <>
              <div className="bulletin-board">
                {isLeader && (
                  <>
                    <div className="responsive-kpi-grid">
                      <div className="kpi-card" style={kpiCardStyle}>
                        <div style={kpiLabelStyle}>TOTAL MEMBERS</div>
                        <div style={kpiValueStyle}>{stats.memberCount}</div>
                      </div>
                      <div className="kpi-card" style={kpiCardStyle}>
                        <div style={kpiLabelStyle}>ACTIVE MINISTRIES</div>
                        <div style={kpiValueStyle}>{stats.ministryCount}</div>
                      </div>
                      <div className="kpi-card" style={kpiCardStyle}>
                        <div style={kpiLabelStyle}>TOTAL EVENTS</div>
                        <div style={kpiValueStyle}>{stats.eventCount}</div>
                      </div>
                      <div className="kpi-card" style={kpiCardStyle}>
                        <div style={kpiLabelStyle}>TOTAL ATTENDANCE</div>
                        <div style={kpiValueStyle}>{stats.attendanceCount}</div>
                      </div>
                    </div>
                  
                    <div className="leader-input-card" style={leaderInputCard}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>📢 Update Bulletin Announcement</h4>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input 
                          className="leader-input"
                          style={inputStyle} 
                          placeholder="Type a message for all members..." 
                          value={newAnnouncement}
                          onChange={(e) => setNewAnnouncement(e.target.value)}
                        />
                        <button className="post-btn" onClick={postAnnouncement} style={postBtnStyle}>Sync Bulletin</button>
                      </div>
                    </div>
                  </>
                )}

                <div className="responsive-grid-2-1">
                  <div className="bulletin-card" style={bulletinCardStyle}>
                    <h2 style={{ color: '#1e3a8a', marginTop: 0 }}>Community Bulletin</h2>
                    <div className="announcement-box" style={announcementBoxStyle}>
                        <p>{announcement}</p>
                      </div>
                    
                      <div className="daily-verse" style={{ marginTop: '20px', padding: '15px', background: '#eef2ff', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                        <small style={{ fontWeight: '700', color: '#1e40af' }}>📖 Daily Verse</small>
                        <p style={{ margin: '8px 0 0 0', color: '#0f172a', lineHeight: '1.5' }}>{dailyVerse.text}</p>
                        <cite style={{ fontSize: '13px', color: '#6b7280' }}>— {dailyVerse.reference}</cite>
                      </div>
                  </div>

                  <div className="bulletin-card bulletin-card-accent" style={{ ...bulletinCardStyle, background: '#1e293b', color: '#fff' }}>
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

              <div className="services-card" style={{ marginTop: '30px', padding: '30px', background: '#f8fafc', borderRadius: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a' }}>Service Times</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
                  <li style={{ padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px solid #e6eef8' }}>Sunday Morning Worship — 9:00 AM</li>
                  <li style={{ padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px solid #e6eef8' }}>Sunday Evening Service — 5:00 PM</li>
                  <li style={{ padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px solid #e6eef8' }}>Midweek Service (Wednesday) — 7:00 PM</li>
                  <li style={{ padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px solid #e6eef8' }}>Youth Fellowship (Friday) — 6:30 PM</li>
                  <li style={{ padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px solid #e6eef8' }}>Daily Morning Prayer — 6:00 AM</li>
                </ul>
              </div>
            </>
          )}

          {currentTab === 'ebible' && <EBible />}
          {currentTab === 'profile' && <Profile userId={user._id} currentUserId={user._id} />}
          {currentTab === 'members' && hasPermission(role, 'members') && <MemberForm />}
          {currentTab === 'events' && hasPermission(role, 'events') && <EventTab role={role} userId={user._id} />}
          {currentTab === 'attendance' && hasPermission(role, 'attendance') && <AttendanceTab role={role} userId={user._id} user={user} />}
          {currentTab === 'ministries' && hasPermission(role, 'ministries') && <Ministries role={role} user={user} />}
          {currentTab === 'prayers' && hasPermission(role, 'prayers') && <Prayers role={role} user={user} />}
          {currentTab === 'advising' && hasPermission(role, 'advising') && <Advising role={role} user={user} />}
          {currentTab === 'finances' && hasPermission(role, 'finances') && <Finances role={role} userId={user._id} user={user} />}
          {currentTab === 'analytics' && canViewAnalytics(role) && <Analytics />}
          {currentTab === 'inventory' && canViewInventory(role) && <InventoryForm />}
        </div>
      </div>
    </div>
  );
};

const bulletinCardStyle = { background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const announcementBoxStyle = { background: '#f8fafc', padding: '25px', borderRadius: '16px', borderLeft: '5px solid var(--color-accent)', fontSize: '19px', color: '#1e293b', margin: '20px 0' };
const leaderInputCard = { background: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '2px solid rgba(34,197,94,0.12)', marginBottom: '20px' };
const kpiCardStyle = { background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' };
const kpiLabelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const kpiValueStyle = { fontSize: '24px', fontWeight: '800', marginTop: '8px', color: '#0f172a' };
const inputStyle = { flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' };
const postBtnStyle = { background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' };
const profileAvatarButtonStyle = { width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const avatarImageStyle = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' };
const avatarInitialsStyle = { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary)', color: '#fff', borderRadius: '#50%', fontWeight: '700' };

const notificationToggleButtonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '14px',
  background: '#ffffff',
  color: '#0f172a',
  padding: '10px 14px',
  fontSize: '16px',
  cursor: 'pointer',
  position: 'relative'
};
const notificationBadgeStyle = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: '#ef4444',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: '700'
};
const notificationPopoverStyle = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 10px)',
  width: 'min(360px, calc(100vw - 32px))',
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: '480px',
  overflowY: 'auto',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '20px',
  boxShadow: '0 25px 60px rgba(15, 23, 42, 0.12)',
  zIndex: 1000,
  padding: '16px'
};
const notificationHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' };
const notificationSmallButtonStyle = { border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', padding: '6px 10px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' };
const notificationCloseButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', fontSize: '18px', cursor: 'pointer' };
const notificationEmptyStyle = { color: '#64748b', padding: '18px 0', textAlign: 'center' };
const notificationItemStyle = { borderRadius: '16px', border: '1px solid transparent', padding: '14px', marginBottom: '12px', cursor: 'pointer' };
const notificationItemActiveStyle = { background: '#f8fafc', borderColor: '#cbd5e1' };
const notificationItemHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' };
const notificationItemTitleStyle = { fontWeight: 700, fontSize: '14px', color: '#0f172a' };
const notificationItemSourceStyle = { fontSize: '12px', color: '#64748b', marginTop: '4px' };
const notificationItemMessageStyle = { color: '#334155', fontSize: '13px', lineHeight: '1.5' };
const notificationActionsStyle = { marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' };
const notificationActionButtonStyle = { border: 'none', background: 'var(--color-primary)', color: '#fff', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 };
const notificationTypeBadgeStyle = { background: '#e2e8f0', color: '#475569', borderRadius: '999px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' };

export default Dashboard;