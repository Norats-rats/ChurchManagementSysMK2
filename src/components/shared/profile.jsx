import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';

const Profile = ({ userId, currentUserId, compact = false }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genderSaving, setGenderSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return setLoading(false);
    const load = async () => {
      setLoading(true);
      try {
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
  const genderOptions = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];
  const canSetGender = isEditable && !member?.gender;

  const handleSetGender = async () => {
    if (!member || !member.gender || !isEditable) return;
    setGenderSaving(true);
    try {
      const id = member._id || member.id;
      await api.updateMember(id, { gender: member.gender });
      setError(null);
    } catch (err) {
      console.error('Set gender error', err);
      setError('Failed to set gender');
    } finally {
      setGenderSaving(false);
    }
  };

  const handleSave = async () => {
    if (!member || !isEditable) return;
    setSaving(true);
    try {
      const id = member._id || member.id;
      await api.updateMember(id, member);
      setError(null);
    } catch (err) {
      console.error('Save profile error', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading profile…</div>;
  if (!member) return <div style={styles.loading}>No profile found.</div>;

  return (
    <div style={styles.page}>
      <section style={styles.profileCard}>
        <div style={styles.avatarSection}>
        {member.profilePicture ? (
          <img src={member.profilePicture} alt="avatar" style={styles.avatar} />
        ) : (
          <div style={styles.placeholderAvatar}>
            {member.firstName ? (member.firstName[0] || '') + (member.lastName ? (member.lastName[0] || '') : '') : (member.email ? member.email[0].toUpperCase() : 'M')}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {isEditable && (
          <button type="button" onClick={handlePickPhoto} style={styles.photoButton}>Change Photo</button>
        )}
      </div>

      <div style={styles.infoSection}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.nameText}>{`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email}</div>
            <div style={styles.roleText}>{member.role || member.category || ''}</div>
          </div>
          <div style={styles.ageBox}>
            <div style={styles.ageLabel}>Age</div>
            <div style={styles.ageValue}>{computeAge(member.birthdate) || '—'}</div>
          </div>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.fieldBlock}>
            <label style={styles.fieldLabel}>Email</label>
            <div style={styles.readOnlyValue}>{member.email || '—'}</div>
          </div>
          <div style={styles.fieldBlock}>
            <label style={styles.fieldLabel}>Phone</label>
            <input
              disabled={!isEditable}
              style={{ ...styles.input, ...(!isEditable ? styles.inputDisabled : {}) }}
              value={member.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          <div style={styles.fieldBlock}>
            <label style={styles.fieldLabel}>Gender</label>
            {canSetGender ? (
              <select
                disabled={!isEditable}
                style={{ ...styles.input, ...(!isEditable ? styles.inputDisabled : {}) }}
                value={member.gender || ''}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="">Select gender</option>
                {genderOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <div style={styles.readOnlyValue}>{member.gender || 'Not specified'}</div>
            )}
            {canSetGender && (
              <div style={styles.helpText}>Gender can only be set once and will become read-only after saving.</div>
            )}
          </div>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.fieldBlock}>
            <label style={styles.fieldLabel}>Birthdate</label>
            <input
              disabled={!isEditable}
              type="date"
              style={{ ...styles.input, ...(!isEditable ? styles.inputDisabled : {}) }}
              value={member.birthdate ? (typeof member.birthdate === 'string' ? member.birthdate.split('T')[0] : new Date(member.birthdate).toISOString().split('T')[0]) : ''}
              onChange={(e) => handleChange('birthdate', e.target.value)}
            />
          </div>
          <div style={styles.fieldBlock}>
            <label style={styles.fieldLabel}>Computed Age</label>
            <div style={styles.readOnlyValue}>{computeAge(member.birthdate) || '—'}</div>
          </div>
        </div>

        <div style={styles.actionsRow}>
          {error && <div style={styles.errorText}>{error}</div>}
          {canSetGender && (
            <button onClick={handleSetGender} disabled={genderSaving || !member.gender} style={{ ...styles.genderButton, ...(genderSaving ? styles.saveButtonDisabled : {}) }}>
              {genderSaving ? 'Setting Gender…' : 'Set Gender'}
            </button>
          )}
          {isEditable && (
            <button onClick={handleSave} disabled={saving} style={{ ...styles.saveButton, ...(saving ? styles.saveButtonDisabled : {}) }}>{saving ? 'Saving…' : 'Save'}</button>
          )}
        </div>
      </div>
      </section>
    </div>
  );
};

const styles = {
  loading: {
    padding: 20,
    fontSize: 15,
    color: '#334155',
  },
  page: {
    width: '100%',
    maxWidth: 960,
    margin: '0 auto',
    padding: 20,
  },
  profileCard: {
    display: 'flex',
    gap: 28,
    padding: 28,
    borderRadius: 28,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
    alignItems: 'flex-start',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
    minWidth: 150,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 24,
    objectFit: 'cover',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  placeholderAvatar: {
    width: 140,
    height: 140,
    borderRadius: 24,
    background: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    fontWeight: 800,
    color: '#3730a3',
  },
  photoButton: {
    padding: '12px 18px',
    borderRadius: 14,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#102a43',
    cursor: 'pointer',
    fontWeight: 700,
    minWidth: 150,
  },
  infoSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 26,
    fontWeight: 800,
    color: '#0f172a',
  },
  roleText: {
    marginTop: 6,
    fontSize: 14,
    color: '#475569',
  },
  ageBox: {
    minWidth: 120,
    padding: '16px 18px',
    borderRadius: 18,
    background: '#f8fafc',
    textAlign: 'center',
  },
  ageLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  ageValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 18,
  },
  fieldBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: 700,
  },
  readOnlyValue: {
    minHeight: 48,
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    minHeight: 48,
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    outline: 'none',
  },
  inputDisabled: {
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  saveButton: {
    padding: '14px 20px',
    borderRadius: 16,
    border: 'none',
    background: 'var(--color-primary)',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  genderButton: {
    padding: '14px 20px',
    borderRadius: 16,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 700,
    cursor: 'pointer',
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4,
  },
  saveButtonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
};

export default Profile;