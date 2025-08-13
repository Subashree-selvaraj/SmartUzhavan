
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const [isRecording, setIsRecording] = useState(false); // reserved for future voice features
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showOtpForm, setShowOtpForm] = useState(false);
  
  const [emailFormData, setEmailFormData] = useState({
    email: '',
    password: ''
  });
  
  const [phoneNumber, setPhoneNumber] = useState('+91 ');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  const navigate = useNavigate();
  const { signin, signup, signInWithGoogle, setupRecaptcha, sendOTP, currentUser } = useAuth();
  const recaptchaRef = useRef(null);
  const otpInputsRef = useRef([]);

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (activeTab === 'phone' && !recaptchaRef.current) {
      initializeRecaptcha();
    }
  }, [activeTab]);

  const initializeRecaptcha = () => {
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
      recaptchaRef.current = setupRecaptcha('recaptcha-container');
      recaptchaRef.current.render();
    } catch (error) {
      console.error('reCAPTCHA initialization error:', error);
      setError('Failed to initialize reCAPTCHA. Please refresh the page.');
    }
  };

  const showError = (message) => {
    setError(message);
    setSuccess('');
    setTimeout(() => setError(''), 5000);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isSignUpMode) {
        await signup(emailFormData.email, emailFormData.password);
        showSuccess('Account created successfully!');
      } else {
        await signin(emailFormData.email, emailFormData.password);
        showSuccess('Signed in successfully!');
      }
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      showError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithGoogle();
      showSuccess('Signed in with Google successfully!');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Google sign-in error:', error);
      showError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      showError('Please enter a valid phone number');
      return;
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      showError('Please enter a valid phone number with country code (e.g., +91 9876543210)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await sendOTP(phoneNumber, recaptchaRef.current);
      setConfirmationResult(result);
      setShowOtpForm(true);
      showSuccess('OTP sent successfully! Check your phone for the 6-digit code.');
    } catch (error) {
      console.error('Phone auth error:', error);
      showError(getErrorMessage(error.code));
      
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        setTimeout(() => {
          initializeRecaptcha();
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      showError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await confirmationResult.confirm(otpCode);
      showSuccess('Phone number verified successfully!');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      showError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        otpInputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/invalid-phone-number': 'Invalid phone number format',
      'auth/invalid-verification-code': 'Invalid OTP code',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/popup-closed-by-user': 'Sign-in popup was closed',
      'auth/popup-blocked': 'Pop-up was blocked by your browser',
    };
    return errorMessages[errorCode] || `Authentication error: ${errorCode}`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to access your Uzhavar Oli account</p>
        </div>
        
        <div className="auth-tabs">
          <div 
            className={`auth-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Email
          </div>
          <div 
            className={`auth-tab ${activeTab === 'phone' ? 'active' : ''}`}
            onClick={() => setActiveTab('phone')}
          >
            Phone
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'email' && (
          <div className="auth-content">
            <form onSubmit={handleEmailSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={emailFormData.email}
                  onChange={(e) => setEmailFormData({...emailFormData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={emailFormData.password}
                  onChange={(e) => setEmailFormData({...emailFormData, password: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (isSignUpMode ? 'Sign Up' : 'Sign In')}
              </button>
            </form>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <button className="auth-btn google-btn" onClick={handleGoogleSignIn} disabled={isLoading}>
              <i className="fab fa-google"></i>
              Continue with Google
            </button>
            
            <div className="divider">
              <span>Don't have an account?</span>
            </div>
            
            <button 
              className="auth-btn secondary-btn" 
              onClick={() => setIsSignUpMode(!isSignUpMode)}
            >
              {isSignUpMode ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        )}

        {activeTab === 'phone' && (
          <div className="auth-content">
            {!showOtpForm ? (
              <div>
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
                <div className="form-group">
                  <div id="recaptcha-container"></div>
                </div>
                <button className="auth-btn" onClick={handleSendOTP} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{textAlign: 'center', marginBottom: '20px', color: '#666'}}>
                  Enter the 6-digit code sent to your phone
                </p>
                <div className="otp-inputs">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => otpInputsRef.current[index] = el}
                      type="text"
                      className="otp-input"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>
                <button className="auth-btn" onClick={handleVerifyOTP} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="resend-otp">
                  <button className="link-btn" onClick={handleSendOTP}>
                    Resend OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="back-to-home">
          <button className="link-btn" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
