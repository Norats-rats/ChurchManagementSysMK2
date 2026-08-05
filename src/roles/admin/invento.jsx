import { useEffect, useState } from 'react';
import api from '../../api';

const CATEGORY_OPTIONS = ["Base", "Instruments", "Audio Equipment", "Visual Equipment", "Documents", "Miscellaneous"];
const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];
const ASSIGNED_TO_ROLE_OPTIONS = ["Admin", "Staff", "Ministry Leader"];
const POWER_SUPPLY_OPTIONS = ["220V", "120V", "N/A", "Battery"];
const ACTIVE_PASSIVE_OPTIONS = ["Active", "Passive"];
const PLEDGE_DONATE_OPTIONS = ["Pledge", "Donated"];
const REPAIR_STATUS_OPTIONS = ["None", "Repair", "Damaged", "Dispose"];
const VOLT_OPTIONS = ["220V", "120V", "12V", "N/A"];
const WIRED_WIRELESS_OPTIONS = ["Wired", "Wireless"];
const EQUIPMENT_TYPE_OPTIONS = ["Projector", "Monitor", "Keyboard", "Drums", "Guitar", "Bass", "Amp", "Cable", "Microphone", "Other"];
const CONNECTOR_TYPE_OPTIONS = ["XLR", "Jack", "HDMI", "VGA", "USB", "RCA", "Speaker Wire", "Other"];
const METER_OPTIONS = ["1m", "3m", "7m", "10m", "15m", "25m", "N/A"];
const CHANNEL_OPTIONS = ["1", "2", "4", "8", "16", "24", "32", "64", "N/A"];

