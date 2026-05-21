import { useEffect, useState } from 'react';
import api from '../../api';

const Advising = ({ user, role }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    title: '',
    concern: ''
  });
  const [acceptingId, setAcceptingId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', location: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loggedInId = user?._id || user?.id;
  const isLeader = role === 'Ministry Leader';
  const isAdmin = role === 'Admin';
  const canSubmit = role === 'Member' || role === 'Staff';
  const userDisplayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

  useEffect(() => {
    if (loggedInId) {
      fetchRequests();
    }
  }, [loggedInId, role]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.getAdvising(loggedInId, role);
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error loading advising requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      name: userDisplayName,
      title: '',
      concern: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.title.trim() || !form.concern.trim()) {
      setError('Please provide a title and a concern for your request.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await api.submitAdvising({
        name: form.name || userDisplayName,
        title: form.title.trim(),
        concern: form.concern.trim(),
        userId: loggedInId,
        userRole: role
      });
      resetForm();
      await fetchRequests();
    } catch (err) {
      console.error('Error submitting advising request:', err);
      setError('Unable to submit your request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAccept = (request) => {
    setAcceptingId(request._id);
    setScheduleForm({
      date: request.acceptedDate || '',
      time: request.acceptedTime || '',
      location: request.acceptedLocation || ''
    });
  };

  const handleAccept = async (request) => {
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.location.trim()) {
      alert('Please choose a date, time, and location before accepting.');
      return;
    }

    setActionLoading(true);
    try {
      await api.acceptAdvising(request._id, {
        date: scheduleForm.date,
        time: scheduleForm.time,
        location: scheduleForm.location.trim(),
        leaderId: loggedInId,
        leaderName: userDisplayName
      }, role);
      setAcceptingId(null);
      await fetchRequests();
    } catch (err) {
      console.error('Error accepting advising request:', err);
      alert('Unable to accept the request at this time.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnore = async (request) => {
    if (!window.confirm('Ignore this request? It may be archived if all leaders ignore it.')) {
      return;
    }

    setActionLoading(true);
    try {
      await api.ignoreAdvising(request._id, { leaderId: loggedInId }, role);
      await fetchRequests();
    } catch (err) {
      console.error('Error ignoring advising request:', err);
      alert('Unable to ignore the request right now.');
    } finally {
      setActionLoading(false);
    }
  };

  const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    header: { marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '6px' },
    card: { background: 'white', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 10px 20px rgba(15,23,42,0.06)' },
    formRow: { display: 'grid', gap: '16px', marginBottom: '16px' },
    input: { width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' },
    textArea: { minHeight: '120px', resize: 'vertical', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' },
    buttonPrimary: { padding: '14px 24px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer' },
    buttonSecondary: { padding: '12px 20px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer' },
    badge: (status) => ({ display: 'inline-flex', padding: '7px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: status === 'Accepted' ? '#dcfce7' : status === 'Archived' ? '#f8fafc' : '#f0fdf4', color: status === 'Accepted' ? 'var(--color-primary)' : status === 'Archived' ? '#475569' : 'var(--color-primary)' }),
    metaRow: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', color: '#64748b', fontSize: '13px' },
    fieldGroup: { display: 'grid', gap: '12px', marginBottom: '14px' },
    sectionHeader: { margin: '0 0 12px 0', color: '#1e293b' },
    ignoreNotice: { color: '#b91c1c', fontSize: '13px' }
  };

  const visibleRequests = requests.filter((request) => {
    if (isAdmin || isLeader) return true;
    return request.userId === loggedInId;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Ministry Advising</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: '15px' }}>
          {canSubmit
            ? 'Submit a concern for ministry leader review, or check the status of your existing submissions.'
            : 'Review advising requests submitted by members and staff. Accept to schedule or ignore when appropriate.'}
        </p>
      </div>

      {canSubmit && (
        <div style={{ ...styles.card, marginBottom: '28px' }}>
          <h2 style={styles.sectionHeader}>Submit an Advising Request</h2>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <input
                type="text"
                style={styles.input}
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              <input
                type="text"
                style={styles.input}
                placeholder="Request Title"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            <div style={styles.formRow}>
              <textarea
                style={styles.textArea}
                placeholder="Explain your concern or request in detail..."
                value={form.concern}
                onChange={(e) => handleChange('concern', e.target.value)}
              />
            </div>
            {error && <div style={{ color: '#b91c1c', marginBottom: '14px' }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ ...styles.buttonPrimary, opacity: submitting ? 0.65 : 1 }}>
              {submitting ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '22px' }}>
        {loading ? (
          <p>Loading advising requests…</p>
        ) : visibleRequests.length === 0 ? (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>No advising requests available.</p>
        ) : (
          visibleRequests.map((request) => {
            const pending = request.status === 'Pending';
            const accepted = request.status === 'Accepted';
            const archived = request.status === 'Archived';
            const isOwner = request.userId === loggedInId;

            return (
              <div key={request._id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{request.title}</div>
                    <div style={styles.metaRow}>
                      <span>{request.name}</span>
                      <span>Submitted {new Date(request.submittedAt || request.createdAt).toLocaleDateString()}</span>
                      <span style={styles.badge(request.status)}>{request.status}</span>
                    </div>
                  </div>
                </div>

                <p style={{ color: '#334155', lineHeight: 1.7, margin: '16px 0' }}>{request.concern}</p>

                <div style={styles.metaRow}>
                  <span>Submitted by: {request.userRole || 'Member'}</span>
                  {request.ignoredBy?.length > 0 && <span>{request.ignoredBy.length} leader(s) ignored</span>}
                </div>

                {accepted && (
                  <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #dbeafe', marginTop: '16px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Scheduled Support Details</div>
                    <div style={styles.metaRow}>
                      <span>📅 {request.acceptedDate}</span>
                      <span>⏰ {request.acceptedTime}</span>
                      <span>📍 {request.acceptedLocation}</span>
                    </div>
                    <div style={{ color: '#475569' }}>Accepted by: {request.acceptedBy || 'Ministry Leader'}</div>
                  </div>
                )}

                {isLeader && pending && (
                  <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
                    {acceptingId === request._id ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={styles.formRow}>
                          <input
                            type="date"
                            style={styles.input}
                            value={scheduleForm.date}
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                          />
                          <input
                            type="time"
                            style={styles.input}
                            value={scheduleForm.time}
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                          />
                        </div>
                        <input
                          type="text"
                          style={styles.input}
                          placeholder="Location"
                          value={scheduleForm.location}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                        />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleAccept(request)}
                            disabled={actionLoading}
                            style={{ ...styles.buttonPrimary, opacity: actionLoading ? 0.65 : 1 }}
                          >
                            {actionLoading ? 'Confirming...' : 'Confirm Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAcceptingId(null)}
                            style={styles.buttonSecondary}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => handleStartAccept(request)} style={styles.buttonPrimary}>Accept</button>
                        <button type="button" onClick={() => handleIgnore(request)} style={styles.buttonSecondary}>Ignore</button>
                      </div>
                    )}
                  </div>
                )}

                {archived && (
                  <div style={styles.ignoreNotice}>This request was archived after receiving no acceptance from ministry leaders.</div>
                )}

                {isAdmin && request.ignoredBy?.length > 0 && (
                  <div style={{ marginTop: '16px', fontSize: '13px', color: '#475569' }}>
                    Ignored by leader IDs: {request.ignoredBy.join(', ')}
                  </div>
                )}

                {isOwner && !isLeader && !isAdmin && request.status === 'Pending' && (
                  <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
                    Your request is awaiting review by ministry leaders.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Advising;
