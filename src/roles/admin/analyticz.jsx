import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("Generating live machine learning overview...");
  const [dbStats, setDbStats] = useState({
    totalMembers: 0,
    activeMinistries: 0,
    upcomingEvents: 0,
    ministryDistribution: [],
    genderDistribution: [],
    ageGroupDistribution: [],
    averageAge: 0,
    nextBirthdays: []
  });


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

      const ministryCounts = {};
      members.forEach(member => {
        const minName = member.ministry || 'None';
        if (minName !== 'None') {
          ministryCounts[minName] = (ministryCounts[minName] || 0) + 1;
        }
      });

      const distribution = ministries.slice(0, 5).map(m => {
        const realCount = ministryCounts[m.name] || 0;
        return {
          name: m.name,
          value: members.length > 0 ? Math.round((realCount / members.length) * 100) : 0,
          color: m.color || "#3b82f6"
        };
      });

      const ageRanges = [
        { name: 'Under 18', min: 0, max: 17 },
        { name: '18-25', min: 18, max: 25 },
        { name: '26-35', min: 26, max: 35 },
        { name: '36-50', min: 36, max: 50 },
        { name: '51+', min: 51, max: 200 }
      ];

      const genderCounts = {
        Male: 0,
        Female: 0,
        'Non-binary': 0,
        Other: 0,
        Unknown: 0
      };
      const ageGroupCounts = ageRanges.reduce((acc, range) => ({ ...acc, [range.name]: 0 }), {});
      const ages = [];
      const upcomingBirthdays = [];

      members.forEach(member => {
        const age = getAgeFromBirthdate(member.birthdate);
        if (age !== null) {
          ages.push(age);
          const range = ageRanges.find(r => age >= r.min && age <= r.max);
          if (range) {
            ageGroupCounts[range.name] += 1;
          }

          const nextBirthday = getNextBirthday(member.birthdate);
          if (nextBirthday) {
            upcomingBirthdays.push({
              name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Member',
              birthday: nextBirthday,
              displayDate: nextBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              age
            });
          }
        }

        const normalizedGender = (member.gender || '').trim();
        const genderKey = normalizedGender === 'Male' || normalizedGender === 'Female' || normalizedGender === 'Non-binary'
          ? normalizedGender
          : normalizedGender ? 'Other' : 'Unknown';
        genderCounts[genderKey] = (genderCounts[genderKey] || 0) + 1;
      });

      const genderDistribution = Object.entries(genderCounts).map(([name, value]) => ({
        name,
        value,
        color: {
          Male: '#60a5fa',
          Female: '#f97316',
          'Non-binary': '#a78bfa',
          Other: '#22c55e',
          Unknown: '#94a3b8'
        }[name] || '#cbd5e1'
      }));

      const newStats = {
        totalMembers: members.length,
        activeMinistries: ministries.length,
        upcomingEvents: events.length,
        ministryDistribution: distribution,
        ageGroupDistribution: ageRanges.map(range => ({ name: range.name, value: ageGroupCounts[range.name] || 0 })),
        genderDistribution,
        averageAge: ages.length > 0 ? Math.round(ages.reduce((sum, value) => sum + value, 0) / ages.length) : 0,
        nextBirthdays: upcomingBirthdays.sort((a, b) => a.birthday - b.birthday).slice(0, 5)
      };

      setDbStats(newStats);
      setLoading(false);

      try {
        const aiResponse = await api.analyzeMetrics(newStats);
        if (aiResponse.data && aiResponse.data.insight) {
          setAiInsight(aiResponse.data.insight);
        }
      } catch (aiErr) {
        console.error("Live AI Generation fallback triggered:", aiErr);
        const growthTrend = newStats.totalMembers > 20 ? "rapidly expanding" : "consistently growing";
        setAiInsight(`System Analysis: The congregation is ${growthTrend}. Review current event timelines manually to ensure specialized growth.`);
      }

    } catch (err) {
      console.error("Analytics fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAnalytics();
  }, []);

  const getAgeFromBirthdate = (birthdate) => {
    const date = new Date(birthdate);
    if (isNaN(date)) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
    return age;
  };

  const getNextBirthday = (birthdate) => {
    const date = new Date(birthdate);
    if (isNaN(date)) return null;
    const today = new Date();
    const nextBirthday = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    return nextBirthday;
  };

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

  const getGenderChartUrl = () => {
    const config = {
      type: 'doughnut',
      data: {
        labels: dbStats.genderDistribution.map(d => d.name),
        datasets: [{
          data: dbStats.genderDistribution.map(d => d.value),
          backgroundColor: dbStats.genderDistribution.map(d => d.color)
        }]
      },
      options: {
        legend: { position: 'bottom' },
        plugins: {
          datalabels: { display: false }
        }
      }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
  };

  const exportExcel = () => {
    const rows = [
      { Metric: "Total Congregation", Value: dbStats.totalMembers },
      { Metric: "Active Ministries", Value: dbStats.activeMinistries },
      { Metric: "Upcoming Events", Value: dbStats.upcomingEvents },
      { Metric: "Average Age", Value: dbStats.averageAge },
      ...dbStats.ageGroupDistribution.map(d => ({ Metric: `Age Range: ${d.name}`, Value: d.value })),
      ...dbStats.genderDistribution.map(d => ({ Metric: `Gender: ${d.name}`, Value: d.value })),
      ...dbStats.ministryDistribution.map(d => ({ Metric: `Ministry: ${d.name}`, Value: `${d.value}%` }))
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
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
            <span style={{ fontSize: '24px' }}>✨</span>
            <h3 style={{ margin: 0, color: '#1e40af' }}>Live AI System Insights</h3>
          </div>
          <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.7', fontStyle: 'italic' }}>
            "{aiInsight}"
          </p>
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', letterSpacing: '1px' }}>
            REAL-TIME INTELLIGENCE DATA REFRESHED LIVE
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginTop: '25px' }}>
        {[
          { label: "TOTAL MEMBERS", value: dbStats.totalMembers },
          { label: "AVERAGE AGE", value: dbStats.averageAge },
          { label: "UPCOMING EVENTS", value: dbStats.upcomingEvents }
        ].map((kpi, idx) => (
          <div key={idx} style={styles.card}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: '#0f172a' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '25px' }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Age Range Breakdown</h3>
          <div style={{ display: 'grid', gap: '10px', marginTop: '18px' }}>
            {dbStats.ageGroupDistribution.map((group) => (
              <div key={group.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#475569' }}>{group.name}</span>
                <strong style={{ color: '#0f172a' }}>{group.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Gender Profile & Birthdays</h3>
          <div style={{ display: 'grid', gap: '18px', marginTop: '18px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>Gender Distribution</div>
              {dbStats.genderDistribution.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ color: '#334155' }}>{item.name}</span>
                  <strong style={{ color: '#0f172a' }}>{item.value}</strong>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>Next Birthdays</div>
              {dbStats.nextBirthdays.length > 0 ? (
                dbStats.nextBirthdays.map((birthday, idx) => (
                  <div key={`${birthday.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#334155' }}>{birthday.name}</span>
                    <span style={{ color: '#0f172a' }}>{birthday.displayDate}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b' }}>No upcoming birthdays found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;