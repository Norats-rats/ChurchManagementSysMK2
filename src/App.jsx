import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';
import churchLogo from './assets/churchlogo.jpg';
import { useFeedbackModal } from './components/shared/feedbackmodal';
import Signup from './components/shared/signup';
import { normalizeRole } from './permissions';
import Dashboard from './roles/admin/dashboard';

const ForgotPasswordView = ({ onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [step, setStep] = useState(1); 
  const { showFeedback, FeedbackModal } = useFeedbackModal();
  const handleRequestReset = async (e) => {
    e.preventDefault();
    try {
      const response = await api.forgotPassword({ email });
      if (response.data.success) {
        setStep(2);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Error sending reset code");
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 7) {
      setNewPasswordError('Password is insecure. Use 7 or more characters.');
      return;
    }

    try {
      const response = await api.resetPassword({ email, otp, newPassword });
      if (response.data.success) {
        showFeedback("Password reset successful!", onGoToLogin);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Invalid code or error");
    }
  };

  return (
    <div className="main-container">
      <div className="login-card">
        <h3 className="welcome-text">{step === 1 ? "Forgot Password" : "Reset Password"}</h3>
        <p className="instruction-text">
          {step === 1 ? "Enter your email to receive a code" : "Enter the code and your new password"}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequestReset}>
            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="signin-button">Send Reset Code</button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit}>
            <div className="input-group">
              <label>Reset Code</label>
              <input 
                type="text" 
                placeholder="000000" 
                onChange={(e) => setOtp(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group">
              <label>New Password</label>
              <input 
                type="password" 
                placeholder="Min. 7 characters" 
                value={newPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPassword(value);
                  setNewPasswordError(value && value.length < 7 ? 'Password is insecure. Use 7 or more characters.' : '');
                }} 
                required 
              />
            </div>
            {newPasswordError && (
              <p style={{ color: '#f87171', marginTop: '8px', fontSize: '0.9rem' }}>{newPasswordError}</p>
            )}
            <button type="submit" className="signin-button">Update Password</button>
          </form>
        )}
        <button 
          onClick={onGoToLogin} 
          className="forgot-link" 
          style={{marginTop: '15px', border: 'none', background: 'none', cursor: 'pointer'}}
        >
          Back to Login
        </button>
        <FeedbackModal />
      </div>
    </div>
  );
};

const LoginScreen = ({ onLoginSuccess, onGoToSignup, onGoToForgot }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [remember, setRemember] = useState(false);
  const { showFeedback, FeedbackModal } = useFeedbackModal();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password.length < 7) {
      setPasswordError('Password is insecure. Use 7 or more characters.');
      return;
    }

    try {
      const response = await api.login({ email, password });
      const data = response.data;
      if (data.success) {
        onLoginSuccess(data.role, data.user, remember);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Connection error");
    }
  };

  return (
    <div className="main-container">
      <div className="header-section">
        <div className="logo-circle">
          <img src={churchLogo} alt="Church Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        <h1>Free Believers in Christ</h1>
        <h2>Fellowship Inc.</h2>
        <p className="subtitle">CHURCH MANAGEMENT SYSTEM</p>
        <FeedbackModal />
      </div>

      <div className="login-card">
        <h3 className="welcome-text">Welcome Back</h3>
        <p className="instruction-text">Sign in to access the church dashboard</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">✉</span>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password"
                value={password} 
                onChange={(e) => {
                  const value = e.target.value;
                  setPassword(value);
                  setPasswordError(value && value.length < 7 ? 'Password is insecure. Use 7 or more characters.' : '');
                }} 
                required 
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {passwordError && (
              <p style={{ color: '#f87171', marginTop: '8px', fontSize: '0.9rem' }}>{passwordError}</p>
            )}
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
            </label>
            <button 
              type="button" 
              className="forgot-link" 
              onClick={onGoToForgot} 
              style={{border:'none', background:'none', cursor:'pointer'}}
            >
              Forgot password?
            </button>
          </div>
          <button type="submit" className="signin-button">Sign In</button>
        </form>
        
        <p className="signup-text">
          Don't have an account? 
          <button 
            onClick={onGoToSignup} 
            style={{background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontWeight:'bold', textDecoration:'underline'}}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [theme, setTheme] = useState('light');
  const [authChecked, setAuthChecked] = useState(false);
  const { showFeedback, FeedbackModal } = useFeedbackModal();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventTitle = params.get('title') || params.get('checkin');
    const eventId = params.get('eventId');

    if (eventTitle && userData) {
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
          showFeedback(`Check-in confirmed for: ${eventTitle}`);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.dispatchEvent(new Event('attendanceUpdated'));
        } catch (err) {
          console.error("QR processing error:", err);
        }
      };
      processQRCheckIn();
    }
  }, [userData]); 

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('theme-dark', storedTheme === 'dark');
    }
    const remembered = localStorage.getItem('rememberedUser');
    const rememberedRole = localStorage.getItem('rememberedRole');
    if (remembered && rememberedRole) {
      try {
        const user = JSON.parse(remembered);
        setUserData(user);
        setUserRole(normalizeRole(user.role || rememberedRole));
        sessionStorage.setItem('loginTimestamp', Date.now().toString());
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.warn('Failed to parse remembered user', err);
      }
    }
    setAuthChecked(true);
  }, [navigate]);

  const handleLoginSuccess = (role, user, remember) => {
    const normalizedRole = normalizeRole(role || user?.role);
    setUserRole(normalizedRole);
    setUserData(user);
    sessionStorage.setItem('loginTimestamp', Date.now().toString());
    if (remember) {
      localStorage.setItem('rememberedUser', JSON.stringify(user));
      localStorage.setItem('rememberedRole', normalizedRole);
    } else {
      localStorage.removeItem('rememberedUser');
      localStorage.removeItem('rememberedRole');
    }
    navigate('/home', { replace: true });
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
  };

  const handleLogout = () => {
    setUserData(null);
    setUserRole(null);
    localStorage.removeItem('rememberedUser');
    localStorage.removeItem('rememberedRole');
    sessionStorage.removeItem('loginTimestamp');
    navigate('/login', { replace: true });
  };

  if (!authChecked) {
    return null;
  }

  const dashboardElement = userData ? (
    <Dashboard
      role={userRole}
      user={userData}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    />
  ) : <Navigate to="/login" replace />;

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to={userData ? '/home' : '/login'} replace />} />
        <Route path="/login" element={
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGoToSignup={() => navigate('/signup')}
            onGoToForgot={() => navigate('/forgot-password')}
          />
        } />
        <Route path="/signup" element={<Signup onGoToLogin={() => navigate('/login')} />} />
        <Route path="/forgot-password" element={<ForgotPasswordView onGoToLogin={() => navigate('/login')} />} />
        <Route path="/home" element={dashboardElement} />
        <Route path="/chat" element={dashboardElement} />
        <Route path="/bible" element={dashboardElement} />
        <Route path="/profile" element={dashboardElement} />
        <Route path="/analytics" element={dashboardElement} />
        <Route path="/prayers" element={dashboardElement} />
        <Route path="/advising" element={dashboardElement} />
        <Route path="/ministry" element={dashboardElement} />
        <Route path="/finances" element={dashboardElement} />
        <Route path="/inventory" element={dashboardElement} />
        <Route path="/events" element={dashboardElement} />
        <Route path="/attendance" element={dashboardElement} />
        <Route path="/members" element={dashboardElement} />
        <Route path="*" element={<Navigate to={userData ? '/home' : '/login'} replace />} />
      </Routes>
      <FeedbackModal />
    </div>
  );
}