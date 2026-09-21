import { useEffect, useMemo, useState } from 'react';
import api from '../../api';

const MINISTRY_OPTIONS = [
  'Worship Team', 'Youth Ministry', "Children's Ministry", 'Outreach', 'General Staff',
  'Jail ministry', 'Marshall Ministry', 'Usher Ministry', 'Sanitation ministry',
  'Kitchen ministry', 'Social and Live Ministry', 'Technical Ministry', 'Music ministry'
];

const emptyForm = { firstName: '', lastName: '', email: '', password: '', address: '', phone: '', birthdate: '', gender: '', role: 'Member', ministries: ['Worship Team'] };

const ActionButtons = ({ member, onEdit, onToggleStatus, onArchive }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
    <button
      type="button"
      onClick={() => onEdit(member)}
      title="Edit Profile"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#2563eb',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>
    <button
      type="button"
      onClick={() => onToggleStatus(member)}
      title={`Set ${member.status === 'Active' ? 'Inactive' : 'Active'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 600,
        color: member.status === 'Active' ? '#d97706' : '#059669',
        background: member.status === 'Active' ? '#fffbeb' : '#ecfdf5',
        border: `1px solid ${member.status === 'Active' ? '#fde68a' : '#a7f3d0'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M10 15l5-3-5-3v6z"/></svg>
      Set {member.status === 'Active' ? 'Inactive' : 'Active'}
    </button>
    <button
      type="button"
      onClick={() => onArchive(member)}
      title="Archive Member"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#dc2626',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
      Archive
    </button>
  </div>
);

const MemberForm = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('All Ministries');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState(null);

  const fetchMembers = async () => {
    try {
      const response = await api.getMembers();
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const ministriesFor = member => Array.isArray(member?.ministries) && member.ministries.length
    ? member.ministries : member?.ministry ? [member.ministry] : [];

  const getAge = member => {
    if (!member.birthdate) return null;
    const birthdate = new Date(member.birthdate);
    if (Number.isNaN(birthdate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const birthdayNotReached = today.getMonth() < birthdate.getMonth() ||
      (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate());
    if (birthdayNotReached) age -= 1;
    return age >= 0 ? age : null;
  };

  const roleOptions = ['Member', 'Staff', 'Ministry Leader', 'Admin'];

  const filteredMembers = useMemo(() => {
    const result = members.filter(member => {
      const name = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
      const matchesQuery = `${name} ${member.email || ''}`.includes(query.toLowerCase());
      const matchesMinistry = ministryFilter === 'All Ministries' || ministriesFor(member).includes(ministryFilter);
      const matchesRole = roleFilter === 'All Roles' || (member.role || 'Member') === roleFilter;
      const memberStatus = member.status || 'Active';
      const matchesStatus = statusFilter === 'All Statuses' || memberStatus === statusFilter;
      return matchesQuery && matchesMinistry && matchesRole && matchesStatus;
    });

    return result.sort((first, second) => {
      const firstName = `${first.firstName || ''} ${first.lastName || ''}`.trim().toLowerCase();
      const secondName = `${second.firstName || ''} ${second.lastName || ''}`.trim().toLowerCase();
      const firstAge = getAge(first);
      const secondAge = getAge(second);
      if (sortBy === 'name-desc') return secondName.localeCompare(firstName);
      if (sortBy === 'age-asc') {
        if (firstAge === null) return 1;
        if (secondAge === null) return -1;
        return firstAge - secondAge;
      }
      if (sortBy === 'age-desc') {
        if (firstAge === null) return 1;
        if (secondAge === null) return -1;
        return secondAge - firstAge;
      }
      return firstName.localeCompare(secondName);
    });
  }, [members, query, ministryFilter, roleFilter, statusFilter, sortBy]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const visibleMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, ministryFilter, roleFilter, statusFilter, sortBy]);

  const setField = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const normalizeDate = value => value ? new Date(value).toISOString().split('T')[0] : '';
  const showResult = message => setResultMessage(message);
  const askForConfirmation = (message, action) => setConfirmationAction({ message, action });

  const startEdit = member => {
    setExpandedId(member._id);
    setEditingId(member._id);
    setForm({
      firstName: member.firstName || '', lastName: member.lastName || '', email: member.email || '', password: '',
      address: member.address || '', phone: member.phone || '', birthdate: normalizeDate(member.birthdate),
      gender: member.gender || '', role: member.role || 'Member', ministries: ministriesFor(member)
    });
    setShowEdit(true);
  };

  const saveMember = async () => {
    const member = members.find(item => item._id === editingId);
    if (!member) return;
    try {
      await api.updateMember(editingId, { ...member, ...form, ministry: form.ministries[0] || 'None', ...(form.password ? { password: form.password } : {}) });
      setEditingId(null);
      setShowEdit(false);
      await fetchMembers();
      showResult('Profile updated successfully.');
    } catch (error) { showResult(error?.response?.data?.error || 'Could not update this member.'); }
  };

  const createMember = async () => {
    if (form.password.length < 7) return showResult('Password must be at least 7 characters long.');
    try {
      const response = await api.createMember({ ...form, ministry: form.ministries[0] || 'None' });
      setShowCreate(false);
      setForm(emptyForm);
      showResult(response.data?.confirmationSent === false ? 'Account created, but the confirmation email could not be sent.' : 'Account created. A confirmation code was sent to the user.');
      await fetchMembers();
    } catch (error) { showResult(error?.response?.data?.error || 'Could not create this account.'); }
  };

  const toggleStatus = async member => {
    const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    askForConfirmation(`Are you sure you want to set this user ${nextStatus.toLowerCase()}?`, async () => {
      try { await api.updateMember(member._id, { status: nextStatus }); await fetchMembers(); showResult(`User set to ${nextStatus}.`); }
      catch { showResult('Could not update account status.'); }
    });
  };

  const archiveMember = async member => {
    if (member.status === 'Archived') return showResult('This account is already archived.');
    askForConfirmation('Are you sure you want to archive this account?', async () => {
      try { await api.updateMember(member._id, { status: 'Archived' }); await fetchMembers(); showResult('Account archived successfully.'); }
      catch { showResult('Archive process failed.'); }
    });
  };

  const confirmAction = async () => {
    const action = confirmationAction?.action;
    setConfirmationAction(null);
    if (action) await action();
  };

  const handleFormSubmit = (event, isCreate) => {
    event.preventDefault();
    if (isCreate && form.password.length < 7) return showResult('Password must be at least 7 characters long.');
    askForConfirmation(
      isCreate ? 'Are you sure you want to create this account?' : 'Are you sure you want to save these profile changes?',
      isCreate ? createMember : saveMember
    );
  };

  const activeCount = members.filter(member => member.status === 'Active' || !member.status).length;
  const newThisMonth = members.filter(member => {
    const date = new Date(member.createdAt || member.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const renderForm = isCreate => <form className="member-edit-panel" onSubmit={event => handleFormSubmit(event, isCreate)}>
    <div className="member-edit-grid">
      <label>First name<input required value={form.firstName} onChange={event => setField('firstName', event.target.value)} /></label>
      <label>Last name<input required value={form.lastName} onChange={event => setField('lastName', event.target.value)} /></label>
      <label>Email<input required type="email" value={form.email} onChange={event => setField('email', event.target.value)} /></label>
      <label>Password<input required={isCreate} minLength={7} type="password" placeholder={isCreate ? 'Enter a password' : 'Leave blank if there is no need to change password'} value={form.password} onChange={event => setField('password', event.target.value)} /></label>
      <label>Phone<input value={form.phone} onChange={event => setField('phone', event.target.value)} /></label>
      <label>Birthdate<input type="date" value={form.birthdate} onChange={event => setField('birthdate', event.target.value)} /></label>
      <label>Gender<select value={form.gender} onChange={event => setField('gender', event.target.value)}><option value="">Not specified</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></label>
      <label>Role<select value={form.role} onChange={event => setField('role', event.target.value)}><option>Member</option><option>Admin</option><option>Staff</option><option>Ministry Leader</option></select></label>
      <label className="member-wide-field">Address<input value={form.address} onChange={event => setField('address', event.target.value)} /></label>
    </div>
    <label className="member-ministry-field">Assigned ministries<select multiple size={4} value={form.ministries} onChange={event => setField('ministries', Array.from(event.target.selectedOptions, option => option.value))}>{MINISTRY_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></label>
    <div className="member-card-actions"><button type="button" className="cancel-btn member-action-button" onClick={() => { setShowCreate(false); setShowEdit(false); setEditingId(null); }}>Cancel</button><button className="add-btn-primary member-action-button" type="submit">{isCreate ? 'Create and Email Confirmation' : 'Save Profile Changes'}</button></div>
  </form>;

  const renderMemberContent = () => {
    if (loading) return <div className="member-empty-state">Synchronizing with Database...</div>;
    if (visibleMembers.length === 0) return <div className="member-empty-state">No members match the current filters.</div>;

    if (viewMode === 'table') {
      return (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: '28%' }}>Member</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: '15%' }}>Role</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: '27%' }}>Ministries</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: '12%' }}>Status</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: '18%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map(member => (
                <tr key={member._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar" style={{ backgroundColor: member.role === 'Admin' ? '#ef4444' : '#3b82f6', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                        {(member.firstName || 'U').charAt(0)}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.firstName} {member.lastName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className="member-role-badge">{member.role || 'Member'}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>
                    {ministriesFor(member).join(', ') || 'None'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`status-pill ${(member.status || 'Inactive').toLowerCase()}`}>{member.status || 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <ActionButtons member={member} onEdit={startEdit} onToggleStatus={toggleStatus} onArchive={archiveMember} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visibleMembers.map(member => (
            <div key={member._id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '280px', flexShrink: 0 }}>
                <div className="avatar" style={{ backgroundColor: member.role === 'Admin' ? '#ef4444' : '#3b82f6', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
                  {(member.firstName || 'U').charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.firstName} {member.lastName}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                </div>
              </div>

              <div style={{ width: '130px', flexShrink: 0 }}>
                <span className="member-role-badge">{member.role || 'Member'}</span>
              </div>

              <div style={{ flex: 1, fontSize: '13px', color: '#374151', minWidth: '150px' }}>
                {ministriesFor(member).join(', ') || 'No ministry assigned'}
              </div>

              <div style={{ width: '100px', flexShrink: 0 }}>
                <span className={`status-pill ${(member.status || 'Inactive').toLowerCase()}`}>{member.status || 'Inactive'}</span>
              </div>

              <div style={{ flexShrink: 0 }}>
                <ActionButtons member={member} onEdit={startEdit} onToggleStatus={toggleStatus} onArchive={archiveMember} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="member-card-grid">
        {visibleMembers.map(member => {
          const expanded = expandedId === member._id;
          return (
            <article className={`member-card ${expanded ? 'expanded' : ''}`} key={member._id}>
              <button className="member-card-summary" onClick={() => setExpandedId(expanded ? null : member._id)}>
                <div className="member-card-identity">
                  <div className="avatar" style={{ backgroundColor: member.role === 'Admin' ? '#ef4444' : '#3b82f6' }}>
                    {(member.firstName || 'U').charAt(0)}
                  </div>
                  <strong>{member.firstName} {member.lastName}</strong>
                  <small>{member.email}</small>
                </div>
                <div className="member-card-meta">
                  <span className="member-role-badge">{member.role || 'Member'}</span>
                  <span className="member-card-ministry">{ministriesFor(member).join(', ') || 'No ministry assigned'}</span>
                  <span className={`status-pill ${(member.status || 'Inactive').toLowerCase()}`}>{member.status || 'Inactive'}</span>
                </div>
                <span className="card-chevron">{expanded ? '−' : '+'}</span>
              </button>
              {expanded && (
                <div className="member-card-details">
                  <div className="member-detail-grid">
                    <span><b>Phone</b>{member.phone || 'Not provided'}</span>
                    <span><b>Birthdate</b>{member.birthdate ? new Date(member.birthdate).toLocaleDateString() : 'Not provided'}</span>
                    <span><b>Address</b>{member.address || 'Not provided'}</span>
                    <span><b>Ministries</b>{ministriesFor(member).join(', ') || 'None'}</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <ActionButtons member={member} onEdit={startEdit} onToggleStatus={toggleStatus} onArchive={archiveMember} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="member-directory-container">
      <div className="directory-header">
        <div>
          <h2 style={{ color: '#1a1a1a', marginBottom: 4 }}>System User Management</h2>
          <p style={{ color: '#666', margin: 0 }}>Register members and assign administrative roles</p>
        </div>
        <button className="add-btn-primary" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>+ Create Account</button>
      </div>

      <div className="search-filter-container member-filter-bar" style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="search-input" placeholder="Search users..." value={query} onChange={event => setQuery(event.target.value)} />
        <select className="filter-select" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option>All Roles</option>{roleOptions.map(option => <option key={option}>{option}</option>)}</select>
        <select className="filter-select" value={ministryFilter} onChange={event => setMinistryFilter(event.target.value)}><option>All Ministries</option>{MINISTRY_OPTIONS.map(option => <option key={option}>{option}</option>)}</select>
        <select className="filter-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All Statuses</option><option>Active</option><option>Inactive</option><option>Archived</option></select>
        <select className="filter-select" value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="name-asc">Name: A-Z</option><option value="name-desc">Name: Z-A</option><option value="age-asc">Age: Youngest first</option><option value="age-desc">Age: Oldest first</option></select>

        <div className="view-toggle-group" style={{ display: 'flex', background: '#333', borderRadius: 6, padding: 3, gap: 2 }}>
          <button type="button" title="Grid View" onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? '#555' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>⊞ Grid</button>
          <button type="button" title="List View" onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? '#555' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>☰ List</button>
          <button type="button" title="Table View" onClick={() => setViewMode('table')} style={{ background: viewMode === 'table' ? '#555' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>▦ Table</button>
        </div>
      </div>

      <div className="stats-container" style={{ display: 'flex', gap: 20, marginBottom: 25 }}>
        <div className="stat-card"><span>Total Accounts</span><strong>{members.length}</strong></div>
        <div className="stat-card"><span>Active Users</span><strong style={{ color: '#28a745' }}>{activeCount}</strong></div>
        <div className="stat-card"><span>Registrations (Month)</span><strong style={{ color: '#007bff' }}>{newThisMonth}</strong></div>
      </div>

      {renderMemberContent()}

      {pageCount > 1 && <div className="member-pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button></div>}
      {showCreate && <div className="member-modal-overlay" onClick={() => setShowCreate(false)}><div className="member-modal" onClick={event => event.stopPropagation()}><div className="member-modal-header"><div><h3>Create Account</h3><p>The user will receive a confirmation code by email.</p></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div>{renderForm(true)}</div></div>}
      {showEdit && <div className="member-modal-overlay" onClick={() => { setShowEdit(false); setEditingId(null); }}><div className="member-modal" onClick={event => event.stopPropagation()}><div className="member-modal-header"><div><h3>Edit Profile</h3><p>Update the member's account and personal information.</p></div><button type="button" onClick={() => { setShowEdit(false); setEditingId(null); }}>×</button></div>{renderForm(false)}</div></div>}
      {confirmationAction && <div className="member-result-overlay"><div className="member-confirm-modal"><p>{confirmationAction.message}</p><div className="member-confirm-actions"><button className="cancel-btn member-action-button" onClick={() => setConfirmationAction(null)}>No</button><button className="add-btn-primary member-action-button" onClick={confirmAction}>Yes</button></div></div></div>}
      {resultMessage && <div className="member-result-overlay"><div className="member-result-modal"><p>{resultMessage}</p><button className="add-btn-primary member-action-button" onClick={() => setResultMessage('')}>Okay</button></div></div>}
    </div>
  );
};

export default MemberForm;