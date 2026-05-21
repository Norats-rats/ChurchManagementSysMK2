import { useEffect, useRef, useState } from 'react';
import { api } from '../../../api';

const Profile = ({ userId, currentUserId, compact = false }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return setLoading(false);
    const load = async () => {
      setLoading(true);
      try {
        // Fetch single member by id
        const res = await api.getMember(userId);
        setMember(res.data || null);
      } catch (err) {
        console.error('Profile load error', err);
        setError('Unable to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const computeAge = (bd) => {
    if (!bd) return '';
    const d = new Date(bd);
    if (isNaN(d)) return '';
    const diff = Date.now() - d.getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return age;
  };

  const handleChange = (field, value) => {
    setMember(prev => ({ ...(prev || {}), [field]: value }));
  };

  const fileInputRef = useRef(null);
  const handlePickPhoto = () => fileInputRef.current && fileInputRef.current.click();
  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleChange('profilePicture', reader.result);
    };
    reader.readAsDataURL(f);
  };

  const isEditable = !currentUserId || String(currentUserId) === String(userId);

  const handleSave = async () => {
    if (!member || !isEditable) return;
    setSaving(true);
    try {
      const id = member._id || member.id;
      await api.updateMember(id, member);
      setError(null);
      // optional: re-fetch or show success briefly
    } catch (err) {
      console.error('Save profile error', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 12 }}>Loading profile…</div>;
  if (!member) return <div style={{ padding: 12 }}>No profile found.</div>;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: compact ? 56 : 96 }}>
        {member.profilePicture ? (
          <img src={member.profilePicture} alt="avatar" style={{ width: compact ? 56 : 80, height: compact ? 56 : 80, borderRadius: 10, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: compact ? 56 : 80, height: compact ? 56 : 80, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 18 : 22, fontWeight: 700, color: '#3730a3' }}>
            {member.firstName ? (member.firstName[0] || '') + (member.lastName ? (member.lastName[0] || '') : '') : (member.email ? member.email[0].toUpperCase() : 'M')}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        {isEditable && (
          <button type="button" onClick={handlePickPhoto} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6edf3', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Change Photo</button>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{member.role || member.category || ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Age</div>
            <div style={{ fontWeight: 700 }}>{computeAge(member.birthdate) || '—'}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#475569' }}>Email</label>
            <div style={{ marginTop: 6 }}>{member.email || '—'}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569' }}>Phone</label>
            <input disabled={!isEditable} style={{ width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6edf3', background: !isEditable ? '#f8fafc' : '#fff' }} value={member.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#475569' }}>Birthdate</label>
            <input disabled={!isEditable} type="date" style={{ width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6edf3', background: !isEditable ? '#f8fafc' : '#fff' }} value={member.birthdate ? (typeof member.birthdate === 'string' ? member.birthdate.split('T')[0] : new Date(member.birthdate).toISOString().split('T')[0]) : ''} onChange={(e) => handleChange('birthdate', e.target.value)} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ fontSize: 12, color: '#475569' }}>Computed Age</label>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{computeAge(member.birthdate) || '—'}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {error && <div style={{ color: 'crimson', marginRight: 'auto' }}>{error}</div>}
          {isEditable && (
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;