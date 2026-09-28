import { useEffect, useState } from 'react';
import { useFeedbackModal } from '../../components/shared/feedbackmodal';
import { canManageMinistries } from '../../permissions';

const API_BASE_RAW = import.meta.env.VITE_API_URL;
const API_BASE_WITH_PROTOCOL = API_BASE_RAW && /^https?:\/\//i.test(API_BASE_RAW)
  ? API_BASE_RAW
  : API_BASE_RAW
    ? `https://${API_BASE_RAW}`
    : API_BASE_RAW;
const API_BASE = API_BASE_WITH_PROTOCOL?.endsWith('/') ? API_BASE_WITH_PROTOCOL.slice(0, -1) : API_BASE_WITH_PROTOCOL;

const Ministries = ({ role, user }) => {
  const [ministryList, setMinistryList] = useState([]);
  const [leaderOptions, setLeaderOptions] = useState([]);
  const [allMembers, setAllMembers] = useState([]); 
  const [selectedMinistry, setSelectedMinistry] = useState(null); 
  const [activeTab, setActiveTab] = useState('feed'); 
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [editLeaderData, setEditLeaderData] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const { showFeedback, askConfirmation, FeedbackModal } = useFeedbackModal();

  const [formData, setFormData] = useState({ 
    name: '', 
    leader: '', 
    color: '#2563eb'
  });

  const canManage = canManageMinistries(role);
  const userFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toLowerCase();
  const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  const normalizeMemberMinistries = (member) => {
    if (Array.isArray(member?.ministries)) return member.ministries;
    if (member?.ministry) return [member.ministry];
    return [];
  };

  useEffect(() => {
    fetchInitialData();
  }, [role]);

  const fetchInitialData = async () => {
    if (!API_BASE) {
      console.error("API_URL is not defined in environment variables");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const minRes = await fetch(`${API_BASE}/api/ministries`, {
        headers: { 'x-user-role': role }
      });
      if (!minRes.ok) throw new Error("Failed to fetch ministries");
      const minData = await minRes.json();
      const rawList = Array.isArray(minData) ? minData : [];
      
      setMinistryList(rawList);

      const userRes = await fetch(`${API_BASE}/api/members`);
      if (!userRes.ok) throw new Error("Failed to fetch members");
      const userData = await userRes.json();
      
      const parsedMembers = Array.isArray(userData) ? userData : [];
      setAllMembers(parsedMembers); 

      const filteredLeaders = parsedMembers.filter(
        u => u.role === 'Ministry Leader' || u.role === 'Ministry'
      );
      setLeaderOptions(filteredLeaders);

      if (selectedMinistry) {
        const updatedCurrent = rawList.find(m => m._id === selectedMinistry._id);
        if (updatedCurrent) setSelectedMinistry(updatedCurrent);
      }

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const submissionData = { ...formData, members: 0, status: 'Active' };
      const res = await fetch(`${API_BASE}/api/ministries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ name: '', leader: '', color: '#2563eb' });
        fetchInitialData();
        showFeedback('Ministry created successfully.');
      }
    } catch (err) {
      showFeedback("Network error. Check your server connection.");
    }
  };

  const handleUpdateLeader = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/ministries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName
        },
        body: JSON.stringify({ leader: editLeaderData }) 
      });
      if (res.ok) {
        fetchInitialData(); 
        showFeedback('Ministry leader updated successfully.');
      }
    } catch (err) { showFeedback("Leader update failed"); }
  };

  const handleToggleStatus = async (ministry) => {
    const nextStatus = ministry.status === 'Archived' ? 'Active' : 'Archived';
    const actionText = nextStatus === 'Archived' ? 'archive' : 'restore';
    
    askConfirmation(`Are you sure you want to ${actionText} this ministry?`, async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ministries/${ministry._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': role,
            'x-user-name': userName
          },
          body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) { 
          await fetchInitialData(); 
          showFeedback(`Ministry ${actionText === 'archive' ? 'archived' : 'restored'} successfully.`); 
        }
      } catch (err) { showFeedback("Failed to modify ministry status"); }
    });
  };

  const handleAddMember = async (memberId, ministryName) => {
    if (!memberId) return;
    try {
      const member = allMembers.find(m => m._id === memberId);
      const currentMinistries = normalizeMemberMinistries(member);
      const nextMinistries = currentMinistries.includes(ministryName)
        ? currentMinistries
        : [...currentMinistries, ministryName];
      const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName
        },
        body: JSON.stringify({ ministries: nextMinistries, ministry: nextMinistries[0] || 'None' })
      });
      if (res.ok) {
        setSelectedMemberId('');
        fetchInitialData();
        showFeedback('Member added to ministry successfully.');
      }
    } catch (err) { showFeedback("Failed to add member"); }
  };

  const handleRemoveMember = async (memberId, ministryName) => {
    askConfirmation("Are you sure you want to remove this member from the ministry?", async () => {
      try {
        const member = allMembers.find(m => m._id === memberId);
        const currentMinistries = normalizeMemberMinistries(member);
        const nextMinistries = currentMinistries.filter(name => name !== ministryName);
        const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': role,
            'x-user-name': userName
          },
          body: JSON.stringify({ ministries: nextMinistries, ministry: nextMinistries[0] || 'None' })
        });
        if (res.ok) { 
          await fetchInitialData(); 
          showFeedback('Member removed from ministry successfully.'); 
        }
      } catch (err) { showFeedback("Failed to remove member"); }
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnnouncementFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  const submitAnnouncement = async (ministry) => {
    try {
      if (!announcementText.trim() && !announcementFile) {
        showFeedback('Please enter text or upload a file for the announcement.');
        return;
      }

      let res;
      if (announcementFile) {
        const bodyData = new FormData();
        bodyData.append('announcementText', announcementText.trim());
        bodyData.append('author', userName);
        bodyData.append('attachment', announcementFile);

        res = await fetch(`${API_BASE}/api/ministries/${ministry._id}/announcement`, {
          method: 'POST',
          headers: {
            'x-user-role': role,
            'x-user-name': userName
          },
          body: bodyData
        });
      } else {
        res = await fetch(`${API_BASE}/api/ministries/${ministry._id}/announcement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': role,
            'x-user-name': userName
          },
          body: JSON.stringify({ announcementText: announcementText.trim(), author: userName })
        });
      }

      if (!res.ok) throw new Error('Announcement save failed');
      setAnnouncementText('');
      setAnnouncementFile(null);
      setFilePreview(null);
      await fetchInitialData();
      showFeedback('Announcement posted to this ministry space.');
    } catch (err) {
      console.error(err);
      showFeedback('Failed to post ministry announcement.');
    }
  };

  const applyToJoin = async (ministry) => {
    if (!user || requestInProgress) return;
    setRequestInProgress(true);
    try {
      const res = await fetch(`${API_BASE}/api/ministries/${ministry._id}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName
        },
        body: JSON.stringify({ userId: user._id, userName, userRole: role })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Join request failed');
      }
      await fetchInitialData();
      showFeedback('Join request submitted. Ministry leaders will review it.');
    } catch (err) {
      console.error(err);
      showFeedback(err.message || 'Unable to apply to join ministry.');
    } finally {
      setRequestInProgress(false);
    }
  };

  const updateJoinRequest = async (ministryId, requestId, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/ministries/${ministryId}/join-request/${requestId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName
        }
      });
      if (!res.ok) throw new Error('Request update failed');
      await fetchInitialData();
      showFeedback('Join request updated successfully.');
    } catch (err) {
      console.error(err);
      showFeedback('Unable to update ministry join request.');
    }
  };

  const visibleMinistries = ministryList.filter(m => {
    if (role === 'Ministry Leader') {
      return m.leader?.trim().toLowerCase() === userFullName;
    }
    return true;
  });

  if (loading) return <div style={{ padding: '40px' }}>Loading ministry workspace...</div>;

  if (selectedMinistry) {
    const m = selectedMinistry;
    const ministryMembers = allMembers.filter(member => {
      const memberMinistries = normalizeMemberMinistries(member);
      return memberMinistries.some(min => min && m.name && min.trim().toLowerCase() === m.name.trim().toLowerCase());
    });

    const isMyMinistryLeader = m.leader?.trim().toLowerCase() === userFullName;
    const canApproveRequests = isMyMinistryLeader;
    const canEditMinistry = isMyMinistryLeader;
    const pendingRequests = Array.isArray(m.joinRequests) ? m.joinRequests.filter(req => req.status === 'Pending') : [];

    const announcementsList = Array.isArray(m.announcements) && m.announcements.length > 0
      ? m.announcements 
      : (m.announcementText ? [{ _id: '1', text: m.announcementText, createdAt: m.updatedAt || new Date() }] : []);

    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <button 
          onClick={() => { setSelectedMinistry(null); setAnnouncementText(''); setAnnouncementFile(null); setFilePreview(null); }}
          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to All Ministries
        </button>

        {/* Banner Header */}
        <div style={{
          backgroundColor: m.color || '#2563eb',
          color: '#fff',
          padding: '32px 28px',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>{m.name}</h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '15px' }}>
            Led by <strong>{m.leader || 'No Assigned Leader'}</strong> • {ministryMembers.length} Members
          </p>
        </div>

        {/* Sub-Navigation Bar */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('feed')} 
            style={activeTab === 'feed' ? activeTabStyle : tabStyle}
          >
            📢 Stream & Updates
          </button>
          <button 
            onClick={() => setActiveTab('members')} 
            style={activeTab === 'members' ? activeTabStyle : tabStyle}
          >
            👥 Members ({ministryMembers.length})
          </button>
          {canApproveRequests && (
            <button 
              onClick={() => setActiveTab('requests')} 
              style={activeTab === 'requests' ? activeTabStyle : tabStyle}
            >
              📥 Join Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </button>
          )}
          {canEditMinistry && (
            <button 
              onClick={() => setActiveTab('settings')} 
              style={activeTab === 'settings' ? activeTabStyle : tabStyle}
            >
              ⚙️ Management
            </button>
          )}
        </div>

        {/* Tab 1: Stream & Announcements */}
        {activeTab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
            {isMyMinistryLeader && (
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1e293b' }}>Post an Announcement</h3>
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', boxSizing: 'border-box' }}
                  placeholder="Share updates, prayer items, or schedules with this ministry..."
                />

                {/* File/Image Upload Section */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                    Attach Image or File
                  </label>
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ fontSize: '13px' }}
                  />
                  {filePreview && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={filePreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => submitAnnouncement(m)}
                  style={{ marginTop: '14px', padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Publish Announcement
                </button>
              </div>
            )}

            {/* Announcement History List */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Announcement Stream</h3>
              
              {announcementsList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No announcements posted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {announcementsList.map((ann, idx) => {
                    const text = ann.text || ann.announcementText || (typeof ann === 'string' ? ann : '');
                    const fileUrl = ann.fileUrl || ann.imageUrl;
                    const isImage = fileUrl && (fileUrl.startsWith('data:image/') || fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i));

                    return (
                      <div key={ann._id || idx} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${m.color || '#2563eb'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>
                          <strong>{ann.author || m.leader || 'Ministry Leader'}</strong>
                          <span>{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                        
                        {text && (
                          <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.6', whitespace: 'pre-wrap' }}>
                            {text}
                          </p>
                        )}

                        {/* Display Attachment */}
                        {fileUrl && (
                          <div style={{ marginTop: '12px' }}>
                            {isImage ? (
                              <img 
                                src={fileUrl} 
                                alt="Announcement attachment" 
                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              />
                            ) : (
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '13px', fontWeight: 'bold' }}
                              >
                                📎 View Attached File
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Members List */}
        {activeTab === 'members' && (
          <div style={{ maxWidth: '800px' }}>
            {canEditMinistry && (
              <div style={{ ...cardStyle, marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>ADD NEW MEMBER</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    style={{ ...selectStyle, flex: 1 }}
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">Select a member to add...</option>
                    {allMembers
                      .filter(mem => {
                        const memberMinistries = normalizeMemberMinistries(mem);
                        return !memberMinistries.some(min => min && m.name && min.trim().toLowerCase() === m.name.trim().toLowerCase());
                      })
                      .map(mem => (
                        <option key={mem._id} value={mem._id}>
                          {mem.firstName} {mem.lastName} ({mem.role || 'Member'})
                        </option>
                      ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => handleAddMember(selectedMemberId, m.name)}
                    style={{ padding: '10px 18px', backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    disabled={!selectedMemberId}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Ministry Roster</h3>
              {ministryMembers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No members added to this ministry yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ministryMembers.map(member => (
                    <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <strong>{member.firstName} {member.lastName}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{member.role || 'Member'}</div>
                      </div>
                      {canEditMinistry && (
                        <button 
                          onClick={() => handleRemoveMember(member._id, m.name)} 
                          style={removeMemberLink}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Join Requests */}
        {activeTab === 'requests' && canApproveRequests && (
          <div style={{ maxWidth: '800px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Pending Join Applications</h3>
              {pendingRequests.length === 0 ? (
                <p style={{ color: '#64748b', margin: 0 }}>No pending join requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingRequests.map(req => (
                    <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <span><strong>{req.userName}</strong> ({req.userRole || 'Member'})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => updateJoinRequest(m._id, req._id, 'approve')}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateJoinRequest(m._id, req._id, 'reject')}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && canEditMinistry && (
          <div style={{ maxWidth: '800px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Ministry Settings</h3>
              
              {canManage && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Update Leader</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <select 
                      style={selectStyle} 
                      value={editLeaderData || m.leader || ''} 
                      onChange={e => setEditLeaderData(e.target.value)}
                    >
                      <option value="">Select a Leader</option>
                      {leaderOptions.map(leader => (
                        <option key={leader._id} value={`${leader.firstName} ${leader.lastName}`}>
                          {leader.firstName} {leader.lastName}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleUpdateLeader(m._id)}
                      style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Save Leader
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Ministry Status</label>
                <div style={{ marginTop: '8px' }}>
                  <button 
                    onClick={() => handleToggleStatus(m)} 
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      border: '1px solid',
                      backgroundColor: m.status === 'Archived' ? '#ecfdf5' : '#fef2f2',
                      color: m.status === 'Archived' ? '#059669' : '#dc2626',
                      borderColor: m.status === 'Archived' ? '#a7f3d0' : '#fecaca'
                    }}
                  >
                    {m.status === 'Archived' ? 'Restore Ministry' : 'Archive Ministry'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <FeedbackModal />
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>
            {role === 'Ministry Leader' ? "My Led Ministries" : canManage ? "Ministry Management" : "Available Ministries"}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Click on any ministry card to enter its workspace.
          </p>
        </div>
        {canManage && (
          <button 
            style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Close' : '+ Create Ministry'}
          </button>
        )}
      </div>

      {canManage && showCreateForm && (
        <form onSubmit={handleCreate} style={formStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>New Ministry Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={inputGroup}>
              <label style={labelStyle}>Ministry Name</label>
              <input style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>Ministry Leader</label>
              <select 
                style={selectStyle} 
                value={formData.leader} 
                onChange={e => setFormData({...formData, leader: e.target.value})} 
                required
              >
                <option value="">Select a Leader</option>
                {leaderOptions.map(leader => (
                  <option key={leader._id} value={`${leader.firstName} ${leader.lastName}`}>
                    {leader.firstName} {leader.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>Theme Color</label>
              <input 
                type="color" 
                style={{ height: '44px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', padding: '0', cursor: 'pointer' }} 
                value={formData.color} 
                onChange={e => setFormData({...formData, color: e.target.value})} 
              />
            </div>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
            <button type="submit" style={btnSubmit}>Save Ministry</button>
            <button type="button" onClick={() => setShowCreateForm(false)} style={btnCancel}>Cancel</button>
          </div>
        </form>
      )}

      {visibleMinistries.length === 0 ? (
        <div style={{ padding: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          No ministries found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {visibleMinistries.map((m) => {
            const ministryMembers = allMembers.filter(member => {
              const memberMinistries = normalizeMemberMinistries(member);
              return memberMinistries.some(min => min && m.name && min.trim().toLowerCase() === m.name.trim().toLowerCase());
            });
            const userMinistries = normalizeMemberMinistries(user);
            const normalizedUserMinistries = userMinistries.map(min => min.trim().toLowerCase());
            const isMemberOfThisMinistry = normalizedUserMinistries.includes(m.name?.trim().toLowerCase());
            const userExistingRequest = Array.isArray(m.joinRequests) ? m.joinRequests.find(req => req.userId === user?._id) : null;

            return (
              <div 
                key={m._id} 
                onClick={() => setSelectedMinistry(m)}
                style={{
                  ...classroomCardStyle,
                  borderTop: `8px solid ${m.color || '#2563eb'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>{m.name}</h3>
                  {m.status === 'Archived' && <span style={inactivePill}>ARCHIVED</span>}
                </div>

                <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 20px 0' }}>
                  Led by {m.leader || 'No Assigned Leader'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '13px', color: '#475569' }}>
                  <span>👥 {ministryMembers.length} Members</span>
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Open Space →</span>
                </div>

                {user && !isMemberOfThisMinistry && (role === 'Member' || role === 'Staff') && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}
                  >
                    <button
                      onClick={() => applyToJoin(m)}
                      disabled={requestInProgress || !!userExistingRequest?.status}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      {userExistingRequest ? (userExistingRequest.status === 'Pending' ? 'Request Pending' : 'Request Sent') : 'Apply to Join'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <FeedbackModal />
    </div>
  );
};

const formStyle = { background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e2e8f0' };
const cardStyle = { background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const classroomCardStyle = { 
  background: 'white', 
  padding: '20px', 
  borderRadius: '12px', 
  border: '1px solid #e2e8f0', 
  boxShadow: '0 2px 4px rgba(0,0,0,0.04)', 
  cursor: 'pointer', 
  transition: 'transform 0.15s ease, box-shadow 0.15s ease' 
};

const tabStyle = { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' };
const activeTabStyle = { ...tabStyle, borderBottom: '3px solid #2563eb', color: '#2563eb' };

const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' };
const inputStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#111' };
const selectStyle = { ...inputStyle, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer' };
const btnSubmit = { padding: '12px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnCancel = { padding: '12px 20px', backgroundColor: '#d20700', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const removeMemberLink = { background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
const inactivePill = { fontSize: '10px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' };

export default Ministries;