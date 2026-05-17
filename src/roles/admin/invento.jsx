import { useEffect, useState } from 'react';
import api from '../../api';

const CATEGORY_OPTIONS = ["Instruments", "Audio Equipment", "Visual Equipment", "Documents", "Miscellaneous"];
const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];

const InventoryForm = () => {
    const [item, setItem] = useState(""); 
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [lastMaintenance, setLastMaintenance] = useState("");
    const [category, setCategory] = useState("Instruments");
    const [condition, setCondition] = useState("Good");

    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All Categories");
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [allInventory, setAllInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await api.getInventory();
            if (Array.isArray(response.data)) {
                setAllInventory(response.data);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!item || !quantity) {
            return alert("Please fill in Item Name and Quantity");
        }

        const inventoryData = {
            itemName: item,
            quantity: Number(quantity),
            location,
            assignedTo,
            lastMaintenance,
            category,
            condition
        };

        try {
            if (isEditing) {
                await api.updateInventory(editId, inventoryData);
            } else {
                await api.createInventory(inventoryData);
            }
            resetForm();
            fetchInventory();
        } catch (err) {
            alert("Could not save to database.");
        }
    };

    const resetForm = () => {
        setItem(""); setQuantity(""); setLocation(""); setAssignedTo(""); setLastMaintenance("");
        setCategory("Instruments"); setCondition("Good");
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
        setCategory(m.category || "Instruments");
        setCondition(m.condition || "Good");
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item permanently?")) return;
        try {
            await api.deleteInventory(id);
            fetchInventory();
        } catch (err) {
            alert("Failed to delete item.");
        }
    };

    const getCategoryCount = (catName) => {
        return allInventory.filter(item => item.category === catName).length;
    };

    const filteredInventory = allInventory.filter(m => {
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
                <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Assigned To (e.g. Gen Staff)" />
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
                {isEditing && <button className="cancel-btn" onClick={resetForm}>Cancel</button>}
            </div>

            <div className="stats-container" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
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
                            <th>QUANTITY</th>
                            <th>CONDITION</th>
                            <th>LOCATION</th>
                            <th>ASSIGNED TO</th>
                            <th>LAST MAINTENANCE</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading Inventory Data...</td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No inventory items found.</td></tr>
                        ) : filteredInventory.map((m) => (
                            <tr key={m._id}>
                                <td><strong>{m.itemName || m.item}</strong></td>
                                <td>{m.category}</td>
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
                                <td>
                                    <button className="action-icon edit" onClick={() => startEdit(m)} style={{ marginRight: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>✏️</button>
                                    <button className="action-icon delete" onClick={() => deleteItem(m._id)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>🗑️</button>
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