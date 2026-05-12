import { useEffect, useState } from 'react';
import api from '../../api';

const PrayerRequests = ({ user, role }) => {
  const [showModal, setShowModal] = useState(false);
  const [newRequestText, setNewRequestText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ["Health", "Career", "Financial", "Family", "Testimony", "Ministry", "Relationships", "Travel"];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.getPrayers();
      const data = response.data;
      
      const formattedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        praying: item.prayingCount || 0 
      })) : [];

      setRequests(formattedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching prayers:", err);
      setLoading(false);
    }
  };

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(item => item !== cat));
    } else {
      if (selectedCategories.length < 4) {
        setSelectedCategories([...selectedCategories, cat]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRequestText.trim() || selectedCategories.length === 0) {
      return alert("Please provide a request and at least one category.");
    }

    const userInitial = user?.firstName && user?.lastName 
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() 
      : "??";
    const userName = user?.firstName ? `${user.firstName} ${user.lastName}` : "Anonymous";

    const newEntry = {
      name: userName, 
      initial: userInitial,
      text: newRequestText,
      userId: user?._id || user?.id, 
      tags: selectedCategories, 
      status: "Active",
      prayingCount: 0, 
      date: new Date().toISOString()
    };

    try {
      const response = await api.submitPrayer(newEntry);
      if (response.status === 201 || response.status === 200) {
        fetchRequests(); 
        setNewRequestText("");
        setSelectedCategories([]);
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error submitting prayer:", err);
    }
  };

  const handlePraying = async (id) => {
    try {
      const response = await api.incrementPraying(id);
      if (response.status === 200) {
        setRequests(requests.map(r => 
            r._id === id ? { ...r, praying: (r.praying || 0) + 1 } : r
        ));
      }
    } catch (err) {
      console.error("Error updating prayer count:", err);
    }
  };

  const handleMarkAnswered = async (id) => {
    try {
      const response = await api.markAnswered(id);
      if (response.status === 200) {
        setRequests(prevRequests => 
          prevRequests.map(item => 
            item._id === id ? { ...item, status: "Answered" } : item
          )
        );
      } else {
        alert("Failed to update status on server.");
      }
    } catch (err) {
      console.error("Error marking as answered:", err);
    }
  };

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', padding: '30px', borderRadius: '16px', width: '500px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    darkInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fcfcfc', color: '#1e293b', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' },
    btnPrimary: { padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    chipGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', justifyContent: 'center' },
    chip: (isSelected) => ({
      padding: '8px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
      backgroundColor: isSelected ? '#eff6ff' : 'white',
      color: isSelected ? '#2563eb' : '#64748b',
      fontWeight: isSelected ? '700' : '500',
      transition: 'all 0.2s ease'
    }),
    requestCard: (status) => ({ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
        opacity: status === 'Answered' ? 0.65 : 1, 
        transition: 'all 0.3s ease'
    }),
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    tag: (type) => ({
      padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', marginRight: '6px',
      backgroundColor: type === 'Active' ? '#eff6ff' : type === 'Answered' ? '#dcfce7' : '#f1f5f9',
      color: type === 'Active' ? '#2563eb' : type === 'Answered' ? '#16a34a' : '#475569',
      textTransform: 'uppercase'
    })
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Prayer Requests</h1>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>Connect with the church through prayer</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>+ Submit Prayer Request</button>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#1e293b' }}>New Prayer Request</h2>
            <form onSubmit={handleSubmit}>
              <textarea 
                style={{ ...styles.darkInput, height: '120px', resize: 'none' }} 
                value={newRequestText}
                onChange={(e) => setNewRequestText(e.target.value)}
                placeholder="What can we pray for today?"
              />
              <div style={styles.chipGrid}>
                {categories.map(cat => (
                  <div key={cat} style={styles.chip(selectedCategories.includes(cat))} onClick={() => toggleCategory(cat)}>{cat}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>Submit</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {loading ? (
          <p>Loading...</p>
        ) : requests.map((r) => {
          const loggedInId = user?._id || user?.id;
          const isCreator = loggedInId && r.userId && String(loggedInId) === String(r.userId);
          const isAdminOrMinistry = role === 'Admin' || role === 'Ministry Leader';

          return (
            <div key={r._id} style={styles.requestCard(r.status)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={styles.avatar}>{r.initial}</div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>
                        {r.name} {isCreator && <span style={{color: '#2563eb', fontSize: '12px', marginLeft: '5px'}}>(You)</span>}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={styles.tag(r.status)}>{r.status}</span>
                      {r.tags && r.tags.map(t => <span key={t} style={styles.tag('category')}>{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', minHeight: '60px' }}>{r.text}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  📅 {new Date(r.date).toLocaleDateString()} • 👥 {r.praying} praying
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  
                  {r.status === "Active" && (
                    <button 
                      onClick={() => handlePraying(r._id)} 
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dbeafe', color: '#2563eb', background: '#eff6ff', cursor: 'pointer', fontWeight: '600' }}
                    >
                      I'm Praying
                    </button>
                  )}
                  
                  {r.status === "Active" && isAdminOrMinistry && (
                    <button 
                      onClick={() => handleMarkAnswered(r._id)} 
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dcfce7', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Mark Answered
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrayerRequests;