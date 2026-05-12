import { useEffect, useState } from 'react';

const API_BASE_RAW = import.meta.env.VITE_API_URL
const API_BASE = API_BASE_RAW.endsWith('/') ? API_BASE_RAW.slice(0, -1) : API_BASE_RAW;

const Ministries = ({ role }) => {
  const [ministryList, setMinistryList] = useState([]);
  const [leaderOptions, setLeaderOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', schedule: '', status: '' });
  const [formData, setFormData] = useState({ 
    name: '', 
    leader: '', 
    members: 0, 
    schedule: '', 
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
      
      const filteredLeaders = Array.isArray(userData) 
        ? userData.filter(u => u.role === 'Ministry Leader' || u.role === 'Ministry')
        : [];
      setLeaderOptions(filteredLeaders);

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const submissionData = {
        ...formData,
        members: Number(formData.members)
      };

      const res = await fetch(`${API_BASE}/api/ministries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ name: '', leader: '', members: 10, schedule: '', color: '#2563eb' });
        fetchInitialData();
      }
    } catch (err) { 
      alert("Network error. Check your server connection."); 
    }
  };

  const handleUpdate = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/ministries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData) 
      });
      if (res.ok) { 
        setEditingId(null); 
        fetchInitialData(); 
      }
    } catch (err) { alert("Update failed"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this ministry?")) {
      try {
        const res = await fetch(`${API_BASE}/api/ministries/${id}`, { method: 'DELETE' });
        if (res.ok) fetchInitialData();
      } catch (err) { alert("Delete failed"); }
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "TBD";
    if (!timeStr.includes(':')) return timeStr;
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) return <div style={{padding: '40px'}}>Connecting to database...</div>;

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
              <label style={labelStyle}>Meeting Time</label>
              <input type="time" style={inputStyle} value={formData.schedule} onChange={e => setFormData({...formData, schedule: e.target.value})} required />
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
        {ministryList.map((m) => (
          <div key={m._id} style={{ borderTop: `6px solid ${m.color}`, background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            {canManage && editingId === m._id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input style={inputStyle} value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                <input type="time" style={inputStyle} value={editFormData.schedule} onChange={e => setEditFormData({...editFormData, schedule: e.target.value})} />
                <select style={inputStyle} value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Deactive">Deactive</option>
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleUpdate(m._id)} style={btnPrimary}>Save</button>
                  <button onClick={() => setEditingId(null)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0 }}>{m.name}</h3>
                  {m.status === 'Deactive' && <span style={inactivePill}>INACTIVE</span>}
                </div>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Led by {m.leader}</p>
                <div style={cardFooter}>
                  <span>Members: <strong>{m.members}</strong></span>
                  <span>🕒 {formatTime(m.schedule)}</span>
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button onClick={() => {
                      setEditingId(m._id); 
                      setEditFormData({ name: m.name, schedule: m.schedule, status: m.status || 'Active' });
                    }} style={btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(m._id)} style={btnDelete}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const formStyle = { background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e2e8f0' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' };
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #085dc3' };
const btnSubmit = { padding: '12px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnCancel = { padding: '12px 20px', backgroundColor: '#d20700', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const btnPrimary = { padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' };
const btnDelete = { ...btnSecondary, color: '#ef4444', borderColor: '#fecaca' };
const inactivePill = { fontSize: '10px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' };
const cardFooter = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px 0', borderTop: '1px solid #f1f5f9', marginTop: '10px' };

export default Ministries;