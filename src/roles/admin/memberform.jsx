import { useEffect, useMemo, useState } from 'react';
import api from '../../api';

const MINISTRY_OPTIONS = [
  'Worship Team', 'Youth Ministry', "Children's Ministry", 'Outreach', 'General Staff',
  'Jail ministry', 'Marshall Ministry', 'Usher Ministry', 'Sanitation ministry',
  'Kitchen ministry', 'Social and Live Ministry', 'Technical Ministry', 'Music ministry'
];

const emptyForm = { firstName: '', lastName: '', email: '', password: '', address: '', phone: '', birthdate: '', gender: '', role: 'Member', ministries: ['Worship Team'] };

const MemberForm = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('All Ministries');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);

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
      return matchesQuery && matchesMinistry && matchesRole;
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
  }, [members, query, ministryFilter, roleFilter, sortBy]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const visibleMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, ministryFilter, roleFilter, sortBy]);

  const setField = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const normalizeDate = value => value ? new Date(value).toISOString().split('T')[0] : '';

  const startEdit = member => {
    setExpandedId(member._id);
    setEditingId(member._id);
    setForm({
      firstName: member.firstName || '', lastName: member.lastName || '', email: member.email || '', password: '',
      address: member.address || '', phone: member.phone || '', birthdate: normalizeDate(member.birthdate),
      gender: member.gender || '', role: member.role || 'Member', ministries: ministriesFor(member)
    });
  };

  const saveMember = async event => {
    event.preventDefault();
    const member = members.find(item => item._id === editingId);
    if (!member) return;
    try {
      await api.updateMember(editingId, { ...member, ...form, ministry: form.ministries[0] || 'None', ...(form.password ? { password: form.password } : {}) });
      setEditingId(null);
      setShowEdit(false);
      await fetchMembers();
    } catch (error) { alert(error?.response?.data?.error || 'Could not update this member.'); }
  };

  const createMember = async event => {
    event.preventDefault();
    if (form.password.length < 7) return alert('Password must be at least 7 characters long.');
    try {
      const response = await api.createMember({ ...form, ministry: form.ministries[0] || 'None' });
      setShowCreate(false);
      setForm(emptyForm);
      alert(response.data?.confirmationSent === false ? 'Account created, but the confirmation email could not be sent.' : 'Account created. A confirmation code was sent to the user.');
      await fetchMembers();
    } catch (error) { alert(error?.response?.data?.error || 'Could not create this account.'); }
  };

  const toggleStatus = async member => {
    try { await api.updateMember(member._id, { status: member.status === 'Active' ? 'Inactive' : 'Active' }); await fetchMembers(); }
    catch { alert('Could not update account status.'); }
  };

  const archiveMember = async member => {
    if (member.status === 'Inactive' || !window.confirm('Archive this account?')) return;
    try { await api.updateMember(member._id, { status: 'Inactive' }); await fetchMembers(); }
    catch { alert('Archive process failed.'); }
  };

  const activeCount = members.filter(member => member.status === 'Active' || !member.status).length;
  const newThisMonth = members.filter(member => {
    const date = new Date(member.createdAt || member.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const renderForm = isCreate => <form className="member-edit-panel" onSubmit={isCreate ? createMember : saveMember}>
    <div className="member-edit-grid">
      <label>First name<input required={isCreate} value={form.firstName} onChange={event => setField('firstName', event.target.value)} /></label>
      <label>Last name<input required={isCreate} value={form.lastName} onChange={event => setField('lastName', event.target.value)} /></label>
      <label>Email<input required={isCreate} type="email" value={form.email} onChange={event => setField('email', event.target.value)} /></label>
      {isCreate && <label>Password<input required minLength={7} type="password" value={form.password} onChange={event => setField('password', event.target.value)} /></label>}
      <label>Phone<input value={form.phone} onChange={event => setField('phone', event.target.value)} /></label>
      <label>Birthdate<input type="date" value={form.birthdate} onChange={event => setField('birthdate', event.target.value)} /></label>
      <label>Gender<select value={form.gender} onChange={event => setField('gender', event.target.value)}><option value="">Not specified</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></label>
      <label>Role<select value={form.role} onChange={event => setField('role', event.target.value)}><option>Member</option><option>Admin</option><option>Staff</option><option>Ministry Leader</option></select></label>
      <label className="member-wide-field">Address<input value={form.address} onChange={event => setField('address', event.target.value)} /></label>
    </div>
    <label className="member-ministry-field">Assigned ministries<select multiple size={4} value={form.ministries} onChange={event => setField('ministries', Array.from(event.target.selectedOptions, option => option.value))}>{MINISTRY_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></label>
    <div className="member-card-actions"><button type="button" className="cancel-btn" onClick={() => { setShowCreate(false); setShowEdit(false); setEditingId(null); }}>Cancel</button><button className="add-btn-primary" type="submit">{isCreate ? 'Create and Email Confirmation' : 'Save Profile Changes'}</button></div>
  </form>;

  return <div className="member-directory-container">
    <div className="directory-header"><div><h2 style={{ color: '#1a1a1a', marginBottom: 4 }}>System User Management</h2><p style={{ color: '#666', margin: 0 }}>Register members and assign administrative roles</p></div><button className="add-btn-primary" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>+ Create Account</button></div>
    <div className="search-filter-container member-filter-bar" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
      <input className="search-input" placeholder="Search users..." value={query} onChange={event => setQuery(event.target.value)} />
      <select className="filter-select" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option>All Roles</option>{roleOptions.map(option => <option key={option}>{option}</option>)}</select>
      <select className="filter-select" value={ministryFilter} onChange={event => setMinistryFilter(event.target.value)}><option>All Ministries</option>{MINISTRY_OPTIONS.map(option => <option key={option}>{option}</option>)}</select>
      <select className="filter-select" value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="name-asc">Name: A-Z</option><option value="name-desc">Name: Z-A</option><option value="age-asc">Age: Youngest first</option><option value="age-desc">Age: Oldest first</option></select>
    </div>
    <div className="stats-container" style={{ display: 'flex', gap: 20, marginBottom: 25 }}><div className="stat-card"><span>Total Accounts</span><strong>{members.length}</strong></div><div className="stat-card"><span>Active Users</span><strong style={{ color: '#28a745' }}>{activeCount}</strong></div><div className="stat-card"><span>Registrations (Month)</span><strong style={{ color: '#007bff' }}>{newThisMonth}</strong></div></div>
    <div className="member-card-grid">{loading ? <div className="member-empty-state">Synchronizing with Database...</div> : visibleMembers.length === 0 ? <div className="member-empty-state">No members match the current filters.</div> : visibleMembers.map(member => {
      const expanded = expandedId === member._id;
      return <article className={`member-card ${expanded ? 'expanded' : ''}`} key={member._id}>
        <button className="member-card-summary" onClick={() => setExpandedId(expanded ? null : member._id)}><div className="member-card-identity"><div className="avatar" style={{ backgroundColor: member.role === 'Admin' ? '#ef4444' : '#3b82f6' }}>{(member.firstName || 'U').charAt(0)}</div><strong>{member.firstName} {member.lastName}</strong><small>{member.email}</small></div><div className="member-card-meta"><span className="member-role-badge">{member.role || 'Member'}</span><span className="member-card-ministry">{ministriesFor(member)[0] || 'No ministry assigned'}</span><span className={`status-pill ${(member.status || 'Inactive').toLowerCase()}`}>{member.status || 'Inactive'}</span></div><span className="card-chevron">{expanded ? '−' : '+'}</span></button>
        {expanded && <div className="member-card-details"><div className="member-detail-grid"><span><b>Phone</b>{member.phone || 'Not provided'}</span><span><b>Birthdate</b>{member.birthdate ? new Date(member.birthdate).toLocaleDateString() : 'Not provided'}</span><span><b>Address</b>{member.address || 'Not provided'}</span><span><b>Ministries</b>{ministriesFor(member).join(', ') || 'None'}</span></div><div className="member-card-actions"><button className="add-btn-primary" onClick={() => { startEdit(member); setShowEdit(true); }}>Edit Profile</button><button className="status-pill active" onClick={() => toggleStatus(member)}>Set {member.status === 'Active' ? 'Inactive' : 'Active'}</button><button className="action-icon delete" onClick={() => archiveMember(member)} title="Archive member">📦</button></div></div>}
      </article>;
    })}</div>
    {pageCount > 1 && <div className="member-pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button></div>}
    {showCreate && <div className="member-modal-overlay" onClick={() => setShowCreate(false)}><div className="member-modal" onClick={event => event.stopPropagation()}><div className="member-modal-header"><div><h3>Create Account</h3><p>The user will receive a confirmation code by email.</p></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div>{renderForm(true)}</div></div>}
    {showEdit && <div className="member-modal-overlay" onClick={() => { setShowEdit(false); setEditingId(null); }}><div className="member-modal" onClick={event => event.stopPropagation()}><div className="member-modal-header"><div><h3>Edit Profile</h3><p>Update the member's account and personal information.</p></div><button type="button" onClick={() => { setShowEdit(false); setEditingId(null); }}>×</button></div>{renderForm(false)}</div></div>}
  </div>;
};

export default MemberForm;
