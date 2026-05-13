import { useEffect, useState } from 'react';
import api from '../../api';

const Finances = ({ role, userId }) => {
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

  useEffect(() => {
    fetchFinances();
  }, [role, userId]);

  const fetchFinances = async () => {
    try {
      const response = await api.getFinances();
      const data = response.data;
      let filteredTransactions = data.transactions || [];
      
      if (role === 'Staff') {
        filteredTransactions = filteredTransactions.filter(t => t.addedBy === userId && t.type === 'Income');
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
      type: 'Income',
      amount: parseFloat(newAmount),
      date: newDate
    };

    try {
      const res = await api.addFinanceRecord(transactionData);
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
    tableWrapper: { background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f1f5f9', padding: '15px', textAlign: 'left', fontSize: '12px', color: '#475569' },
    td: { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  };

  if (loading) return <div style={styles.container}>Loading finances...</div>;

  return (
    <div style={styles.container}>
      <header style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#053476' }}>
          {role === 'Member' ? 'My Contributions' : 'Financial Records'}
        </h2>
        <p style={{ color: '#053476' }}>
          {role === 'Member' ? 'Your history of support for the church' : 'Tracking church financial health'}
        </p>
      </header>

      {role !== 'Member' && (
        <div style={styles.statsGrid}>
          <div style={styles.card}>
            <span style={styles.label}>Total Church Income</span>
            <div style={{ ...styles.amount, color: '#059669' }}>
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

      {(role === 'Admin' || role === 'Staff') && (
        <div style={{ ...styles.card, marginBottom: '30px' }}>
          <h4 style={{ marginTop: 0 }}>Record New Income</h4>
          <form onSubmit={handleAddIncome} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
            <input 
              type="number" 
              placeholder="Amount" 
              value={newAmount} 
              onChange={e => setNewAmount(e.target.value)} 
              style={{ width: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
            />
            <button 
              type="submit" 
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
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
                <th style={{ ...styles.th, textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td style={styles.td}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{t.description}</td>
                  {role !== 'Member' && <td style={styles.td}>{t.type}</td>}
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
          {transactions.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              No transactions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Finances;