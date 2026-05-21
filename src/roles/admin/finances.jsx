import { useEffect, useState } from 'react';
import api from '../../api';

const Finances = ({ role, userId, user }) => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState('Income');

  useEffect(() => {
    fetchFinances();
  }, [role, userId]);

  const fetchFinances = async () => {
    try {
      const response = await api.getFinances(userId, role);
      const data = response.data;
      let filteredTransactions = data.transactions || [];
      
      if (role === 'Staff') {
        filteredTransactions = filteredTransactions.filter(t => t.addedBy === userId);
      } else if (role === 'Member') {
        filteredTransactions = filteredTransactions.filter(t => t.userId === userId);
      }

      setTransactions(filteredTransactions);
      setStats(data.stats || { totalIncome: 0, totalExpenses: 0, netBalance: 0 });
      setLoading(false);
    } catch (err) {
      console.error("Error fetching finances:", err);
      setLoading(false);
    }
  };

  

  const handleAddIncome = async (e) => {
    e.preventDefault();
    const transactionData = {
      description: newDesc,
      type: newType,
      amount: parseFloat(newAmount),
      date: newDate
    };

    try {
      const res = await api.addFinanceRecord(transactionData, role, userId, `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
      if (res.status === 200 || res.status === 201) {
        setNewDesc("");
        setNewAmount("");
        fetchFinances();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to record income.");
    }
  };

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
    label: { color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'block' },
    amount: { fontSize: '28px', fontWeight: '800', color: '#1e293b' },
    actionCard: { padding: '30px', borderRadius: '16px', background: 'white', border: '2px solid #e2e8f0', textAlign: 'center', transition: 'all 0.2s' },
    tableWrapper: { background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f1f5f9', padding: '15px', textAlign: 'left', fontSize: '12px', color: '#475569' },
    td: { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    
  };

  if (loading) return <div style={styles.container}>Loading finances...</div>;

  return (
    <div style={styles.container}>
      <header style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Financial Records</h2>
        <p style={{ color: 'var(--color-primary)' }}>Tracking church financial health and recorded transactions</p>
      </header>

      {role !== 'Member' && (
        <div style={styles.statsGrid}>
          <div style={styles.card}>
            <span style={styles.label}>Total Church Income</span>
            <div style={{ ...styles.amount, color: 'var(--color-accent)' }}>
              ₱{stats.totalIncome.toLocaleString()}
            </div>
          </div>
          {(role === 'Admin' || role === 'Ministry Leader') && (
            <div style={styles.card}>
              <span style={styles.label}>Net Balance</span>
              <div style={styles.amount}>
                ₱{stats.netBalance.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      

      {(['Admin','Staff','Ministry Leader'].includes(role)) && (
        <div style={{ ...styles.card, marginBottom: '30px' }}>
          <h4 style={{ marginTop: 0 }}>Record New Transaction</h4>
          <form onSubmit={handleAddIncome} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)} 
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
            />
            <input 
              type="text" 
              placeholder="Description" 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
              style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
            />
            <select value={newType} onChange={e => setNewType(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            <input 
              type="number" 
              placeholder="Amount" 
              value={newAmount} 
              onChange={e => setNewAmount(e.target.value)} 
              style={{ width: '140px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
            />
            <button 
              type="submit" 
              style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Add Record
            </button>
          </form>
        </div>
      )}

      {(role !== 'Member' || transactions.length > 0) && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>DATE</th>
                <th style={styles.th}>DESCRIPTION</th>
                {role !== 'Member' && <th style={styles.th}>TYPE</th>}
                  <th style={styles.th}>LOGGED BY</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td style={styles.td}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{t.description}</td>
                  {role !== 'Member' && <td style={styles.td}>{t.type}</td>}
                  <td style={{ ...styles.td, color: '#475569', fontSize: '13px' }}>{t.addedByName || t.addedBy || t.userId || '-'}</td>
                  <td style={{ 
                    ...styles.td, 
                    textAlign: 'right', 
                    fontWeight: 'bold', 
                    color: t.type === 'Income' ? '#059669' : '#dc2626' 
                  }}>
                    ₱{t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Finances;