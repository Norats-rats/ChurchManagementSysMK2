import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { canManagePrayers } from '../../permissions';

const PrayerRequests = ({ user, role }) => {
  const [showModal, setShowModal] = useState(false);
  const [newRequestText, setNewRequestText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState('grid'); 
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [sortBy, setSortBy] = useState('newest'); 

  const categories = ["Health", "Career", "Financial", "Family", "Testimony", "Ministry", "Relationships", "Travel"];
  
  const loggedInId = user?._id || user?.id;
  const isAdminOrMinistry = canManagePrayers(role);

  useEffect(() => {
    fetchRequests();
  }, [loggedInId]); 

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getPrayers(loggedInId, role);
      const data = response.data;
      const formattedData = Array.isArray(data) ? data : [];
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
    if (submitting) return;
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
      userId: loggedInId, 
      tags: selectedCategories, 
      status: "Active",
      date: new Date().toISOString()
    };

    setSubmitting(true);
    try {
      const response = await api.submitPrayer(newEntry);
      if (response.status === 201 || response.status === 200) {
        await fetchRequests(); 
        setNewRequestText("");
        setSelectedCategories([]);
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error submitting prayer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPrayed = async (id) => {
    try {
      const response = await api.markAnswered(id, role);
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
      console.error("Error marking as prayed:", err);
    }
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    requests.forEach(r => {
      if (r.date) {
        yearsSet.add(new Date(r.date).getFullYear().toString());
      }
    });
    yearsSet.add(new Date().getFullYear().toString());
    
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    return requests.filter(r => {
      const isCreator = loggedInId && r.userId && String(loggedInId) === String(r.userId);
      if (!isCreator && !isAdminOrMinistry) return false;

      const dateObj = new Date(r.date);
      const reqMonth = dateObj.getMonth().toString();
      const reqYear = dateObj.getFullYear().toString();

      if (filterCategory !== 'All' && (!r.tags || !r.tags.includes(filterCategory))) return false;
      if (filterMonth !== 'All' && reqMonth !== filterMonth) return false;
      if (filterYear !== 'All' && reqYear !== filterYear) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [requests, filterCategory, filterMonth, filterYear, filterStatus, sortBy, loggedInId, isAdminOrMinistry]);

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', padding: '30px', borderRadius: '16px', width: '500px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    darkInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fcfcfc', color: '#1e293b', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' },
    btnPrimary: { padding: '12px 24px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    filterBar: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center' },
    select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', fontSize: '14px', outline: 'none' },
    chipGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', justifyContent: 'center' },
    chip: (isSelected) => ({
      padding: '8px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
      border: isSelected ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
      backgroundColor: isSelected ? 'rgba(22,163,74,0.06)' : 'white',
      color: isSelected ? 'var(--color-primary)' : '#64748b',
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
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
    th: { background: '#f1f5f9', padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' },
    td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b', verticalAlign: 'middle' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
            {isAdminOrMinistry ? "All Prayer Requests" : "Your Prayer Requests"}
          </h1>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            {isAdminOrMinistry ? "Reviewing church family needs" : "Keep track of your personal prayer requests"}
          </p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>+ Submit Prayer Request</button>
      </div>

      {/* Filter and View Options Toolbar */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Category:</span>
          <select style={styles.select} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Month:</span>
          <select style={styles.select} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="All">All Months</option>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
        </div>

        {/* Dynamically Populated Year Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Year:</span>
          <select style={styles.select} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="All">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status:</span>
          <select style={styles.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">Active & Unarchived</option>
            <option value="Active">Active</option>
            <option value="Answered">Answered</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Sort:</span>
          <select style={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('grid')} 
            style={{ padding: '6px 12px', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
          >
            Grid
          </button>
          <button 
            onClick={() => setViewMode('table')} 
            style={{ padding: '6px 12px', border: 'none', background: viewMode === 'table' ? 'white' : 'transparent', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
          >
            Tabular
          </button>
        </div>
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
                <button type="submit" disabled={submitting} style={{ ...styles.btnPrimary, flex: 1, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting} style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : filteredAndSortedRequests.length === 0 ? (
        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No prayer requests found matching filters.</p>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {filteredAndSortedRequests.map((r) => {
            const isCreator = loggedInId && r.userId && String(loggedInId) === String(r.userId);
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
                
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', minHeight: '60px' }}>
                  {r.text}
                </p>
                {r.aiResponse && (
                  <div style={{ backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #6366f1', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontStyle: 'italic', lineHeight: '1.5' }}>
                      <strong>✨ AI Prayer Assistant:</strong> {r.aiResponse}
                    </p>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    📅 {new Date(r.date).toLocaleDateString()}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {r.status === "Active" && isAdminOrMinistry && (
                      <button 
                        onClick={() => handleMarkPrayed(r._id)} 
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dcfce7', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Mark as Prayed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Requester</th>
              <th style={styles.th}>Request</th>
              <th style={styles.th}>Categories</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRequests.map((r) => {
              const isCreator = loggedInId && r.userId && String(loggedInId) === String(r.userId);
              return (
                <tr key={r._id} style={{ opacity: r.status === 'Answered' ? 0.65 : 1 }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ ...styles.avatar, width: '32px', height: '32px', fontSize: '12px' }}>{r.initial}</div>
                      <span style={{ fontWeight: '600' }}>{r.name} {isCreator && "(You)"}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, maxWidth: '300px' }}>{r.text}</td>
                  <td style={styles.td}>
                    {r.tags && r.tags.map(t => <span key={t} style={styles.tag('category')}>{t}</span>)}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.tag(r.status)}>{r.status}</span>
                  </td>
                  <td style={styles.td}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {r.status === "Active" && isAdminOrMinistry && (
                      <button 
                        onClick={() => handleMarkPrayed(r._id)} 
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dcfce7', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                      >
                        Mark as Prayed
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PrayerRequests;