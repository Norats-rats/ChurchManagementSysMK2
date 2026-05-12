import { useState } from 'react';
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
                placeholder="Min. 6 characters" 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>
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
      </div>
    </div>
  );
};

const LoginScreen = ({ onLoginSuccess, onGoToSignup, onGoToForgot }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.login({ email, password });
      const data = response.data;

      if (data.success) {
        onLoginSuccess(data.role, data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Connection error";
      alert(msg);
    }
  };

  return (
    <div className="main-container">
      <div className="header-section">
        <div className="logo-circle"><span className="church-icon">⛪</span></div>
        <h1>Free Believers in Christ</h1>
        <h2>Fellowship Inc.</h2>
        <p className="subtitle">CHURCH MANAGEMENT SYSTEM</p>
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
                onChange={(e) => setPassword(e.target.value)} 
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
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
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
            style={{background:'none', border:'none', color:'#1e40af', cursor:'pointer', fontWeight:'bold', textDecoration:'underline'}}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('login');
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);

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

  return (
    <div className="App">
      {renderView()}
    </div>
  );
}