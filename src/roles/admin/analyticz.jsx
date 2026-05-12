import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [dbStats, setDbStats] = useState({
    totalMembers: 0,
    activeMinistries: 0,
    upcomingEvents: 0,
    ministryDistribution: []
  });

  const generateSystemInsights = (stats) => {
    const growthTrend = stats.totalMembers > 20 ? "rapidly expanding" : "consistently growing";
    
    const recommendation = stats.upcomingEvents < 3 
      ? "increasing event frequency to maintain member engagement" 
      : "focusing on volunteer retention for the high volume of upcoming activities";

    const ministryStatus = stats.activeMinistries > 0 
      ? `distributed across ${stats.activeMinistries} specialized ministries` 
      : "currently centralizing operations";

    return `System Analysis: The congregation is ${growthTrend}, with activities ${ministryStatus}. To optimize further, we suggest ${recommendation}.`;
  };

  const fetchLiveAnalytics = async () => {
    try {
      const [membersRes, ministriesRes, eventsRes] = await Promise.all([
        api.getMembers(),
        api.getMinistries(),
        api.getEvents()
      ]);

      const members = membersRes.data || [];
      const ministries = ministriesRes.data || [];
      const events = eventsRes.data || [];

      const totalMinMembers = ministries.reduce((acc, m) => acc + (m.members || 0), 0);
      const distribution = ministries.slice(0, 5).map(m => ({
        name: m.name,
        value: totalMinMembers > 0 ? Math.round((m.members / totalMinMembers) * 100) : 0,
        color: m.color || "#3b82f6"
      }));

      const newStats = {
        totalMembers: members.length,
        activeMinistries: ministries.length,
        upcomingEvents: events.length,
        ministryDistribution: distribution
      };

      setDbStats(newStats);
      
      setAiInsight(generateSystemInsights(newStats));
      
      setLoading(false);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAnalytics();
  }, []);

  const getChartUrl = () => {
    const config = {
      type: 'doughnut',
      data: {
        labels: dbStats.ministryDistribution.map(d => d.name),
        datasets: [{
          data: dbStats.ministryDistribution.map(d => d.value),
          backgroundColor: dbStats.ministryDistribution.map(d => d.color)
        }]
      },
      options: {
        legend: { position: 'bottom' },
        plugins: {
          datalabels: { color: '#fff', font: { weight: 'bold' } }
        }
      }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Metric: "Total Congregation", Value: dbStats.totalMembers },
      { Metric: "Active Ministries", Value: dbStats.activeMinistries },
      { Metric: "Upcoming Events", Value: dbStats.upcomingEvents },
      ...dbStats.ministryDistribution.map(d => ({ Metric: `${d.name} Share`, Value: `${d.value}%` }))
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Church_Analytics");
    XLSX.writeFile(wb, "Live_Church_Analytics.xlsx");
  };

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' },
    card: { background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    insightCard: { 
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid #bfdbfe',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Analyzing system data...</div>;

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Management Analytics</h2>
        <button 
          onClick={exportExcel}
          style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Export Data to Excel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px' }}>
        
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Ministry Member Distribution</h3>
          <img 
            src={getChartUrl()} 
            alt="Ministry Chart" 
            style={{ width: '100%', height: '280px', objectFit: 'contain', marginTop: '10px' }} 
          />
        </div>

        <div style={styles.insightCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <h3 style={{ margin: 0, color: '#1e40af' }}>Automated Insights</h3>
          </div>
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.7', fontStyle: 'italic' }}>
            "{aiInsight}"
          </p>
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', letterSpacing: '1px' }}>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginTop: '25px' }}>
        {[
          { label: "TOTAL MEMBERS", value: dbStats.totalMembers },
          { label: "ACTIVE MINISTRIES", value: dbStats.activeMinistries },
          { label: "UPCOMING EVENTS", value: dbStats.upcomingEvents }
        ].map((kpi, idx) => (
          <div key={idx} style={styles.card}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: '#0f172a' }}>{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;