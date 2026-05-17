import { useEffect, useState } from 'react';
import api from '../../api';

const CATEGORY_OPTIONS = [
    "Instruments",
    "Audio Equipment",
    "Visual Equipment",
    "Documents",
    "Furniture",
    "Miscellaneous"
];

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];

const InventoryForm = () => {
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("Instruments");
    const [quantity, setQuantity] = useState("");
    const [condition, setCondition] = useState(""); 
    const [location, setLocation] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [lastMaintenance, setLastMaintenance] = useState("");
    
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
            console.error("Database connection failed:", err);
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!itemName || !category || !quantity || !location) {
            return alert("Please fill in Item Name, Category, Quantity, and Location");
        }

        const itemData = { 
            itemName,
            category,
            quantity: Number(quantity), 
            condition, 
            location,
            assignedTo,
            lastMaintenance: lastMaintenance || new Date().toISOString().split('T')[0]
        };

        try {
            if (isEditing) {
                await api.updateInventoryItem(editId, itemData); 
            } else {
                await api.createInventoryItem(itemData);
            }
            resetForm();
            fetchInventory();
        } catch (err) {
            alert("Could not save to database.");
        }
    };

    const resetForm = () => {
        setItemName(""); setCategory("Instruments"); setQuantity(""); setCondition("Good");
        setLocation(""); setAssignedTo("None"); setLastMaintenance("");
        setIsEditing(false); setEditId(null);
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this item?")) return;
        try {
            await api.deleteInventoryItem(id);
            fetchInventory();
        } catch (err) {
            alert("Delete process failed");
        }
    };

    const startEdit = (item) => {
        setIsEditing(true);
        setEditId(item._id);
        setItemName(item.itemName || "");
        setCategory(item.category || "Instruments");
        setQuantity(item.quantity || "");
        setCondition(item.condition || "Good");
        setLocation(item.location || "");
        setAssignedTo(item.assignedTo || "None");
        setLastMaintenance(item.lastMaintenance || "");
    };

    const getCountByCategory = (cat) => {
        return allInventory
            .filter(item => item.category === cat)
            .reduce((sum, current) => sum + (current.quantity || 0), 0);
    };

    const filteredInventory = (allInventory || []).filter(item => {
        const name = item.itemName || "";
        const loc = item.location || "";
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             loc.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = filterCategory === "All Categories" || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getConditionStyle = (cond) => {
        switch(cond) {
            case 'Excellent': return { bg: '#e6f4ea', text: '#137333' };
            case 'Good': return { bg: '#e8f0fe', text: '#1a73e8' };
            case 'Fair': return { bg: '#fef7e0', text: '#b06000' };
            case 'Poor': return { bg: '#fce8e6', text: '#c5221f' };
            default: return { bg: '#f1f3f4', text: '#3c4043' };
        }
    };

    return (
        <div className="member-directory-container">
            <div className="directory-header" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ color: '#1a1a1a' }}>Inventory Management</h2>
                    <p style={{ color: '#666' }}>Track church resources and equipment</p>
                </div>
            </div>

            <div className="quick-add-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item Name" />
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" style={{ width: '80px' }} />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Sanctuary)" />
                <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Assigned Team" />
                <input type="date" value={lastMaintenance} onChange={(e) => setLastMaintenance(e.target.value)} title="Last Maintenance Date" />
                
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ fontWeight: 'bold', color: '#2563eb' }}>
                    {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                    {CONDITION_OPTIONS.map((cond) => (
                        <option key={cond} value={cond}>{cond}</option>
                    ))}
                </select>
                
                <button className="add-btn-primary" onClick={handleAction}>
                    {isEditing ? "Update Item" : "Add Item"}
                </button>
                {isEditing && <button className="cancel-btn" onClick={resetForm}>Cancel</button>}
            </div>

            <div className="stats-container" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                {["Instruments", "Audio Equipment", "Visual Equipment", "Documents"].map((cat) => (
                    <div key={cat} style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                        <span style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>{cat}</span>
                        <span style={{ color: '#1a1a1a', fontSize: '1.8rem', fontWeight: 'bold' }}>{getCountByCategory(cat)}</span>
                    </div>
                ))}
            </div>

            <div className="search-filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search inventory by name or location..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <select 
                    className="filter-select" 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                    <option value="All Categories">All Categories</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
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
                            <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>Synchronizing with Database...</td></tr>
                        ) : filteredInventory.map((item) => {
                            const condStyle = getConditionStyle(item.condition);
                            return (
                                <tr key={item._id}>
                                    <td><strong>{item.itemName}</strong></td>
                                    <td><span className="ministry-tag" style={{ background: '#f0f4ff', color: '#2563eb' }}>{item.category}</span></td>
                                    <td><strong>{item.quantity}</strong></td>
                                    <td>
                                        <span style={{ 
                                            padding: '4px 8px', 
                                            borderRadius: '12px', 
                                            fontSize: '11px', 
                                            fontWeight: 'bold',
                                            backgroundColor: condStyle.bg,
                                            color: condStyle.text
                                        }}>
                                            {item.condition}
                                        </span>
                                    </td>
                                    <td>{item.location}</td>
                                    <td><span style={{ color: '#555' }}>{item.assignedTo}</span></td>
                                    <td><small>{item.lastMaintenance || "N/A"}</small></td>
                                    <td>
                                        <button className="action-icon edit" onClick={() => startEdit(item)} title="Edit Item">✏️</button>
                                        <button className="action-icon delete" onClick={() => deleteItem(item._id)} title="Delete Item">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default InventoryForm;