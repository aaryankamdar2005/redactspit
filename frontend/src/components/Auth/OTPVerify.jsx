import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function OTPVerify() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { setOtpVerified } = useAuth();
  
  const { userId, email, phone } = location.state || {};

  useEffect(() => {
    if (!userId) {
      navigate('/signup');
      return;
    }
    
    // Send OTP automatically on component mount
    sendOTP();
  }, []);

  async function sendOTP() {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/otp/send`, {
        userId,
        email,
        phone
      });
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    }
  }

  async function handleResendOTP() {
    setResending(true);
    setError('');
    await sendOTP();
    setResending(false);
    alert('OTP resent successfully!');
  }

  async function handleVerify(e) {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/otp/verify`,
        { userId, otp }
      );

      if (response.data.success) {
        setOtpVerified(true);
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Invalid OTP. Please try again.');
    }
    
    setLoading(false);
  }

  return (
    <div className="otp-container">
      <h2>Verify Your Identity</h2>
      <p>Enter the 6-digit OTP</p>
      <p className="otp-info">
        First 3 digits sent to: <strong>{email}</strong><br/>
        Last 3 digits sent to: <strong>{phone}</strong>
      </p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          maxLength="6"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="otp-input"
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

      <button onClick={handleResendOTP} disabled={resending} className="resend-btn">
        {resending ? 'Resending...' : 'Resend OTP'}
      </button>
    </div>
  );
}
