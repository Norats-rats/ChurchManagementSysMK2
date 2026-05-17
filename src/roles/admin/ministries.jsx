import { useEffect, useState } from 'react';

const API_BASE_RAW = import.meta.env.VITE_API_URL;
const API_BASE = API_BASE_RAW.endsWith('/') ? API_BASE_RAW.slice(0, -1) : API_BASE_RAW;

const Ministries = ({ role }) => {
  const [ministryList, setMinistryList] = useState([]);
  const [leaderOptions, setLeaderOptions] = useState([]);
  const [allMembers, setAllMembers] = useState([]); 
  const [expandedId, setExpandedId] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editLeaderData, setEditLeaderData] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const [formData, setFormData] = useState({ 
    name: '', 
    leader: '', 
    color: '#2563eb'
  });

  const canManage = role === 'Admin' || role === 'Ministry Leader';

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
      const minRes = await fetch(`${API_BASE}/api/ministries`);
      if (!minRes.ok) throw new Error("Failed to fetch ministries");
      const minData = await minRes.json();
      setMinistryList(Array.isArray(minData) ? minData : []);

      const userRes = await fetch(`${API_BASE}/api/members`);
      if (!userRes.ok) throw new Error("Failed to fetch members");
      const userData = await userRes.json();
      
      const parsedMembers = Array.isArray(userData) ? userData : [];
      setAllMembers(parsedMembers); 

      const filteredLeaders = parsedMembers.filter(
        u => u.role === 'Ministry Leader' || u.role === 'Ministry'
      );
      setLeaderOptions(filteredLeaders);

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setSelectedMemberId('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const submissionData = {
        ...formData,
        members: 0,
        status: 'Active'
      };

      const res = await fetch(`${API_BASE}/api/ministries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ name: '', leader: '', color: '#2563eb' });
        fetchInitialData();
      }
    } catch (err) { 
      alert("Network error. Check your server connection."); 
    }
  };

  const handleUpdateLeader = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/ministries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leader: editLeaderData }) 
      });
      if (res.ok) { 
        setEditingId(null); 
        fetchInitialData(); 
      }
    } catch (err) { alert("Leader update failed"); }
  };

  const handleToggleStatus = async (ministry) => {
    const nextStatus = ministry.status === 'Deactive' ? 'Active' : 'Deactive';
    const actionText = nextStatus === 'Deactive' ? 'deactivate' : 'activate';
    
    if (window.confirm(`Are you sure you want to ${actionText} this ministry?`)) {
      try {
        const res = await fetch(`${API_BASE}/api/ministries/${ministry._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) fetchInitialData();
      } catch (err) { alert("Failed to modify ministry status"); }
    }
  };

  const handleAddMember = async (memberId, ministryName) => {
    if (!memberId) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ministry: ministryName })
      });
      if (res.ok) {
        setSelectedMemberId('');
        fetchInitialData();
      }
    } catch (err) { alert("Failed to add member"); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member from the ministry?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ministry: '' }) 
      });
      if (res.ok) fetchInitialData();
    } catch (err) { alert("Failed to remove member"); }
  };

  if (loading) return <div style={{padding: '40px'}}>Connecting to database...</div>;

  const unassignedMembers = allMembers.filter(m => !m.ministry);

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>
            {canManage ? "Ministry Management" : "Available Ministries"}
        </h2>
        {canManage && (
          <button 
            style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
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
                style={inputStyle} 
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
              <input type="color" style={{ height: '40px', width: '100%' }} value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
            </div>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
            <button type="submit" style={btnSubmit}>Save Ministry</button>
            <button type="button" onClick={() => setShowCreateForm(false)} style={btnCancel}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {ministryList.map((m) => {
          const ministryMembers = allMembers.filter(member => 
            member.ministry && m.name && member.ministry.trim().toLowerCase() === m.name.trim().toLowerCase()
          );
          const isExpanded = expandedId === m._id;

          return (
            <div key={m._id} style={{ borderTop: `6px solid ${m.color}`, background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              
              <div>
                <div 
                  onClick={() => toggleDropdown(m._id)} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', userSelect: 'none' }}
                >
                  <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }}>
                      ▼
                    </span>
                    {m.name}
                  </h3>
                  {m.status === 'Deactive' && <span style={inactivePill}>INACTIVE</span>}
                </div>
                
                {canManage && editingId === m._id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginLeft: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>UPDATE LEADER</label>
                    <select 
                      style={inputStyle} 
                      value={editLeaderData} 
                      onChange={e => setEditLeaderData(e.target.value)}
                    >
                      <option value="">Select a Leader</option>
                      {leaderOptions.map(leader => (
                        <option key={leader._id} value={`${leader.firstName} ${leader.lastName}`}>
                          {leader.firstName} {leader.lastName}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => handleUpdateLeader(m._id)} style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 15px 20px' }}>Led by {m.leader}</p>
                )}
                
                <div style={cardFooter}>
                  <span>Members: <strong>{ministryMembers.length}</strong></span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ASSIGNED ({ministryMembers.length})
                    </h4>
                    
                    {ministryMembers.length === 0 ? (
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No members added yet.</p>
                    ) : (
                      <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                        {ministryMembers.map(member => (
                          <li key={member._id} style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span><strong>{member.firstName} {member.lastName}</strong></span>
                              {canManage && (
                                <button 
                                  onClick={() => handleRemoveMember(member._id)} 
                                  style={removeMemberLink}
                                  title="Remove member from ministry"
                                >
                                  ✕ Remove
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {canManage && (
                      <div style={{ display: 'flex', gap: '6px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '4px' }}>
                        <select 
                          style={{ ...inputStyle, padding: '6px', fontSize: '12px', flex: 1 }}
                          value={selectedMemberId}
                          onChange={e => setSelectedMemberId(e.target.value)}
                        >
                          <option value="">+ Add Member</option>
                          {unassignedMembers.map(mem => (
                            <option key={mem._id} value={mem._id}>
                              {mem.firstName} {mem.lastName}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => handleAddMember(selectedMemberId, m.name)}
                          style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }}
                          disabled={!selectedMemberId}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {canManage && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  {editingId === m._id ? (
                    <button style={btnSecondary} onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}>Cancel Edit</button>
                  ) : (
                    <button style={btnSecondary} onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(m._id); 
                      setEditLeaderData(m.leader);
                    }}>Edit</button>
                  )}
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(m);
                    }} 
                    style={m.status === 'Deactive' ? btnActivate : btnDeactivate}
                  >
                    {m.status === 'Deactive' ? 'Activate' : 'Deactivate'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formStyle = { background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e2e8f0' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' };
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #085dc3', backgroundColor: 'white' };
const btnSubmit = { padding: '12px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnCancel = { padding: '12px 20px', backgroundColor: '#d20700', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const btnPrimary = { padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' };

const btnDeactivate = { ...btnSecondary, color: '#ef4444', borderColor: '#fecaca' };
const btnActivate = { ...btnSecondary, color: '#10b981', borderColor: '#a7f3d0' };

const removeMemberLink = { background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', padding: 0 };
const inactivePill = { fontSize: '10px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' };
const cardFooter = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px 0', borderTop: '1px solid #f1f5f9', marginTop: '10px' };

export default Ministries;