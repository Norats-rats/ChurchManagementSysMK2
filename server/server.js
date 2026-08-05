const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const puter = require("@heyputer/puter.js");
puter.authToken = process.env.PUTER_AUTH_TOKEN;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.MOBILE_URL,
    "https://churchmanagementsys.pages.dev",
    "http://localhost:5173",
    "https://church-management-app.lancemanemail.workers.dev",
    "https://www.ecclsync.org",
    "https://ecclsync.org"
  ],
  credentials: true
}));

const mongoURI = process.env.MONGODB_URI; 

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const SettingSchema = new mongoose.Schema({
  key: String,
  value: String
});

const Setting = mongoose.model('Setting', SettingSchema);

const sendOTPEmail = async (email, otp, firstName, isPasswordReset = false) => {
  try {
    const subject = isPasswordReset ? 'Password Reset Code' : 'Verify Your Church Account';
    const title = isPasswordReset ? 'Reset Your Password' : `Welcome, ${firstName}!`;
    const message = isPasswordReset ? 'Use the code below to reset your password:' : 'Please use the code below to activate your account:';

    const { data, error } = await resend.emails.send({
      from: `FBCF Church <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e40af;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otp}</span>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Resend System Error:", err);
    return { success: false, error: err.message };
  }
};

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS & MODELS ---
const Member = mongoose.model('members', new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Member' },
  ministries: { type: [String], default: [] },
  ministry:{ type: String, default: 'None' },
  phone: { type: String },
  birthdate: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Prefer not to say'], default: null },
  profilePicture: { type: String },
  notifications: [{
    message: String,
    type: { type: String, default: 'info' },
    status: { type: String, enum: ['Unread', 'Read'], default: 'Unread' },
    createdAt: { type: Date, default: Date.now }
  }],
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Inactive' }, 
  date: { type: Date, default: Date.now }
}));

const Event = mongoose.model('events', new mongoose.Schema({
  title: String,             
  titleSelection: String,    
  reservationName: String,
  category: String, 
  date: String,     
  time: String,
  room: String,    
  expected: { type: Number, default: 0 },
  attendees: [{ type: String }], 
  type: String,     
  role: String,      
  status: { type: String, default: 'active' }
}, { timestamps: true }));

const Attendance = mongoose.model('attendance', new mongoose.Schema({
  userId: { type: String, required: true },
  eventId: String,                     
  userName: String,                    
  service: String,
  date: String,
  time: String,
  status: { type: String, enum: ['Present', 'Late', 'Absent'], default: 'Present' }
}, { timestamps: true }));

const Prayer = mongoose.model('prayers', new mongoose.Schema({
  name: String,
  initial: String,
  text: String,
  userId: { type: String, required: true },
  tags: [String], 
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  aiResponse: { type: String, default: "" }
}));

const AdvisingRequest = mongoose.model('advisingrequests', new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  concern: { type: String, required: true },
  userId: { type: String, required: true },
  userRole: { type: String, default: 'Member' },
  status: { type: String, enum: ['Pending', 'Accepted', 'Archived'], default: 'Pending' },
  submittedAt: { type: Date, default: Date.now },
  acceptedDate: { type: String, default: '' },
  acceptedTime: { type: String, default: '' },
  acceptedLocation: { type: String, default: '' },
  acceptedBy: { type: String, default: '' },
  acceptedById: { type: String, default: '' },
  ignoredBy: { type: [String], default: [] }
}, { timestamps: true }));

const Ministry = mongoose.model('Ministry', new mongoose.Schema({
  name: { type: String, required: true },
  leader: { type: String, required: true },
  members: { type: Number, default: 0 },
  color: { type: String, default: "#2563eb" },
  status: { type: String, default: "Active" },
  announcementText: { type: String, default: '' },
  joinRequests: [{
    userId: String,
    userName: String,
    userRole: String,
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date }
  }]
}, { timestamps: true }));

const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  location: { type: String },
  assignedTo: { type: String },
  lastMaintenance: { type: String },
  category: { type: String, default: 'Miscellaneous' },
  condition: { type: String, default: 'Good' },
  brand: { type: String, default: '' },
  watts: { type: String, default: '' },
  powerSupply: { type: String, default: '' },
  activePassive: { type: String, default: '' },
  pledgeDonate: { type: String, default: '' },
  repairStatus: { type: String, default: '' },
  lastEditedBy: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Archived'], default: 'Active' }
}, { timestamps: true }));

const Finance = mongoose.model('finances', new mongoose.Schema({
  description: { type: String, required: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  userId: { type: String },
  addedBy: { type: String },
  addedByName: { type: String },
  createdAt: { type: Date, default: Date.now }
}));

app.get('/api/finances', async (req, res) => {
  try {
    const loggedInUserId = req.headers['x-user-id'];
    const loggedInUserRole = req.headers['x-user-role'];

    let query = {};
    if (loggedInUserRole === 'Member') {
      query = { userId: loggedInUserId };
    }

    const transactions = await Finance.find(query).sort({ createdAt: -1 });

    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const stats = { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses };

    res.json({ transactions, stats });
  } catch (err) {
    console.error('Failed to fetch finances:', err);
    res.status(500).json({ error: 'Failed to fetch finances' });
  }
});

app.post('/api/finances', async (req, res) => {
  try {
    const loggedInUserRole = req.headers['x-user-role'];
    const loggedInUserId = req.headers['x-user-id'];
    const loggedInUserName = req.headers['x-user-name'];

    if (!['Admin', 'Ministry Leader', 'Staff'].includes(loggedInUserRole)) {
      return res.status(403).json({ error: 'Forbidden: only staff, ministry leaders or admin can record finances.' });
    }

    const { description, type, amount, date } = req.body;
    if (!description || !type || typeof amount === 'undefined') {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (!['Income', 'Expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type.' });
    }

    let addedByName = (loggedInUserName || '').trim();
    if (!addedByName && loggedInUserId) {
      const member = await Member.findById(loggedInUserId).select('firstName lastName');
      if (member) {
        addedByName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
      }
    }

    const newRecord = new Finance({
      description,
      type,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      addedBy: loggedInUserId || req.body.addedBy || '',
      addedByName: addedByName || req.body.addedByName || '',
      userId: req.body.userId || null
    });

    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Failed to create finance record:', err);
    res.status(400).json({ error: 'Failed to create finance record.' });
  }
});

app.get('/', (req, res) => {
  res.send('Church Management API is Online and Running');
});

// --- AUTH ROUTES ---
app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newMember = new Member({ 
      firstName, 
      lastName, 
      email, 
      password: hashedPassword,
      gender: gender || null,
      otp: generatedOtp,
      status: 'Inactive' 
    });

    await newMember.save();
    await sendOTPEmail(email, generatedOtp, firstName);

    res.status(201).json({ message: "Verification code sent!" });
  } catch (err) {
    console.error("Detailed Register Error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await Member.findOne({ email: email.trim(), otp: otp.trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }
    user.isVerified = true;
    user.status = 'Active';
    await user.save();
    res.json({ success: true, message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Member.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
if (user.status === 'Deactivated' || user.status === 'Inactive' || !user.isVerified) {
  return res.status(403).json({ 
    success: false, 
    message: "Your account is inactive, deactivated, or not yet verified." 
  });
}
    res.json({ success: true, role: user.role, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Member.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    await user.save();

    await sendOTPEmail(email, otp, user.firstName, true);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await Member.findOne({ email, otp });
    if (!user) return res.status(400).json({ message: "Invalid or expired code" });
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.otp = null;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//inventory routes
app.post('/api/inventory', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      itemName: req.body.itemName || req.body.item
    };

    if (!payload.itemName) {
      return res.status(400).json({ error: "Item name is required" });
    }

    const newItem = new Inventory(payload);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error("Failed to create inventory item:", err);
    res.status(400).json({ error: "Failed to create inventory item", details: err.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status === 'Archived') filter.status = 'Archived';
    else if (status === 'Active') filter.status = 'Active';

    const items = await Inventory.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory items" });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update inventory item" });
  }
});

app.patch('/api/inventory/:id/archive', async (req, res) => {
  try {
    const archived = await Inventory.findByIdAndUpdate(req.params.id, { status: 'Archived' }, { new: true });
    if (!archived) return res.status(404).json({ error: "Item not found" });
    res.json(archived);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive item" });
  }
});

app.patch('/api/inventory/:id/unarchive', async (req, res) => {
  try {
    const unarchived = await Inventory.findByIdAndUpdate(req.params.id, { status: 'Active' }, { new: true });
    if (!unarchived) return res.status(404).json({ error: "Item not found" });
    res.json(unarchived);
  } catch (err) {
    res.status(500).json({ error: "Failed to unarchive item" });
  }
});

// --- MINISTRY ROUTES ---
app.post('/api/ministries', async (req, res) => {
  try {
    const newMin = new Ministry(req.body);
    await newMin.save();
    res.status(201).json(newMin);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/ministries/name/:name', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const rawName = decodeURIComponent(req.params.name);
    const ministry = await Ministry.findOne({
      name: new RegExp(`^${rawName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });
    if (!ministry) return res.status(404).json({ error: 'Ministry not found' });
    const result = ministry.toObject();
    if (!['Admin', 'Ministry Leader'].includes(userRole)) {
      result.joinRequests = undefined;
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ministries', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    let list = await Ministry.find().sort({ createdAt: -1 });
    if (!['Admin', 'Ministry Leader'].includes(userRole)) {
      list = list.map(m => {
        const sanitized = m.toObject();
        sanitized.joinRequests = undefined;
        return sanitized;
      });
    }
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/ministries/:id', async (req, res) => {
  try {
    const updated = await Ministry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/ministries/:id/announcement', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userName = (req.headers['x-user-name'] || '').trim();
    if (userRole !== 'Ministry Leader') {
      return res.status(403).json({ error: 'Forbidden: only assigned ministry leaders can announce.' });
    }
    const ministry = await Ministry.findById(req.params.id);
    if (!ministry) return res.status(404).json({ error: 'Ministry not found' });
    if (!userName || ministry.leader?.trim().toLowerCase() !== userName.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden: only the assigned ministry leader can update this announcement.' });
    }
    const { announcementText } = req.body;
    ministry.announcementText = announcementText;
    await ministry.save();
    res.json(ministry);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/ministries/:id/join-request', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (!['Member', 'Staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: only members or staff may request to join a ministry.' });
    }
    const { userId, userName, userRole: requestRole } = req.body;
    if (!userId || !userName) {
      return res.status(400).json({ error: 'Missing request metadata.' });
    }
    const ministry = await Ministry.findById(req.params.id);
    if (!ministry) return res.status(404).json({ error: 'Ministry not found' });
    const existing = ministry.joinRequests.find(r => r.userId === userId && r.status === 'Pending');
    if (existing) return res.status(409).json({ error: 'A pending join request already exists.' });
    ministry.joinRequests.push({
      userId,
      userName,
      userRole: requestRole || userRole,
      status: 'Pending',
      requestedAt: new Date()
    });
    await ministry.save();
    res.status(201).json({ success: true, request: ministry.joinRequests[ministry.joinRequests.length - 1] });
  } catch (err) { console.error(err); res.status(400).json({ error: err.message }); }
});

app.patch('/api/ministries/:id/join-request/:requestId/approve', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (!['Admin', 'Ministry Leader'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: only ministry leaders and admin can approve requests.' });
    }
    const ministry = await Ministry.findById(req.params.id);
    if (!ministry) return res.status(404).json({ error: 'Ministry not found' });
    const request = ministry.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    request.status = 'Approved';
    request.respondedAt = new Date();
    ministry.members = (ministry.members || 0) + 1;
    await ministry.save();
    const member = await Member.findById(request.userId);
    if (member) {
      const currentMinistries = Array.isArray(member.ministries)
        ? [...member.ministries]
        : member.ministry ? [member.ministry] : [];
      if (!currentMinistries.includes(ministry.name)) {
        currentMinistries.push(ministry.name);
      }
      await Member.findByIdAndUpdate(request.userId, {
        ministries: currentMinistries,
        ministry: currentMinistries[0] || 'None'
      });
    }
    res.json({ success: true, request });
  } catch (err) { console.error(err); res.status(400).json({ error: err.message }); }
});

