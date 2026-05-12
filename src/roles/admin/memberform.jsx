import { useEffect, useState } from 'react';
import api from '../../api';

const MemberForm = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); 
    const [address, setAddress] = useState("");
    const [ministry, setMinistry] = useState("Worship Team");
    const [role, setRole] = useState("Member");
    
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMinistry, setFilterMinistry] = useState("All Ministries");
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [allMembers, setAllMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await api.getMembers();
            const data = response.data;
            if (Array.isArray(data)) {
                setAllMembers(data);
            }
            setLoading(false);
        } catch (err) {
            console.error("Database connection failed:", err);
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!firstName || !lastName || !email || (!isEditing && !password)) {
            return alert("Please fill in Names, Email, and Password");
        }

        const memberData = { 
            firstName,
            lastName,
            email, 
            address, 
            ministry,
            role,
            category: role === "Admin" ? "Admin" : "Member",
            ...(password && { password }) 
        };

        try {
            if (isEditing) {
                await api.updateMember(editId, memberData); 
            } else {
                await api.createMember(memberData);
            }
            resetForm();
            fetchMembers();
        } catch (err) {
            alert("Could not save to database.");
        }
    };

    const resetForm = () => {
        setFirstName(""); setLastName(""); setEmail(""); setPassword("");
        setAddress(""); setMinistry("Worship Team"); setRole("Member");
        setIsEditing(false); setEditId(null);
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        try {
            await api.updateUserStatus(id, newStatus);
            fetchMembers();
        } catch (err) {
            console.error("Failed to update status");
        }
    };

    const deleteMember = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
        try {
            await api.deleteMember(id);
            fetchMembers();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const startEdit = (member) => {
        setIsEditing(true);
        setEditId(member._id);
        setFirstName(member.firstName || "");
        setLastName(member.lastName || "");
        setEmail(member.email || "");
        setAddress(member.address || "");
        setMinistry(member.ministry || "Worship Team");
        setRole(member.role || "Member");
        setPassword(""); 
    };

    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.status === "Active" || !m.status).length;
    
    const newThisMonth = allMembers.filter(m => {
        const dateKey = m.createdAt || m.date; 
        if (!dateKey) return false;
        const joinDate = new Date(dateKey);
        const now = new Date();
        return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length;

    const filteredMembers = (allMembers || []).filter(m => {
        const fName = m.firstName || "";
        const lName = m.lastName || "";
        const mEmail = m.email || "";
        const fullName = `${fName} ${lName}`.toLowerCase();
        
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
        mEmail.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesMinistry = filterMinistry === "All Ministries" || m.ministry === filterMinistry;
        return matchesSearch && matchesMinistry;
    });

  return (
    <div className="member-directory-container">
        <div className="directory-header">
            <h2 style={{ color: '#1a1a1a' }}>System User Management</h2>
            <p style={{ color: '#666' }}>Register members and assign administrative roles</p>
        </div>

        <div className="search-filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
                type="text" 
                className="search-input" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <select 
                className="filter-select" 
                value={filterMinistry} 
                onChange={(e) => setFilterMinistry(e.target.value)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
                <option>All Ministries</option>
                <option>Worship Team</option>
                <option>Youth Ministry</option>
                <option>Children's Ministry</option>
                <option>Outreach</option>
                <option>General Staff</option>
                <option>None</option>
            </select>
        </div>

        <div className="stats-container" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
            <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                <span className="stat-label" style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>Total Accounts</span>
                <span className="stat-value" style={{ color: '#1a1a1a', fontSize: '1.8rem', fontWeight: 'bold' }}>{totalMembers}</span>
            </div>
            <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                <span className="stat-label" style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>Active Users</span>
                <span className="stat-value" style={{ color: '#28a745', fontSize: '1.8rem', fontWeight: 'bold' }}>{activeMembers}</span>
            </div>
            <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                <span className="stat-label" style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>Registrations (Month)</span>
                <span className="stat-value" style={{ color: '#007bff', fontSize: '1.8rem', fontWeight: 'bold' }}>{newThisMonth}</span>
            </div>
        </div>

        <div className="quick-add-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={isEditing ? "New Password (Optional)" : "Password"} 
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ fontWeight: 'bold', color: '#2563eb' }}>
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="Ministry Leader">Ministry Leader</option>
            </select>

            <select value={ministry} onChange={(e) => setMinistry(e.target.value)}>
                <option>Worship Team</option>
                <option>Youth Ministry</option>
                <option>Children's Ministry</option>
                <option>Outreach</option>
                <option>General Staff</option>
                <option>None</option>
            </select>
            
            <button className="add-btn-primary" onClick={handleAction}>
                {isEditing ? "Update Account" : "Create Account"}
            </button>
            {isEditing && <button className="cancel-btn" onClick={resetForm}>Cancel</button>}
        </div>

        <div className="table-container">
            <table className="member-table">
                <thead>
                    <tr>
                        <th>USER/ADDRESS</th>
                        <th>ROLE</th>
                        <th>MINISTRY</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Synchronizing with Database...</td></tr>
                    ) : filteredMembers.map((m) => (
                        <tr key={m._id}>
                            <td>
                                <div className="user-cell">
                                    <div className="avatar" style={{ backgroundColor: m.role === 'Admin' ? '#ef4444' : '#3b82f6' }}>
                                        {(m.firstName || "U").charAt(0)}
                                    </div>
                                    <div><strong>{m.firstName} {m.lastName}</strong><br/><small>{m.address}</small></div>
                                </div>
                            </td>
                            <td>
                                <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '11px', 
                                    fontWeight: 'bold',
                                    backgroundColor: m.role === 'Admin' ? '#fef2f2' : '#f0f9ff',
                                    color: m.role === 'Admin' ? '#991b1b' : '#075985'
                                }}>
                                    {m.role || 'Member'}
                                </span>
                            </td>
                            <td><span className="ministry-tag">{m.ministry}</span></td>
                            <td>
                                <button 
                                    className={`status-pill ${m.status?.toLowerCase() || 'active'}`}
                                    onClick={() => toggleStatus(m._id, m.status)}
                                >
                                    {m.status || "Active"}
                                </button>
                            </td>
                            <td>
                                <button className="action-icon edit" onClick={() => startEdit(m)}>✏️</button>
                                <button className="action-icon delete" onClick={() => deleteMember(m._id)}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

export default MemberForm;