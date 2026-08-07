import { useEffect, useState } from 'react';
import api from '../../api';

const CATEGORY_MAP = [
    { key: 'mic', label: 'Mic', prefix: 'mc' },
    { key: 'guitar', label: 'Guitar', prefix: 'gt' },
    { key: 'drum', label: 'Drum', prefix: 'dr' },
    { key: 'amplifier', label: 'Amplifier', prefix: 'amp' },
    { key: 'speaker', label: 'Speaker', prefix: 'sp' },
    { key: 'keyboard', label: 'Keyboard', prefix: 'kb' },
    { key: 'audio mixers', label: 'Audio Mixers', prefix: 'am' },
    { key: 'cables', label: 'Cables', prefix: 'cb' },
    { key: 'visuals', label: 'Visuals', prefix: 'vs' },
    { key: 'misc', label: 'Misc', prefix: 'misc' }
];
const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];
const ASSIGNED_TO_ROLE_OPTIONS = ["Admin", "Staff", "Ministry Leader"];
const PLEDGE_DONATE_OPTIONS = ["Pledge", "Donated"];
const REPAIR_STATUS_OPTIONS = ["None", "Repair", "Damaged", "Dispose"];

const InventoryForm = ({ user, role }) => {
    const [item, setItem] = useState(""); 
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [lastMaintenance, setLastMaintenance] = useState("");
    const [category, setCategory] = useState("misc");
    const [categoryKey, setCategoryKey] = useState('misc');
    const [categoryId, setCategoryId] = useState('');
    const [condition, setCondition] = useState("Good");
    const [brand, setBrand] = useState("");
    const [pledgeDonate, setPledgeDonate] = useState("Pledge");
    const [repairStatus, setRepairStatus] = useState("None");
    const [ministries, setMinistries] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All Categories");
    const [filterBrand, setFilterBrand] = useState("");
    const [filterPledgeDonate, setFilterPledgeDonate] = useState("");
    const [filterRepairStatus, setFilterRepairStatus] = useState("");
    const [categorySort, setCategorySort] = useState('asc');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedCount, setArchivedCount] = useState(0);
    const [confirmModal, setConfirmModal] = useState({ visible: false, mode: '', id: null });

    useEffect(() => {
        fetchInventory(showArchived);
        fetchArchivedCount();
    }, [showArchived]);

    useEffect(() => {
        fetchMinistries();
    }, [role]);

    const fetchMinistries = async () => {
        try {
            const response = await api.getMinistries(role);
            if (Array.isArray(response.data)) {
                setMinistries(response.data.map((min) => min.name || min).filter(Boolean));
            }
        } catch (err) {
            console.error("Failed to load ministries:", err);
        }
    };

    const getNextCategoryId = (prefix) => {
        if (!prefix) return `${prefix}-000`;
        const existing = inventoryItems
            .map(i => i.categoryId)
            .filter(Boolean)
            .filter(id => id.startsWith(prefix + '-'))
            .map(id => parseInt(id.split('-')[1], 10) || 0);
        const max = existing.length ? Math.max(...existing) : 0;
        const next = max + 1;
        return `${prefix}-${String(next).padStart(3, '0')}`;
    };

    const fetchInventory = async (archived = false) => {
        setLoading(true);
        try {
            const response = await api.getInventory(archived ? 'Archived' : 'Active');
            if (Array.isArray(response.data)) {
                setInventoryItems(response.data);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            setLoading(false);
        }
    };

    const fetchArchivedCount = async () => {
        try {
            const response = await api.getInventory('Archived');
            if (Array.isArray(response.data)) {
                setArchivedCount(response.data.length);
            }
        } catch (err) {
            console.error("Failed to fetch archived inventory count:", err);
        }
    };

    const handleAction = async () => {
        if (!item || !quantity) {
            return alert("Please fill in Item Name and Quantity");
        }

        const currentUserName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'System';
        const inventoryData = {
            itemName: item,
            quantity: Number(quantity),
            location,
            assignedTo,
            lastMaintenance,
            category: categoryKey,
            categoryId: categoryId,
            condition,
            brand,
            pledgeDonate,
            repairStatus,
            lastEditedBy: currentUserName
        };

        try {
            if (isEditing) {
                await api.updateInventory(editId, inventoryData);
            } else {
                await api.createInventory(inventoryData);
            }
            resetForm();
            fetchInventory(showArchived);
            fetchArchivedCount();
        } catch (err) {
            alert("Could not save to database.");
        }
    };

    const resetForm = () => {
        setItem(""); setQuantity(""); setLocation(""); setAssignedTo(""); setLastMaintenance("");
        setCategory('misc'); setCategoryKey('misc'); setCategoryId(''); setCondition("Good"); setBrand(""); setPledgeDonate("Pledge"); setRepairStatus("None");
        setIsEditing(false); setEditId(null);
    };

    const startEdit = (m) => {
        setIsEditing(true);
        setEditId(m._id);
        setItem(m.itemName || m.item || "");
        setQuantity(m.quantity || "");
        setLocation(m.location || "");
        setAssignedTo(m.assignedTo || "");
        setLastMaintenance(m.lastMaintenance || "");
        // derive category key and id for legacy/edited items
        if (m.categoryId) {
            const prefix = (m.categoryId || '').split('-')[0];
            const found = CATEGORY_MAP.find(c => c.prefix === prefix);
            setCategoryKey(found ? found.key : 'misc');
            setCategoryId(m.categoryId);
            setCategory(found ? found.key : 'misc');
        } else {
            setCategoryKey(m.category || 'misc');
            setCategoryId(m.categoryId || getNextCategoryId((CATEGORY_MAP.find(c => c.key === (m.category || 'misc')) || CATEGORY_MAP[CATEGORY_MAP.length-1]).prefix));
            setCategory(m.category || 'misc');
        }
        setCondition(m.condition || "Good");
        setBrand(m.brand || "");
        setPledgeDonate(m.pledgeDonate || "Pledge");
        setRepairStatus(m.repairStatus || "None");
    };

    const archiveItem = async (id) => {
        try {
            await api.archiveInventory(id);
            fetchInventory(showArchived);
            fetchArchivedCount();
        } catch (err) {
            console.error(err);
            alert("Failed to archive item.");
        }
    };

    const unarchiveItem = async (id) => {
        try {
            await api.unarchiveInventory(id);
            fetchInventory(showArchived);
            fetchArchivedCount();
        } catch (err) {
            console.error(err);
            alert("Failed to unarchive item.");
        }
    };

    const openConfirmModal = (mode, id) => {
        setConfirmModal({ visible: true, mode, id });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ visible: false, mode: '', id: null });
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.id) return;

        if (confirmModal.mode === 'archive') {
            await archiveItem(confirmModal.id);
        } else if (confirmModal.mode === 'unarchive') {
            await unarchiveItem(confirmModal.id);
        }

        closeConfirmModal();
    };

    const getCategoryCount = (catKey) => {
        return inventoryItems.filter(item => item.category === catKey).length;
    };

    const filteredInventory = inventoryItems.filter(m => {
        const name = (m.itemName || m.item || "").toLowerCase();
        const loc = (m.location || "").toLowerCase();
        const cid = (m.categoryId || '').toLowerCase();
        const search = searchQuery.toLowerCase();

        const matchesSearch = name.includes(search) || loc.includes(search) || cid.includes(search);
        const matchesCategory = filterCategory === "All Categories" || m.category === filterCategory;
        
        const matchesBrand = !filterBrand || (m.brand || '').toLowerCase().includes(filterBrand.toLowerCase());
        const matchesPledgeDonate = !filterPledgeDonate || filterPledgeDonate === 'All' || (m.pledgeDonate || '') === filterPledgeDonate;
        const matchesRepairStatus = !filterRepairStatus || filterRepairStatus === 'All' || (m.repairStatus || '') === filterRepairStatus;

        return matchesSearch && matchesCategory && matchesBrand && matchesPledgeDonate && matchesRepairStatus;
    });

    return (
        <div className="member-directory-container">
            <div className="directory-header">
                <h2 style={{ color: '#1a1a1a' }}>Inventory Management</h2>
                <p style={{ color: '#666' }}>Track church resources and equipment</p>
            </div>

            <div className="quick-add-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
                <select value={categoryKey} onChange={(e) => {
                    const key = e.target.value;
                    setCategoryKey(key);
                    const map = CATEGORY_MAP.find(c => c.key === key) || CATEGORY_MAP.find(c => c.key === 'misc');
                    const nextId = getNextCategoryId(map.prefix);
                    setCategoryId(nextId);
                    setCategory(key);
                }} style={{ minWidth: '160px' }}>
                    {CATEGORY_MAP.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item Name" />
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" style={{ width: '80px' }} />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Office A)" />
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" style={{ minWidth: '140px' }} />
                {/* active/passive removed */}
                <select value={pledgeDonate} onChange={(e) => setPledgeDonate(e.target.value)} style={{ minWidth: '120px' }}>
                    {PLEDGE_DONATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={repairStatus} onChange={(e) => setRepairStatus(e.target.value)} style={{ minWidth: '120px' }}>
                    {REPAIR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ minWidth: '180px' }}>
                    <option value="">Assign to ministry or role</option>
                    <optgroup label="Ministries">
                        {ministries.length > 0 ? ministries.map((ministry) => (
                            <option key={ministry} value={ministry}>{ministry}</option>
                        )) : <option value="" disabled>Loading ministries…</option>}
                    </optgroup>
                    <optgroup label="Roles">
                        {ASSIGNED_TO_ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>{roleOption}</option>
                        ))}
                    </optgroup>
                </select>
                <input type="date" value={lastMaintenance} onChange={(e) => setLastMaintenance(e.target.value)} />
                
                {/* category select replaced by categoryKey selector above */}

                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                    {CONDITION_OPTIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                </select>
                
                <button className="add-btn-primary" onClick={handleAction} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                    {isEditing ? "Update Item" : "Add Item"}
                </button>
                <button 
                    className="archive-toggle-btn" 
                    onClick={() => setShowArchived(prev => !prev)}
                    disabled={archivedCount === 0 && !showArchived}
                    style={{
                        background: showArchived ? '#10b981' : '#64748b',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: archivedCount === 0 && !showArchived ? 'not-allowed' : 'pointer',
                        opacity: archivedCount === 0 && !showArchived ? 0.6 : 1
                    }}
                >
                    {showArchived ? 'Active Items' : `Archived${archivedCount ? ` (${archivedCount})` : ''}`}
                </button>
                {isEditing && <button className="cancel-btn" onClick={resetForm}>Cancel</button>}
            </div>

            <div className="stats-container" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                {CATEGORY_MAP.map((c) => (
                    <div key={c.key} className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>{c.label}</span>
                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount(c.key)}</span>
                    </div>
                ))}
            </div>

            <div className="search-filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input 
                    type="text" 
                    placeholder="Search inventory by name or location..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />

                <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                    <option value="All Categories">All Categories</option>
                    {(() => {
                        const sorted = [...CATEGORY_MAP].sort((a,b) => categorySort === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label));
                        return sorted.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>);
                    })()}
                </select>
                <select value={categorySort} onChange={e => setCategorySort(e.target.value)} title="Sort categories" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                </select>

                <input
                    placeholder="Brand"
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '140px' }}
                />


                {/* Active/Passive filter removed */}

                <select value={filterPledgeDonate} onChange={e => setFilterPledgeDonate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="">Pledge/Donate</option>
                    <option value="All">All</option>
                    {PLEDGE_DONATE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <select value={filterRepairStatus} onChange={e => setFilterRepairStatus(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="">Repair Status</option>
                    <option value="All">All</option>
                    {REPAIR_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <button onClick={() => {
                    setFilterBrand(''); setFilterPledgeDonate(''); setFilterRepairStatus(''); setFilterCategory('All Categories'); setSearchQuery('');
                }} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#111' }}>Clear Filters</button>
            </div>

            <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <table className="member-table" style={{ minWidth: '1800px' }}>
                    <thead>
                        <tr>
                            <th>CATEGORY ID</th>
                            <th>ITEM</th>
                            <th>CATEGORY</th>
                            <th>BRAND</th>
                            {/* ACTIVE/PASSIVE column removed */}
                            <th>PLEDGE/DONATE</th>
                            <th>REPAIR STATUS</th>
                            <th>QUANTITY</th>
                            <th>CONDITION</th>
                            <th>LOCATION</th>
                            <th>ASSIGNED TO</th>
                            <th>LAST MAINTENANCE</th>
                            <th>LAST UPDATED</th>
                            <th>EDITED BY</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>Loading Inventory Data...</td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>No inventory items found.</td></tr>
                        ) : filteredInventory.map((m) => (
                            <tr key={m._id}>
                                <td>{m.categoryId || '—'}</td>
                                <td><strong>{m.itemName || m.item}</strong></td>
                                <td>{m.category}</td>
                                <td>{m.brand || '—'}</td>
                                {/* activePassive removed */}
                                <td>{m.pledgeDonate || '—'}</td>
                                <td>{m.repairStatus || '—'}</td>
                                <td>{m.quantity}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        backgroundColor: m.condition === 'Excellent' ? '#e6f4ea' : '#feeedc',
                                        color: m.condition === 'Excellent' ? '#137333' : '#b06000'
                                    }}>{m.condition}</span>
                                </td>
                                <td>{m.location || '—'}</td>
                                <td>{m.assignedTo || '—'}</td>
                                <td>{m.lastMaintenance || '—'}</td>
                                <td>{m.updatedAt ? new Date(m.updatedAt).toLocaleString() : '—'}</td>
                                <td>{m.lastEditedBy || '—'}</td>
                                <td>
                                    {showArchived ? (
                                        <button className="action-icon unarchive" onClick={() => openConfirmModal('unarchive', m._id)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>♻️</button>
                                    ) : (
                                        <>
                                            <button className="action-icon edit" onClick={() => startEdit(m)} style={{ marginRight: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>✏️</button>
                                            <button className="action-icon archive" onClick={() => openConfirmModal('archive', m._id)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>🗃️</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {confirmModal.visible && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={closeConfirmModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Confirm inventory action"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '420px',
                            padding: '24px',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.2)'
                        }}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#111827' }}>
                            {confirmModal.mode === 'archive' ? 'Archive Item?' : 'Restore Item?'}
                        </h3>
                        <p style={{ marginTop: 0, marginBottom: '20px', color: '#4b5563', lineHeight: 1.5 }}>
                            {confirmModal.mode === 'archive'
                                ? 'This item will be moved to the archived list and hidden from the active inventory view.'
                                : 'This item will be restored back to the active inventory list.'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={closeConfirmModal} style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid #2563eb', background: '#ffffff', cursor: 'pointer', color: '#111827', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                                Cancel
                            </button>
                            <button onClick={handleConfirmAction} style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)' }}>
                                {confirmModal.mode === 'archive' ? 'Archive' : 'Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryForm;