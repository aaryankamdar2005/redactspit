import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Building2, User } from 'lucide-react';
import { authAPI } from '../../services/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState<'user' | 'enterprise'>('user');
  const [loading, setLoading] = useState(false);
  
  // NEW: Add these states
  const [showOTP, setShowOTP] = useState(false);
  const [userId, setUserId] = useState('');
  const [otpCode, setOtpCode] = useState({ email: '', phone: '' });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    organization: ''
   
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Call signup API
      const signupResponse = await authAPI.signup({
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber.replace(/\s/g, ''),
   
      });

      if (signupResponse.success) {
        toast.success('Account created!');
        setUserId(signupResponse.userId);
        
        // Automatically send OTP
        const otpResponse = await authAPI.sendOTP(
          signupResponse.userId,
          formData.email,
          formData.phoneNumber.replace(/\s/g, '')
        );
        
        if (otpResponse.success) {
          toast.success('OTP sent to your email & phone!');
          setShowOTP(true);
        } else {
          toast.error('Failed to send OTP');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // NEW: OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.email || !otpCode.phone) {
      toast.error('Please enter both OTP codes');
      return;
    }
    
    if (otpCode.email.length !== 3 || otpCode.phone.length !== 3) {
      toast.error('Each OTP must be 3 digits');
      return;
    }

    setLoading(true);

    try {
      const verifyResponse = await authAPI.verifyOTP(userId, otpCode.email, otpCode.phone);
      
      if (verifyResponse.success) {
        toast.success('Verified! Logging you in...');
        
        // Auto login
        const loginResponse = await authAPI.login(formData.email, formData.password);
        
        if (loginResponse.success) {
          login(loginResponse.token, loginResponse.user);
          if(formData.organization=='') navigate('/dashboard/user');
          else navigate('/dashboard/enterprise');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.resendOTP(userId, formData.email, formData.phoneNumber);
      toast.success('New OTP sent!');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title={role === 'user' ? "Create User Account" : "Enterprise Access"} 
      subtitle={role === 'user' ? "Manage your personal DeFi portfolio" : "Professional investigation tools"}
    >
      {/* Role Toggle */}
      <div className="flex bg-white/5 p-1 rounded-lg mb-6 border border-white/10">
        <button 
          onClick={() => setRole('user')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <User className="w-4 h-4" /> Personal
        </button>
        <button 
          onClick={() => setRole('enterprise')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${role === 'enterprise' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" /> Enterprise
        </button>
      </div>

      {/* EXISTING SIGNUP FORM - Show only if OTP not required */}
      {!showOTP && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'enterprise' && (
            <Input 
              label="Organization Name" 
              placeholder="Global Security Inc."
              value={formData.organization}
              onChange={e => setFormData({...formData, organization: e.target.value})}
            />
          )}

          <Input 
            label="Email Address" 
            type="email" 
            placeholder="name@example.com"
            required
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Password" 
              type="password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <Input 
              label="Confirm" 
              type="password" 
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <Input 
            label="Phone Number" 
            type="tel" 
            placeholder="+919876543210"
            value={formData.phoneNumber}
            onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
          />

        

          <button 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-lg transition-all mt-6 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Log In</Link>
          </p>
        </form>
      )}

      {/* NEW: OTP VERIFICATION FORM - Show after signup */}
      {showOTP && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-300">
              📧 Check <strong>{formData.email}</strong> for first 3 digits<br />
              📱 Check <strong>{formData.phoneNumber}</strong> for next 3 digits
            </p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
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
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            <button 
              type="button"
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition"
            >
              Resend OTP
            </button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
