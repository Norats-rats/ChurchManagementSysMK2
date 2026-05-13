import { useEffect, useState } from 'react';
import api from './api';
import './App.css';
import Signup from './components/shared/signup';
import Dashboard from './roles/admin/dashboard';

const ForgotPasswordView = ({ onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    try {
      const response = await api.forgotPassword({ email });
      if (response.data.success) {
        setStep(2);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error sending reset code");
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.resetPassword({ email, otp, newPassword });
      if (response.data.success) {
        alert("Password reset successful!");
        onGoToLogin();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid code or error");
    }
  };

  return (
    <div className="main-container">
      <div className="login-card">
        <h3 className="welcome-text">{step === 1 ? "Forgot Password" : "Reset Password"}</h3>
        <p className="instruction-text">
          {step === 1 ? "Enter your email to receive a code" : "Enter the code sent to your email"}
        </p>
        <form onSubmit={step === 1 ? handleRequestReset : handleResetSubmit}>
          <input 
            type="email" 
            className="input-field"
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          {step === 2 && (
            <>
              <input 
                type="text" 
                className="input-field"
                placeholder="OTP Code" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                className="input-field"
                placeholder="New Password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </>
          )}
          <button type="submit" className="login-btn">
            {step === 1 ? "Send Code" : "Reset Password"}
          </button>
        </form>
        <button 
          onClick={onGoToLogin} 
          style={{marginTop: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLoginSuccess, onGoToSignup, onGoToForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login({ email, password });
      onLoginSuccess(res.data.user.role, res.data.user);
    } catch (err) {
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="main-container">
      <div className="login-card">
        <h2 className="welcome-text">Welcome Back</h2>
        <p className="instruction-text">Please enter your details to sign in</p>
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            className="input-field"
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            className="input-field"
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <button 
              type="button"
              onClick={onGoToForgot} 
              style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}
            >
              Forgot Password?
            </button>
          </div>
          <button type="submit" className="login-btn">Login</button>
        </form>
        <div style={{marginTop: '25px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px'}}>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Don't have an account? 
            <button 
              onClick={onGoToSignup} 
              style={{background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontWeight:'700', marginLeft: '5px'}}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('login');
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    const eventTitle = params.get('title');

    if (userData && eventId && eventTitle) {
      const processQRCheckIn = async () => {
        try {
          await api.recordAttendance({
            userId: userData._id,
            name: `${userData.firstName} ${userData.lastName}`,
            service: eventTitle,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: 'Present'
          });
          alert(`Check-in confirmed for: ${eventTitle}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("QR processing error:", err);
        }
      };
      processQRCheckIn();
    }
  }, [userData]); 

  const handleLoginSuccess = (role, user) => {
    setUserRole(role);
    setUserData(user);
    setView('dashboard');
  };

  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return (
          <Dashboard 
            role={userRole} 
            user={userData} 
            onLogout={() => {
              setView('login');
              setUserData(null);
              setUserRole(null);
            }} 
          />
        );
      case 'signup':
        return <Signup onGoToLogin={() => setView('login')} />;
      case 'forgot-password':
        return <ForgotPasswordView onGoToLogin={() => setView('login')} />;
      case 'login':
      default:
        return (
          <LoginScreen 
            onLoginSuccess={handleLoginSuccess} 
            onGoToSignup={() => setView('signup')} 
            onGoToForgot={() => setView('forgot-password')} 
          />
        );
    }
  };

  return <div className="App">{renderView()}</div>;
}