app.patch('/api/ministries/:id/join-request/:requestId/reject', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (!['Admin', 'Ministry Leader'].includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: only ministry leaders and admin can reject requests.' });
    }
    const ministry = await Ministry.findById(req.params.id);
    if (!ministry) return res.status(404).json({ error: 'Ministry not found' });
    const request = ministry.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    request.status = 'Rejected';
    request.respondedAt = new Date();
    await ministry.save();
    res.json({ success: true, request });
  } catch (err) { console.error(err); res.status(400).json({ error: err.message }); }
});

app.delete('/api/ministries/:id', async (req, res) => {
  try {
    await Ministry.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MEMBER ROUTES ---
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find().sort({ date: -1 }).select('-password');
    res.json(members);
  } catch (err) { res.status(500).json({ error: "Failed to fetch members" }); }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const m = await Member.findById(req.params.id).select('-password');
    if (!m) return res.status(404).json({ error: 'Member not found' });
    res.json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/members', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.gender === 'Other' || data.gender === 'Non-binary') {
      data.gender = 'Prefer not to say';
    }
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    if (!Array.isArray(data.ministries)) {
      data.ministries = Array.isArray(data.ministry) ? data.ministry : data.ministry ? [data.ministry] : [];
    }
    data.ministries = data.ministries.filter(Boolean);
    if (!data.ministry) {
      data.ministry = data.ministries[0] || 'None';
    }
    const newMember = new Member(data);
    await newMember.save();
    const out = newMember.toObject();
    delete out.password; // never return password hash
    res.status(201).json(out);
  } catch (err) { res.status(400).json({ error: "Failed to create record" }); }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.gender === 'Other' || data.gender === 'Non-binary') {
      data.gender = 'Prefer not to say';
    }
    if (data.password && data.password.trim() !== "") {
      data.password = await bcrypt.hash(data.password, 10);
    } else { delete data.password; }
    if (data.ministries && !Array.isArray(data.ministries)) {
      data.ministries = [data.ministries].filter(Boolean);
    }
    if (!Array.isArray(data.ministries) && data.ministry) {
      data.ministries = [data.ministry];
    }
    if (Array.isArray(data.ministries)) {
      data.ministries = data.ministries.filter(Boolean);
      if (!data.ministry) {
        data.ministry = data.ministries[0] || 'None';
      }
    }
    const updated = await Member.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    const out = updated ? updated.toObject() : null;
    if (out && out.password) delete out.password;
    res.json(out);
  } catch (err) { res.status(400).json({ error: "Failed to update record" }); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) { res.status(500).json({ error: "Failed to delete" }); }
});

// --- ATTENDANCE & EVENTS ---
app.get('/api/attendance', async (req, res) => {
  try {
    const records = await Attendance.find({}).sort({ createdAt: -1 });
    return res.json(records);
  } catch (err) { 
    console.error("❌ GET Attendance Route Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch attendance records safely" }); 
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    let { userId, eventId, date, time, status } = req.body;

    const rawQrString = req.body.qrData || req.body.text || req.body.data;
    if (rawQrString && typeof rawQrString === 'string' && rawQrString.includes('eventId=')) {
      const queryString = rawQrString.split('?')[1];
      if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        if (!eventId || eventId === 'undefined') eventId = urlParams.get('eventId');
        if (!userId || userId === 'undefined') userId = urlParams.get('userId');
      }
    }

    if (!eventId || eventId === 'undefined' || eventId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid or missing Event ID sequence.' });
    }
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid or missing User ID sequence.' });
    }

    const alreadyLogged = await Attendance.findOne({ eventId, userId });
    if (alreadyLogged) {
      return res.status(200).json({ success: true, message: 'Attendance already recorded!' });
    }

    let userName = "Unknown Member";
    try {
      const memberDoc = await Member.findById(userId);
      if (memberDoc) {
        userName = `${memberDoc.firstName || ''} ${memberDoc.lastName || ''}`.trim() || memberDoc.email || "Unknown Member";
      }
    } catch (err) {
      console.error("Name lookup tracking error:", err.message);
    }

    const newAttendance = new Attendance({
      userId,
      eventId,
      userName,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: status || 'Present'
    });

    await newAttendance.save();
    return res.status(201).json({ success: true, data: newAttendance });
  } catch (error) {
    console.error("Attendance log creation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/events/:id/toggle-attendance', async (req, res) => {
  try {
    const { userId } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send("Event not found");

    const index = event.attendees.indexOf(userId);
    if (index === -1) {
      event.attendees.push(userId);
    } else {
      event.attendees.splice(index, 1);
    }
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).send("Error toggling attendance: " + err.message);
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { date, time, room } = req.body;
    const clash = await Event.findOne({ date, time, room });

    if (clash) {
      const standardSlots = ["08:00 AM", "10:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];
      const bookedEvents = await Event.find({ date, room });
      const bookedTimes = bookedEvents.map(e => e.time);
      const suggestions = standardSlots.filter(slot => !bookedTimes.includes(slot));

      return res.status(409).json({ 
        error: "Schedule Conflict", 
        message: `The ${room} is already booked at ${time}.`,
        suggestions: suggestions.length > 0 ? suggestions : ["No other slots available today"]
      });
    }
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: "Failed to create event" });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("Fetch Events Error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } 
    );
    if (!updatedEvent) return res.status(404).send("Event not found");
    res.json(updatedEvent);
  } catch (err) {
    res.status(400).send("Error updating event: " + err.message);
  }
});

app.patch('/api/events/:id/archive', async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'archived' } },
      { new: true }
    );
    res.json(updatedEvent);
  } catch (err) {
    doc.status(400).json({ error: "Failed to archive event" });
  }
});

// --- ATTENDANCE & EVENTS ---
app.post('/api/events/scan-qr', async (req, res) => {
  try {
    let eventId = req.body.eventId;
    let userId = req.body.userId;

    const rawQrString = req.body.qrData || req.body.text || req.body.data || req.body.qrCode;
    if (rawQrString && typeof rawQrString === 'string' && rawQrString.includes('eventId=')) {
      try {
        const queryString = rawQrString.split('?')[1];
        if (queryString) {
          const urlParams = new URLSearchParams(queryString);
          if (!eventId || eventId === 'undefined') {
            eventId = urlParams.get('eventId');
          }
          if (!userId || userId === 'undefined') {
            userId = urlParams.get('userId');
          }
        }
      } catch (urlErr) {
        console.error("⚠️ Error parsing QR URL string:", urlErr.message);
      }
    }

    if (eventId === 'undefined' || !eventId) eventId = undefined;
    if (userId === 'undefined' || !userId) userId = undefined;

    console.log("➡️ Processing incoming scan request logic:", { eventId, userId });

    if (!eventId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing parameters. Received eventId: ${eventId}, userId: ${userId}` 
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event record not found in database.' });
    }
    let userName = "Unknown Member";
    try {
      const memberDoc = await Member.findById(userId);
      if (memberDoc) {
        userName = `${memberDoc.firstName || ''} ${memberDoc.lastName || ''}`.trim() || memberDoc.email || "Unknown Member";
      }
    } catch (memErr) {
      console.error("⚠️ Failed to look up member profile name:", memErr.message);
    }
    const existingAttendance = await Attendance.findOne({ eventId, userId });
    if (existingAttendance) {
      return res.status(200).json({ 
        success: true, 
        message: 'User attendance is already recorded in logs.',
        eventTitle: event.titleSelection || event.title 
      });
    }
    const newAttendanceLog = new Attendance({
      userId: userId,
      eventId: eventId,
      userName: userName,
      date: event.date || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'Present'
    });

    await newAttendanceLog.save();

    if (!event.attendees.includes(userId)) {
      event.attendees.push(userId);
      await event.save();
    }

    return res.status(200).json({ 
      success: true, 
      message: `Attendance successfully recorded for ${userName}!`,
      eventTitle: event.titleSelection || event.title 
    });

  } catch (error) {
    console.error("❌ Scan QR Attendance Route Error:", error);
    return res.status(500).json({ success: false, message: 'Internal server schema configuration error.' });
  }
});

// --- PRAYER ROUTES ---
app.get('/api/prayers', async (req, res) => { 
  try {
    const loggedInUserId = req.headers['x-user-id'];
    const loggedInUserRole = req.headers['x-user-role'];

    if (!loggedInUserId) {
      return res.status(401).json({ error: "Unauthorized access: Missing identity headers." });
    }

    let query = {};
    if (loggedInUserRole !== 'Ministry Leader' && loggedInUserRole !== 'Admin') {
      query = { userId: loggedInUserId };
    }
    const prayers = await Prayer.find(query).sort({ date: -1 });
    res.json(prayers);
  } catch (err) { 
    console.error("Error fetching filtered prayers:", err);
    res.status(500).json({ error: "Internal server error fetching records." }); 
  }
});

app.post('/api/prayers', async (req, res) => {
  try {
    const { name, initial, text, userId, tags } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "A valid userId is required." });
    }

    let aiFeedback = "";
    if (process.env.PUTER_AUTH_TOKEN && text) {
      try {
        const prompt = `
          You are an encouraging, compassionate pastoral assistant. 
          A church member has shared this private prayer request: "${text}".
          Provide a brief, deeply supportive response (max 2 sentences) and include one helpful Bible verse reference that provides comfort for this situation. Keep it gentle and professional. Do not return any JSON formatting, just the raw message.
        `;

        const httpResponse = await axios.post(
          'https://api.puter.com/puterai/openai/v1/chat/completions',
          {
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini'
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.PUTER_AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        aiFeedback = httpResponse.data?.choices?.[0]?.message?.content?.trim() || "";
      } catch (aiErr) {
        console.error("💡 Puter background processing failed:", aiErr.message);
        aiFeedback = "Our ministry team is standing in agreement with you.";
      }
    }

    const newPrayer = new Prayer({ 
      name, 
      initial, 
      text, 
      userId, 
      tags,
      aiResponse: aiFeedback 
    });

    await newPrayer.save();
    res.status(201).json(newPrayer);
  } catch (err) { 
    res.status(400).json({ error: "Failed to create prayer request." }); 
  }
});

app.patch('/api/prayers/:id/answer', async (req, res) => {
  try {
    const loggedInUserRole = req.headers['x-user-role'];

    if (loggedInUserRole !== 'Ministry Leader' && loggedInUserRole !== 'Admin') {
      return res.status(403).json({ error: "Forbidden: Only Ministry Leaders can update prayer states." });
    }

    const prayer = await Prayer.findById(req.params.id);
    if (!prayer) {
      return res.status(404).json({ error: "Prayer request not found." });
    }

    const updated = await Prayer.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Answered" } },
      { new: true }
    );

    if (prayer.userId) {
      await Member.findByIdAndUpdate(prayer.userId, {
        $push: {
          notifications: {
            message: "Your prayer is being answered.",
            type: "prayer",
            status: "Unread",
            createdAt: new Date()
          }
        }
      });
    }

    res.json(updated);
  } catch (err) { res.status(400).json({ error: "Failed to update prayer status." }); }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const loggedInUserId = req.headers['x-user-id'];
    if (!loggedInUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user headers.' });
    }

    const member = await Member.findById(loggedInUserId).select('notifications');
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const notifications = Array.isArray(member.notifications)
      ? member.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];

    res.json(notifications);
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

app.patch('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const loggedInUserId = req.headers['x-user-id'];
    if (!loggedInUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user headers.' });
    }

    const updatedMember = await Member.findOneAndUpdate(
      { _id: loggedInUserId, 'notifications._id': req.params.notificationId },
      { $set: { 'notifications.$.status': 'Read' } },
      { new: true }
    ).select('notifications');

    if (!updatedMember) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const notification = updatedMember.notifications.id(req.params.notificationId);
    res.json(notification);
  } catch (err) {
    console.error('Failed to mark notification read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

app.patch('/api/notifications/clear', async (req, res) => {
  try {
    const loggedInUserId = req.headers['x-user-id'];
    if (!loggedInUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user headers.' });
    }

    const updatedMember = await Member.findByIdAndUpdate(
      loggedInUserId,
      { $set: { 'notifications.$[elem].status': 'Read' } },
      { new: true, arrayFilters: [{ 'elem.status': { $ne: 'Read' } }], select: 'notifications' }
    ).select('notifications');

    res.json({ success: true, notifications: updatedMember?.notifications || [] });
  } catch (err) {
    console.error('Failed to clear notifications:', err);
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

app.post('/api/advising', async (req, res) => {
  try {
    const { name, title, concern, userId, userRole } = req.body;
    if (!name || !title || !concern || !userId) {
      return res.status(400).json({ error: 'Name, title, concern, and userId are required.' });
    }

    const newAdvising = new AdvisingRequest({
      name,
      title,
      concern,
      userId,
      userRole: userRole || 'Member',
      status: 'Pending'
    });

    await newAdvising.save();
    res.status(201).json(newAdvising);
  } catch (err) {
    console.error('Advising creation failed:', err);
    res.status(400).json({ error: 'Failed to create advising request.' });
  }
});

app.get('/api/advising', async (req, res) => {
  try {
    const loggedInUserId = req.headers['x-user-id'];
    const loggedInUserRole = req.headers['x-user-role'];
    const query = (loggedInUserRole === 'Admin' || loggedInUserRole === 'Ministry Leader')
      ? {}
      : { userId: loggedInUserId };

    const entries = await AdvisingRequest.find(query).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Failed to fetch advising entries:', err);
    res.status(500).json({ error: 'Failed to fetch advising requests.' });
  }
});

app.patch('/api/advising/:id/accept', async (req, res) => {
  try {
    const loggedInUserRole = req.headers['x-user-role'];
    if (loggedInUserRole !== 'Ministry Leader') {
      return res.status(403).json({ error: 'Forbidden: Only Ministry Leaders may accept advising requests.' });
    }

    const { date, time, location, leaderId, leaderName } = req.body;
    if (!date || !time || !location) {
      return res.status(400).json({ error: 'Date, time, and location are required to accept a request.' });
    }

    const requestItem = await AdvisingRequest.findById(req.params.id);
    if (!requestItem) {
      return res.status(404).json({ error: 'Advising request not found.' });
    }
    if (requestItem.status === 'Archived') {
      return res.status(400).json({ error: 'Cannot accept an archived request.' });
    }

    requestItem.status = 'Accepted';
    requestItem.acceptedDate = date;
    requestItem.acceptedTime = time;
    requestItem.acceptedLocation = location;
    requestItem.acceptedBy = leaderName || '';
    requestItem.acceptedById = leaderId || '';
    await requestItem.save();

    res.json(requestItem);
  } catch (err) {
    console.error('Failed to accept advising request:', err);
    res.status(400).json({ error: 'Failed to accept advising request.' });
  }
});

app.patch('/api/advising/:id/ignore', async (req, res) => {
  try {
    const loggedInUserRole = req.headers['x-user-role'];
    if (loggedInUserRole !== 'Ministry Leader') {
      return res.status(403).json({ error: 'Forbidden: Only Ministry Leaders may ignore advising requests.' });
    }

    const { leaderId } = req.body;
    if (!leaderId) {
      return res.status(400).json({ error: 'Leader ID is required when ignoring a request.' });
    }

    const requestItem = await AdvisingRequest.findById(req.params.id);
    if (!requestItem) {
      return res.status(404).json({ error: 'Advising request not found.' });
    }
    if (requestItem.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be ignored.' });
    }

    const ignoredSet = new Set([...(requestItem.ignoredBy || []), leaderId]);
    requestItem.ignoredBy = [...ignoredSet];

    const totalLeaders = await Member.countDocuments({ role: 'Ministry Leader' });
    if (totalLeaders > 0 && requestItem.ignoredBy.length >= totalLeaders) {
      requestItem.status = 'Archived';
    }

    await requestItem.save();
    res.json(requestItem);
  } catch (err) {
    console.error('Failed to ignore advising request:', err);
    res.status(400).json({ error: 'Failed to ignore advising request.' });
  }
});

// --- SETTINGS ROUTES ---
app.get('/api/settings/announcement', async (req, res) => {
  const ann = await Setting.findOne({ key: 'announcement' });
  res.json({ text: ann ? ann.value : "Welcome to the Fellowship!" });
});

app.post('/api/settings/announcement', async (req, res) => {
  await Setting.findOneAndUpdate(
    { key: 'announcement' },
    { value: req.body.text },
    { upsert: true }
  );
  res.json({ success: true });
 });

// --- AI ROUTES ---
const { OpenAI } = require('openai');

app.post('/api/ai/analyze-schedule', async (req, res) => {
  try {
    const { userRequest, currentEvents } = req.body;

    if (!process.env.PUTER_AUTH_TOKEN) {
      console.error("❌ Configuration Error: Missing PUTER_AUTH_TOKEN inside environment variables.");
      return res.status(500).json({ error: "Missing PUTER_AUTH_TOKEN environment variable." });
    }

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    const prompt = `
      You are a Church Event Assistant. 
      
      CRITICAL CALENDAR CONTEXT:
      - Today's current date is exactly: ${formattedToday}
      - Any slot you suggest MUST be strictly in the FUTURE relative to this date. Never suggest a past date.
      
      User Request: "${userRequest}"
      Existing Booked Events to Avoid Clashing With: ${JSON.stringify(currentEvents)}
      
      Task: Suggest a non-clashing future date, time, and room based on the existing events.
      Strict Requirement: You must return ONLY a raw JSON block. Do not include markdown text, do not wrap your answer in triple backticks, and do not write introduction text.
      Format: {"suggestion": "Your suggestion here", "reason": "Your reason here"}
    `;
    
    const httpResponse = await axios.post(
      'https://api.puter.com/puterai/openai/v1/chat/completions',
      {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PUTER_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let rawText = httpResponse.data?.choices?.[0]?.message?.content || "";

    if (!rawText) {
      throw new Error("No payload text contents returned from Puter OpenAI gateway.");
    }

    rawText = rawText.trim();
    console.log("Extracted payload text:", rawText);

    if (rawText.includes("```")) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawText = jsonMatch[0];
    }

    const startBracket = rawText.indexOf('{');
    const endBracket = rawText.lastIndexOf('}');
    
    if (startBracket !== -1 && endBracket !== -1) {
      rawText = rawText.substring(startBracket, endBracket + 1);
    }

    const parsedData = JSON.parse(rawText);
    let finalizedSuggestion = "";
    if (parsedData.suggestion && typeof parsedData.suggestion === 'object') {
      const s = parsedData.suggestion;
      finalizedSuggestion = `Suggested Schedule: Date: ${s.date || ''}, Time: ${s.time || ''}, Room: ${s.room || ''}`;
    } else {
      finalizedSuggestion = parsedData.suggestion || "No specific suggestion text generated.";
    }

    return res.json({
      suggestion: finalizedSuggestion,
      reason: parsedData.reason || "No conflict detected for this slot."
    });

  } catch (err) {
    const detailedError = err.response && typeof err.response.data === 'string' 
      ? err.response.data.replace(/<[^>]*>/g, '').trim() 
      : (err.response ? JSON.stringify(err.response.data) : err.message);

    console.error("❌ Puter AI Assistant Error Route:", detailedError);
    return res.json({
      suggestion: "Please pick an alternative date, time, and room manually by reviewing the calendar list.",
      reason: `The AI Scheduling Assistant is undergoing brief routine updates. (${detailedError})`
    });
  }
});

