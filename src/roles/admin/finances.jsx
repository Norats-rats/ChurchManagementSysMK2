import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { canManageFinances } from '../../permissions';

const Finances = ({ role, userId, user }) => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0
  });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

      setAllTransactions(filteredTransactions);
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

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return allTransactions
      .filter((t) => {
        const dateValue = new Date(t.date);
        const typeMatches = filterType === 'All' || t.type === filterType;
        const textMatches = !normalizedSearch || [
          t.description,
          t.type,
          t.addedByName,
          t.addedBy,
          t.userId
        ].some((value) => value?.toString().toLowerCase().includes(normalizedSearch));
        const inStartRange = !startDate || dateValue >= new Date(startDate);
        const inEndRange = !endDate || dateValue <= new Date(endDate + 'T23:59:59');
        return typeMatches && textMatches && inStartRange && inEndRange;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        const amountA = Number(a.amount || 0);
        const amountB = Number(b.amount || 0);

        let compareValue = 0;
        if (sortField === 'quantity') {
          compareValue = amountA - amountB;
        } else {
          compareValue = dateA - dateB;
        }

        if (sortOrder === 'desc') compareValue *= -1;
        return compareValue;
      });
  }, [allTransactions, filterType, searchText, startDate, endDate, sortField, sortOrder]);

  const handleExportToExcel = () => {
    const exportRows = filteredTransactions.map((t) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      Description: t.description,
      Type: t.type,
      'Logged By': t.addedByName || t.addedBy || t.userId || '-',
      Amount: t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finances');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `church-finances-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

      {canManageFinances(role) && (
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

      <div style={{ ...styles.card, marginBottom: '30px' }}>
        <h4 style={{ marginTop: 0 }}>Filter & Sort Entries</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <span style={styles.label}>Search</span>
            <input
              type="text"
              placeholder="Search description, logged by, type"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <span style={styles.label}>Type</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="All">All Types</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          <div>
            <span style={styles.label}>Sort By</span>
            <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="date">Date</option>
              <option value="quantity">Amount</option>
              <option value="time">Time</option>
            </select>
          </div>
          <div>
            <span style={styles.label}>Order</span>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="desc">Newest / Highest</option>
              <option value="asc">Oldest / Lowest</option>
            </select>
          </div>
          <div>
            <span style={styles.label}>Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <span style={styles.label}>End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <button
            type="button"
            onClick={handleExportToExcel}
            style={{ padding: '12px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', minWidth: '180px' }}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {(role !== 'Member' || filteredTransactions.length > 0) && (
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
              {filteredTransactions.map((t) => (
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