import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';
import churchLogo from './assets/churchlogo.jpg';
import { BackgroundProvider } from './components/shared/backgroundcontext';
import { useFeedbackModal } from './components/shared/feedbackmodal';
import LandingPage from './components/shared/landingpage';
import Signup from './components/shared/signup';
import { normalizeRole } from './permissions';
import Dashboard from './roles/admin/dashboard';
import { getPhDateString, getPhTimeString } from './utils/philippinesTime';

const loadStoredAuth = () => {
  const hasRememberedSession = Boolean(
    localStorage.getItem('rememberedUser')
    && localStorage.getItem('rememberedRole')
    && localStorage.getItem('churchAccessToken')
  );
  const storage = hasRememberedSession ? localStorage : sessionStorage;
  const userData = storage.getItem(hasRememberedSession ? 'rememberedUser' : 'sessionUser');
  const role = storage.getItem(hasRememberedSession ? 'rememberedRole' : 'sessionRole');
  const accessToken = storage.getItem('churchAccessToken');
  const hasStoredAuth = [
    localStorage.getItem('rememberedUser'),
    localStorage.getItem('rememberedRole'),
    localStorage.getItem('churchAccessToken'),
    sessionStorage.getItem('sessionUser'),
    sessionStorage.getItem('sessionRole'),
    sessionStorage.getItem('churchAccessToken')
  ].some(Boolean);

  if (!userData || !role || !accessToken) {
    return { user: null, role: null, hasStoredAuth, parseError: false };
  }

  try {
    const user = JSON.parse(userData);
    return {
      user,
      role: normalizeRole(user.role || role),
      hasStoredAuth: true,
      parseError: false
    };
  } catch {
    return { user: null, role: null, hasStoredAuth: true, parseError: true };
  }
};

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
    <main className="main-container">
      <div className="login-card">
        <h3 className="welcome-text">{step === 1 ? "Forgot Password" : "Reset Password"}</h3>
        <p className="instruction-text">
          {step === 1 ? "Enter your email to receive a code" : "Enter the code and your new password"}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequestReset}>
            <div className="input-group">
              <label htmlFor="reset-email">Email Address</label>
              <input 
                id="reset-email"
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
              <label htmlFor="reset-code">Reset Code</label>
              <input 
                id="reset-code"
                type="text" 
                placeholder="000000" 
                onChange={(e) => setOtp(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group">
              <label htmlFor="new-password">New Password</label>
              <input 
                id="new-password"
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
    </main>
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
      const response = await api.login({ email, password, rememberMe: remember });
      const data = response.data;
      if (data.success) {
        onLoginSuccess(data.role, data.user, remember, data.token);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || "Connection error");
    }
  };

  return (
    <main className="main-container">
      <div className="header-section">
        <div className="logo-circle">
          <img src={churchLogo} alt="Church Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        <h1 style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Free Believers in Christ</h1>
        <h2 style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Fellowship Inc.</h2>
        <p className="subtitle" style={{ color: '#ffffff', textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)' }}>CHURCH MANAGEMENT SYSTEM</p>
        <FeedbackModal />
      </div>

      <div className="login-card">
        <h3 className="welcome-text">Welcome Back</h3>
        <p className="instruction-text">Sign in to access the church dashboard</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">✉</span>
              <input 
                id="login-email"
                type="email" 
                placeholder="Enter your email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                id="login-password"
                className="password-input"
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <span aria-hidden="true">{showPassword ? '👁️‍🗨️' : '👁️'}</span>
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
    </main>
  );
};

