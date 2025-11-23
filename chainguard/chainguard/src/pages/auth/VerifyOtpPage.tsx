import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasSentRef = useRef(false); // Prevent double sending in React Strict Mode

  // Extract data passed from Signup Page
  const { userId, email, phoneNumber } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');

  // 1. Send OTP on component mount
  useEffect(() => {
    if (!userId || hasSentRef.current) return;
    hasSentRef.current = true;

    const sendOtp = async () => {
      try {
        await api.post('/otp/send', { userId, email, phoneNumber });
        toast.success(`Verification codes sent to ${email} and ${phoneNumber}`);
      } catch (err) {
        toast.error("Failed to send OTP codes.");
      }
    };
    sendOtp();
  }, [userId, email, phoneNumber]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/otp/verify', {
        userId,
        emailOTP: emailOtp,
        phoneOTP: phoneOtp
      });
      
      toast.success("Verification Successful!");
      navigate('/login'); // Redirect to login after verification
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid OTP codes");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/otp/send', { userId, email, phoneNumber });
      toast.success("Codes resent successfully");
    } catch (err) {
      toast.error("Failed to resend codes");
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Error: No user context found. Please Sign up again.</p>
      </div>
    );
  }

  return (
    <AuthLayout title="Verify Identity" subtitle="Enter the codes sent to your devices">
      <form onSubmit={handleVerify} className="space-y-6">
        
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-6">
          <p className="text-sm text-blue-200 text-center">
            For security, we sent two separate codes.
          </p>
        </div>

        <div className="space-y-4">
          <Input 
            label="Email Code (3 digits)" 
            placeholder="123"
            maxLength={3}
            value={emailOtp}
            onChange={e => setEmailOtp(e.target.value)}
            className="text-center text-2xl tracking-widest font-mono"
          />
          
          <Input 
            label="SMS Code (3 digits)" 
            placeholder="456"
            maxLength={3}
            value={phoneOtp}
            onChange={e => setPhoneOtp(e.target.value)}
            className="text-center text-2xl tracking-widest font-mono"
          />
        </div>

        <button 
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="animate-spin w-4 h-4" />}
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>

        <button 
          type="button"
          onClick={handleResend}
          className="w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          Didn't receive codes? Resend
        </button>
      </form>
    </AuthLayout>
  );
}