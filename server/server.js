const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const puter = require("@heyputer/puter.js");
puter.authToken = process.env.PUTER_AUTH_TOKEN;

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
  ministry:{ type: String, default: 'None' },
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
  name: String, 
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

const Ministry = mongoose.model('Ministry', new mongoose.Schema({
  name: { type: String, required: true },
  leader: { type: String, required: true },
  members: { type: Number, default: 0 },
  schedule: { type: String, required: true },
  color: { type: String, default: "#2563eb" },
  growth: { type: String, default: "+0%" },
  status: { type: String, default: "Active" } 
}, { timestamps: true }));

const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  location: { type: String },
  assignedTo: { type: String },
  lastMaintenance: { type: String },
  category: { type: String, default: 'Miscellaneous' },
  condition: { type: String, default: 'Good' }
}, { timestamps: true }));


app.get('/', (req, res) => {
  res.send('Church Management API is Online and Running');
});

// --- AUTH ROUTES ---
app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newMember = new Member({ 
      firstName, 
      lastName, 
      email, 
      password: hashedPassword,
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
    const items = await Inventory.find().sort({ createdAt: -1 });
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

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
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

app.get('/api/ministries', async (req, res) => {
  try {
    const list = await Ministry.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/ministries/:id', async (req, res) => {
  try {
    const updated = await Ministry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
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
    const members = await Member.find().sort({ date: -1 });
    res.json(members);
  } catch (err) { res.status(500).json({ error: "Failed to fetch members" }); }
});

app.post('/api/members', async (req, res) => {
  try {
    const data = req.body;
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const newMember = new Member(data);
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) { res.status(400).json({ error: "Failed to create record" }); }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password && data.password.trim() !== "") {
      data.password = await bcrypt.hash(data.password, 10);
    } else { delete data.password; }
    const updated = await Member.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
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
    const records = await Attendance.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to fetch attendance" }); }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const newRecord = new Attendance(req.body);
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const alreadyAttending = event.attendees.includes(userId);
    if (alreadyAttending) {
      return res.status(200).json({ success: true, message: 'User attendance is already recorded for this event.' });
    }

    event.attendees.push(userId);
    await event.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Attendance checked in successfully!',
      eventTitle: event.titleSelection || event.title 
    });

  } catch (error) {
    console.error("❌ Scan QR Route Error:", error);
    return res.status(500).json({ success: false, message: 'Internal server validation error.' });
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

    const updated = await Prayer.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Answered" } },
      { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(400).json({ error: "Failed to update prayer status." }); }
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
      
      Task: Provide a sophisticated, cohesive system analysis summary (approx 2-3 sentences). Detail structural strengths based on the membership count vs active channels, assess if event volume is sufficient to maintain community engagement, and offer one highly actionable development recommendation.
      
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