const InventoryForm = ({ user, role }) => {
    const [item, setItem] = useState(""); 
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [lastMaintenance, setLastMaintenance] = useState("");
    const [category, setCategory] = useState("Base");
    const [condition, setCondition] = useState("Good");
    const [brand, setBrand] = useState("");
    const [watts, setWatts] = useState("");
    const [powerSupply, setPowerSupply] = useState("220V");
    const [activePassive, setActivePassive] = useState("Active");
    const [pledgeDonate, setPledgeDonate] = useState("Pledge");
    const [repairStatus, setRepairStatus] = useState("None");
    const [volt, setVolt] = useState("220V");
    const [wiredWireless, setWiredWireless] = useState("Wired");
    const [equipmentType, setEquipmentType] = useState("");
    const [connectorType, setConnectorType] = useState("");
    const [meter, setMeter] = useState("N/A");
    const [channels, setChannels] = useState("N/A");
    const [ministries, setMinistries] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All Categories");
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [archivedCount, setArchivedCount] = useState(0);

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
            category,
            condition,
            brand,
            watts,
            powerSupply,
            activePassive,
            pledgeDonate,
            repairStatus,
            volt,
            wiredWireless,
            equipmentType,
            connectorType,
            meter,
            channels,
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
        setCategory("Base"); setCondition("Good"); setBrand(""); setWatts(""); setPowerSupply("220V"); setActivePassive("Active"); setPledgeDonate("Pledge"); setRepairStatus("None");
        setVolt("220V"); setWiredWireless("Wired"); setEquipmentType(""); setConnectorType(""); setMeter("N/A"); setChannels("N/A");
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
        setCategory(m.category || "Base");
        setCondition(m.condition || "Good");
        setBrand(m.brand || "");
        setWatts(m.watts || "");
        setPowerSupply(m.powerSupply || "220V");
        setActivePassive(m.activePassive || "Active");
        setPledgeDonate(m.pledgeDonate || "Pledge");
        setRepairStatus(m.repairStatus || "None");
        setVolt(m.volt || "220V");
        setWiredWireless(m.wiredWireless || "Wired");
        setEquipmentType(m.equipmentType || "");
        setConnectorType(m.connectorType || "");
        setMeter(m.meter || "N/A");
        setChannels(m.channels || "N/A");
    };

    const archiveItem = async (id) => {
        if (!window.confirm("Archive this item? It will be hidden from the default list.")) return;
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
        if (!window.confirm("Restore this item back to the active inventory?")) return;
        try {
            await api.unarchiveInventory(id);
            fetchInventory(showArchived);
            fetchArchivedCount();
        } catch (err) {
            console.error(err);
            alert("Failed to unarchive item.");
        }
    };

    const getCategoryCount = (catName) => {
        return inventoryItems.filter(item => item.category === catName).length;
    };

    const filteredInventory = inventoryItems.filter(m => {
        const name = (m.itemName || m.item || "").toLowerCase();
        const loc = (m.location || "").toLowerCase();
        const search = searchQuery.toLowerCase();
        
        const matchesSearch = name.includes(search) || loc.includes(search);
        const matchesCategory = filterCategory === "All Categories" || m.category === filterCategory;
        
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="member-directory-container">
            <div className="directory-header">
                <h2 style={{ color: '#1a1a1a' }}>Inventory Management</h2>
                <p style={{ color: '#666' }}>Track church resources and equipment</p>
            </div>

            <div className="quick-add-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
                <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item Name" />
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" style={{ width: '80px' }} />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Office A)" />
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" style={{ minWidth: '140px' }} />
                <input value={watts} onChange={(e) => setWatts(e.target.value)} placeholder="Watts" style={{ width: '100px' }} />
                <select value={powerSupply} onChange={(e) => setPowerSupply(e.target.value)} style={{ minWidth: '110px' }}>
                    {POWER_SUPPLY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={activePassive} onChange={(e) => setActivePassive(e.target.value)} style={{ minWidth: '120px' }}>
                    {ACTIVE_PASSIVE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={pledgeDonate} onChange={(e) => setPledgeDonate(e.target.value)} style={{ minWidth: '120px' }}>
                    {PLEDGE_DONATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={repairStatus} onChange={(e) => setRepairStatus(e.target.value)} style={{ minWidth: '120px' }}>
                    {REPAIR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={volt} onChange={(e) => setVolt(e.target.value)} style={{ minWidth: '110px' }}>
                    {VOLT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={wiredWireless} onChange={(e) => setWiredWireless(e.target.value)} style={{ minWidth: '110px' }}>
                    {WIRED_WIRELESS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} style={{ minWidth: '140px' }}>
                    <option value="">Type</option>
                    {EQUIPMENT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={connectorType} onChange={(e) => setConnectorType(e.target.value)} style={{ minWidth: '140px' }}>
                    <option value="">Connector</option>
                    {CONNECTOR_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={meter} onChange={(e) => setMeter(e.target.value)} style={{ minWidth: '110px' }}>
                    {METER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={channels} onChange={(e) => setChannels(e.target.value)} style={{ minWidth: '110px' }}>
                    {CHANNEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
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
                
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

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
                <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Base</span>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount("Base")}</span>
                </div>
                <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Instruments</span>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount("Instruments")}</span>
                </div>
                <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Audio Equipment</span>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount("Audio Equipment")}</span>
                </div>
                <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Visual Equipment</span>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount("Visual Equipment")}</span>
                </div>
                <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, border: '1px solid #eee' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Documents</span>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCategoryCount("Documents")}</span>
                </div>
            </div>

            <div className="search-filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                    type="text" 
                    placeholder="Search inventory by name or location..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                    <option value="All Categories">All Categories</option>
                    {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            <div className="table-container">
                <table className="member-table">
                    <thead>
                        <tr>
                            <th>ITEM</th>
                            <th>CATEGORY</th>
                            <th>BRAND</th>
                            <th>TYPE</th>
                            <th>VOLT</th>
                            <th>WATTS</th>
                            <th>POWER SUPPLY</th>
                            <th>CONNECTOR</th>
                            <th>WIRED/WIRELESS</th>
                            <th>METER</th>
                            <th>CHANNELS</th>
                            <th>ACTIVE/PASSIVE</th>
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
                            <tr><td colSpan="23" style={{ textAlign: 'center', padding: '20px' }}>Loading Inventory Data...</td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan="23" style={{ textAlign: 'center', padding: '20px' }}>No inventory items found.</td></tr>
                        ) : filteredInventory.map((m) => (
                            <tr key={m._id}>
                                <td><strong>{m.itemName || m.item}</strong></td>
                                <td>{m.category}</td>
                                <td>{m.brand || '—'}</td>
                                <td>{m.equipmentType || '—'}</td>
                                <td>{m.volt || '—'}</td>
                                <td>{m.watts || '—'}</td>
                                <td>{m.powerSupply || '—'}</td>
                                <td>{m.connectorType || '—'}</td>
                                <td>{m.wiredWireless || '—'}</td>
                                <td>{m.meter || '—'}</td>
                                <td>{m.channels || '—'}</td>
                                <td>{m.activePassive || '—'}</td>
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
                                        <button className="action-icon unarchive" onClick={() => unarchiveItem(m._id)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>♻️</button>
                                    ) : (
                                        <>
                                            <button className="action-icon edit" onClick={() => startEdit(m)} style={{ marginRight: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>✏️</button>
                                            <button className="action-icon archive" onClick={() => archiveItem(m._id)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>🗃️</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryForm;