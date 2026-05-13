const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

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

// --- SCHEMAS & MODELS ---
// Added a check to prevent "OverwriteModelError"

const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({
  key: String,
  value: String
}));

const Member = mongoose.models.members || mongoose.model('members', new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  contact: String,
  address: String,
  role: { type: String, default: 'Member' },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Inactive' }, 
  date: { type: Date, default: Date.now }
}));

const Event = mongoose.models.events || mongoose.model('events', new mongoose.Schema({
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
  role: String      
}, { timestamps: true }));

const Attendance = mongoose.models.attendance || mongoose.model('attendance', new mongoose.Schema({
  userId: { type: String, required: true },
  name: String, 
  service: String,
  date: String,
  time: String,
  status: { type: String, enum: ['Present', 'Late', 'Absent'], default: 'Present' }
}, { timestamps: true }));

const Prayer = mongoose.models.prayers || mongoose.model('prayers', new mongoose.Schema({
  name: String,
  initial: String,
  text: String,
  userId: { type: String, required: true },
  tags: [String], 
  prayingCount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' }
}));

const Ministry = mongoose.models.Ministry || mongoose.model('Ministry', new mongoose.Schema({
  name: { type: String, required: true },
  leader: { type: String, required: true },
  members: { type: Number, default: 0 },
  schedule: { type: String, required: true },
  color: { type: String, default: "#2563eb" },
  growth: { type: String, default: "+0%" },
  status: { type: String, default: "Active" } 
}, { timestamps: true }));

// --- UTILITIES & DB CONNECTION ---

const sendOTPEmail = async (email, otp, firstName, isPasswordReset = false) => {
  try {
    const subject = isPasswordReset ? 'Password Reset Code' : 'Verify Your Church Account';
    const { data, error } = await resend.emails.send({
      from: `FBCF Church <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subject,
      html: `<div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px;">
              <h2>${isPasswordReset ? 'Reset Your Password' : `Welcome, ${firstName}!`}</h2>
              <p>${otp}</p>
            </div>`
    });
    return { success: !error, data };
  } catch (err) { return { success: false, error: err.message }; }
};

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- ROUTES ---

app.get('/', (req, res) => res.send('Church Management API is Online and Running'));

// Auth Routes (Kept your logic)
app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newMember = new Member({ firstName, lastName, email, password: hashedPassword, otp: generatedOtp });
    await newMember.save();
    await sendOTPEmail(email, generatedOtp, firstName);
    res.status(201).json({ message: "Verification code sent!" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await Member.findOne({ email: email.trim(), otp: otp.trim() });
    if (!user) return res.status(400).json({ success: false, message: "Invalid OTP" });
    user.isVerified = true; user.status = 'Active';
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Member.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });
    if (user.status === 'Deactivated' || !user.isVerified) return res.status(403).json({ message: "Inactive/Unverified" });
    res.json({ success: true, role: user.role, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// QR & Attendance Routes
app.get('/api/attendance', async (req, res) => {
  try {
    const records = await Attendance.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/attendance', async (req, res) => {
  try {
    // This is the route the QR code "CheckInHandler" will hit
    const newRecord = new Attendance(req.body);
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Events & Other Routes (Kept your logic)
app.get('/api/events', async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  res.json(events);
});

app.post('/api/events', async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) { res.status(400).json({ error: "Failed" }); }
});

app.get('/api/settings/announcement', async (req, res) => {
  const ann = await Setting.findOne({ key: 'announcement' });
  res.json({ text: ann ? ann.value : "Welcome!" });
});

app.post('/api/settings/announcement', async (req, res) => {
  await Setting.findOneAndUpdate({ key: 'announcement' }, { value: req.body.text }, { upsert: true });
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));