app.post('/api/ai/analyze-metrics', async (req, res) => {
  try {
    const { totalMembers, activeMinistries, upcomingEvents, ministryDistribution } = req.body;

    if (!process.env.PUTER_AUTH_TOKEN) {
      console.error("❌ Configuration Error: Missing PUTER_AUTH_TOKEN inside environment variables.");
      return res.status(500).json({ error: "Missing PUTER_AUTH_TOKEN environment variable." });
    }

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];

    const prompt = `
      You are an expert Church Administration and Growth consultant. 
      Today's Reference Date: ${formattedToday}
      
      Review the following live congregation metrics:
      - Total Registered Members: ${totalMembers}
      - Active Ministry Departments: ${activeMinistries}
      - Upcoming Events Scheduled: ${upcomingEvents}
      - Top Ministry Distribution Breakdown: ${JSON.stringify(ministryDistribution)}
      - Top 3 Most Popular Ministries by Membership: ${JSON.stringify(Object.keys(ministryDistribution).slice(0, 3))}
      - Top 3 Least Popular Ministries by Membership: ${JSON.stringify(Object.keys(ministryDistribution).slice(-3))}
      - Top Age Demographic Group: ${ministryDistribution.ageGroups ? Object.keys(ministryDistribution.ageGroups).reduce((a, b) => ministryDistribution.ageGroups[a] > ministryDistribution.ageGroups[b] ? a : b) : 'N/A'}
      - Least Engaged Age Demographic Group: ${ministryDistribution.ageGroups ? Object.keys(ministryDistribution.ageGroups).reduce((a, b) => ministryDistribution.ageGroups[a] < ministryDistribution.ageGroups[b] ? a : b) : 'N/A'}
      - Top attendance rate for events: ${ministryDistribution.eventAttendance ? Object.keys(ministryDistribution.eventAttendance).reduce((a, b) => ministryDistribution.eventAttendance[a] > ministryDistribution.eventAttendance[b] ? a : b) : 'N/A'}
      - Lowest attendance rate for events: ${ministryDistribution.eventAttendance ? Object.keys(ministryDistribution.eventAttendance).reduce((a, b) => ministryDistribution.eventAttendance[a] < ministryDistribution.eventAttendance[b] ? a : b) : 'N/A'}
      - Top gender demographic: ${ministryDistribution.gender ? Object.keys(ministryDistribution.gender).reduce((a, b) => ministryDistribution.gender[a] > ministryDistribution.gender[b] ? a : b) : 'N/A'}
      - Least Engaged gender demographic: ${ministryDistribution.gender ? Object.keys(ministryDistribution.gender).reduce((a, b) => ministryDistribution.gender[a] < ministryDistribution.gender[b] ? a : b) : 'N/A'}

      Task: Provide a sophisticated, cohesive system analysis summary (approx 2-3 sentences). Detail structural strengths based on the membership count vs active channels, age range, gender demographics and assess if event volume is sufficient to maintain community engagement, and offer one highly actionable development recommendation.
      
      Strict Requirement: You must return ONLY a raw JSON block. Do not include markdown formatting, do not wrap your answer in triple backticks, and do not write introduction or conversational text.
      Format: {"suggestion": "Your full comprehensive analysis text goes here"}
    `;

    const httpResponse = await axios.post(
      'https://api.puter.com/puterai/openai/v1/chat/completions',
      {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PUTER_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let rawText = httpResponse.data?.choices?.[0]?.message?.content || "";
    if (!rawText) throw new Error("No payload text contents returned from Puter gateway.");

    rawText = rawText.trim();

    if (rawText.includes("```")) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawText = jsonMatch[0];
    }

    const startBracket = rawText.indexOf('{');
    const endBracket = rawText.lastIndexOf('}');
    if (startBracket !== -1 && endBracket !== -1) {
      rawText = rawText.substring(startBracket, endBracket + 1);
    }

    const parsedData = JSON.parse(rawText);
    
    const finalInsight = parsedData.suggestion || parsedData.insight || "System Analysis completed with no exceptional anomalies recorded.";

    return res.json({ insight: finalInsight });

  } catch (err) {
    const detailedError = err.response && typeof err.response.data === 'string'
      ? err.response.data.replace(/<[^>]*>/g, '').trim()
      : (err.response ? JSON.stringify(err.response.data) : err.message);

    console.error("❌ Puter Analytics Assistant Error Route:", detailedError);

    return res.json({
      insight: "System Analysis: Operation infrastructure channels are performing optimally. Continue monitoring event schedules and member registration metrics to support upcoming community plans."
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));