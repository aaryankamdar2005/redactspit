import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, User, Building2 } from 'lucide-react';
import { authAPI } from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // ADDED: Role toggle
  const [role, setRole] = useState<'user' | 'enterprise'>('user');

  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [otpCode, setOtpCode] = useState({ email: '', phone: '' });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // LOGIN SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);

      if (response.success) {
        toast.success('Login successful!');
        login(response.token, response.user);

        // ADDED: ROLE-BASED REDIRECT
        if (role === 'enterprise') navigate('/dashboard/enterprise');
        else navigate('/dashboard/user');
      }
    } catch (error: any) {
      const errorData = error.response?.data;

      if (errorData?.requiresOTP) {
        toast.error('Account not verified. Sending OTP...');
        setUserId(errorData.userId);
        setUserEmail(formData.email);

        const phone = prompt('Enter your phone number to receive OTP:');
        if (phone) {
          setUserPhone(phone);
          await authAPI.sendOTP(errorData.userId, formData.email, phone);
          setShowOTP(true);
        }
      } else {
        toast.error(errorData?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP VERIFY
  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.email || !otpCode.phone) {
      toast.error('Please enter both OTP codes');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.verifyOTP(
        userId!,
        otpCode.email,
        otpCode.phone
      );

      if (response.success) {
        toast.success('Verified! Logging you in...');

        const loginRes = await authAPI.login(
          formData.email,
          formData.password
        );

        login(loginRes.token, loginRes.user);

        // ADDED: ROLE-BASED REDIRECT
        if (role === 'enterprise') navigate('/dashboard/enterprise');
        else navigate('/dashboard/user');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your ChainGuard account"
    >

      {/* ROLE TOGGLE */}
      <div className="flex bg-white/5 p-1 rounded-lg mb-6 border border-white/10">
        <button 
          onClick={() => setRole('user')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
            role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Personal
        </button>

        <button 
          onClick={() => setRole('enterprise')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
            role === 'enterprise' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Enterprise
        </button>
      </div>

      {/* LOGIN FORM */}
      {!showOTP && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com"
            required
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />

          <Input 
            label="Password" 
            type="password"
            placeholder="Enter your password"
            required
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          <button 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-lg transition-all mt-6 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            Don't have an account? <Link to="/signup" className="text-blue-400 hover:underline">Sign Up</Link>
          </p>
        </form>
      )}

      {/* OTP FORM */}
      {showOTP && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-300">
              Your account needs verification<br />
              Email: <strong>{userEmail}</strong><br />
              Phone: <strong>{userPhone}</strong>
            </p>
          </div>

          <form onSubmit={handleOTPVerify} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Email OTP" 
                type="text"
                maxLength={3}
                placeholder="123"
                value={otpCode.email}
                onChange={e => setOtpCode({...otpCode, email: e.target.value.replace(/\D/g, '')})}
              />
              <Input 
                label="Phone OTP" 
                type="text"
                maxLength={3}
                placeholder="456"
                value={otpCode.phone}
                onChange={e => setOtpCode({...otpCode, phone: e.target.value.replace(/\D/g, '')})}
              />
            </div>

            <button 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin w-4 h-4" />}
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              type="button"
              onClick={() => setShowOTP(false)}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition"
            >
              ← Back to login
            </button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