export default function App() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [initialAuth] = useState(loadStoredAuth);
  const [userRole, setUserRole] = useState(initialAuth.role);
  const [userData, setUserData] = useState(initialAuth.user);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const { showFeedback, FeedbackModal } = useFeedbackModal();

  // Captured on the very first render, before any route navigation drops the query string,
  // so a member can scan the QR first and log in afterwards.
  const [pendingCheckIn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      eventTitle: params.get('title') || params.get('checkin') || '',
      eventId: params.get('eventId') || ''
    };
  });
  const handledCheckInRef = useRef('');

  useEffect(() => {
    const { eventTitle, eventId } = pendingCheckIn;
    if (!userData || (!eventTitle && !eventId)) return;
    if (handledCheckInRef.current === `${eventId}|${userData._id}`) return;
    handledCheckInRef.current = `${eventId}|${userData._id}`;

    const processQRCheckIn = async () => {
      try {
        const response = await api.recordAttendance({
          userId: userData._id,
          eventId: eventId || undefined,
          name: `${userData.firstName} ${userData.lastName}`,
          service: eventTitle,
          date: getPhDateString(),
          time: getPhTimeString(),
          status: 'Present'
        });
        const serverMessage = response.data?.message;
        showFeedback(serverMessage ? `${serverMessage}${eventTitle ? ` (${eventTitle})` : ''}` : `Check-in confirmed for: ${eventTitle}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.dispatchEvent(new Event('attendanceUpdated'));
      } catch (err) {
        console.error("QR processing error:", err);
        const message = err.response?.data?.message || err.response?.data?.error || 'Check-in could not be recorded. Please inform the booth monitor.';
        showFeedback(message);
      }
    };
    processQRCheckIn();
  }, [userData, pendingCheckIn, showFeedback]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      document.documentElement.classList.toggle('theme-dark', storedTheme === 'dark');
    }
    if (initialAuth.user) {
      sessionStorage.setItem('loginTimestamp', Date.now().toString());
      if (window.location.pathname === '/' || window.location.pathname === '/login') {
        navigateRef.current('/home', { replace: true });
      }
    } else {
      if (initialAuth.parseError) {
        console.warn('Failed to parse stored user session.');
      }
      localStorage.removeItem('rememberedUser');
      localStorage.removeItem('rememberedRole');
      localStorage.removeItem('churchAccessToken');
      sessionStorage.removeItem('sessionUser');
      sessionStorage.removeItem('sessionRole');
      sessionStorage.removeItem('churchAccessToken');
    }
  }, [initialAuth]);

  const handleLoginSuccess = (role, user, remember, accessToken) => {
    if (!accessToken) {
      throw new Error('The server did not return a secure session token.');
    }
    const normalizedRole = normalizeRole(role || user?.role);
    setUserRole(normalizedRole);
    setUserData(user);
    sessionStorage.setItem('loginTimestamp', Date.now().toString());
    if (remember) {
      localStorage.setItem('rememberedUser', JSON.stringify(user));
      localStorage.setItem('rememberedRole', normalizedRole);
      localStorage.setItem('churchAccessToken', accessToken);
      sessionStorage.removeItem('sessionUser');
      sessionStorage.removeItem('sessionRole');
      sessionStorage.removeItem('churchAccessToken');
    } else {
      localStorage.removeItem('rememberedUser');
      localStorage.removeItem('rememberedRole');
      localStorage.removeItem('churchAccessToken');
      sessionStorage.setItem('sessionUser', JSON.stringify(user));
      sessionStorage.setItem('sessionRole', normalizedRole);
      sessionStorage.setItem('churchAccessToken', accessToken);
    }
    navigate('/home', { replace: true });
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
    window.dispatchEvent(new Event('theme:change'));
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Failed to revoke server session:', err);
    }
    setUserData(null);
    setUserRole(null);
    localStorage.removeItem('rememberedUser');
    localStorage.removeItem('rememberedRole');
    localStorage.removeItem('churchAccessToken');
    sessionStorage.removeItem('sessionUser');
    sessionStorage.removeItem('sessionRole');
    sessionStorage.removeItem('churchAccessToken');
    sessionStorage.removeItem('loginTimestamp');
    navigate('/login', { replace: true });
  };

  const dashboardElement = userData ? (
    <BackgroundProvider
      userId={userData._id}
      role={userRole}
      userName={`${userData.firstName || ''} ${userData.lastName || ''}`.trim()}
    >
      <Dashboard
        role={userRole}
        user={userData}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    </BackgroundProvider>
  ) : <Navigate to="/login" replace />;

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={userData ? <Navigate to="/home" replace /> : <LandingPage onOpenAuth={() => navigate('/login')} />}
        />
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