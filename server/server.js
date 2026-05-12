const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

const Member = mongoose.model('members', new mongoose.Schema({
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
  role: String      
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
  prayingCount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' }
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

const Transaction = mongoose.model('transactions', new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  amount: { type: Number, required: true },
  userId: { type: String }
}, { timestamps: true }));


app.get('/', (req, res) => {
  res.send('Church Management API is Online and Running');
});

// AUTH ROUTES
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
    if (user.status === 'Deactivated' || !user.isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: "Your account is deactivated or not yet verified." 
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

// MINISTRY ROUTES
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

// FINANCE ROUTES
app.get('/api/finances', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    res.json({
      transactions,
      stats: { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses, savingsFund: 245000 }
    });
  } catch (err) { res.status(500).json({ error: "Failed to fetch financial data" }); }
});

app.post('/api/finances', async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) { res.status(400).json({ error: "Failed to save transaction" }); }
});

app.post('/api/paymongo/create-session', async (req, res) => {
  const { amount, description, userId } = req.body;

  try {
    const options = {
      method: 'POST',
      url: 'https://api.paymongo.com/v1/checkout_sessions',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
      },
      data: {
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: description,
            line_items: [{ 
              currency: 'PHP', 
              amount: Math.round(amount * 100), 
              description: description, 
              name: 'Church Donation', 
              quantity: 1 
            }],
            payment_method_types: ['gcash', 'paymaya', 'grab_pay', 'card'],
            success_url: `${process.env.FRONTEND_URL}/finances?status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/finances?status=cancelled`,
            metadata: { userId: userId } 
          }
        }
      }
    };

    const response = await axios.request(options);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating PayMongo session');
  }
});

app.post('/api/paymongo/webhook', async (req, res) => {
  const event = req.body.data.attributes;
  const type = req.body.data.type;

  if (type === 'checkout_session.payment.paid') {
    const { amount, description, metadata } = event.data.attributes;
    const newTransaction = new Transaction({
      description: description || "Church Donation",
      type: 'Income',
      amount: amount / 100, 
      userId: metadata.userId,
      date: new Date()
    });

    await newTransaction.save();
    console.log("Donation saved to database!");
  }

  res.status(200).send('Webhook received');
});

// MEMBER ROUTES
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

// ATTENDANCE & EVENTS
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
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
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

app.delete('/api/events/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).send("Event not found");
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).send("Error deleting event: " + err.message);
  }
});

// PRAYER ROUTES
app.get('/api/prayers', async (req, res) => { 
  try {
    const prayers = await Prayer.find().sort({ date: -1 });
    res.json(prayers);
  } catch (err) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/prayers', async (req, res) => {
  try {
    const { name, initial, text, userId, tags } = req.body;
    const newPrayer = new Prayer({ name, initial, text, userId, tags });
    await newPrayer.save();
    res.status(201).json(newPrayer);
  } catch (err) { res.status(400).json({ error: "Error" }); }
});
app.patch('/api/prayers/:id/pray', async (req, res) => {
  try {
    const updated = await Prayer.findByIdAndUpdate(
      req.params.id,
      { $inc: { prayingCount: 1 } },
      { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(400).json({ error: "Failed" }); }
});

app.patch('/api/prayers/:id/answer', async (req, res) => {
  try {
    const updated = await Prayer.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Answered" } },
      { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(400).json({ error: "Failed" }); }
});
app.post('/api/ai/analyze-schedule', async (req, res) => {
  try {
    const { userRequest, currentEvents } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a Church Event Assistant. 
      User Request: "${userRequest}"
      Existing Events: ${JSON.stringify(currentEvents)}
      
      Task: Based on the existing events, suggest a date, time, and room that doesn't clash. 
      Return ONLY a JSON object: { "suggestion": "string", "reason": "string" }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawText = response.text();

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No valid JSON object found in AI response");
    }

    const cleanJson = rawText.substring(firstBrace, lastBrace + 1);
    
    const parsedData = JSON.parse(cleanJson);
    res.json(parsedData);

  } catch (err) {
    console.error("AI Assistant Error:", err);
    res.status(500).json({ error: "AI Assistant failed to parse response" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));