import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) throw error;
      
      if (data.user) {
        // Navigate to OTP verification
        navigate('/verify-otp', {
          state: {
            userId: data.user.id,
            email: data.user.email,
            phone: data.user.user_metadata?.phone
          }
        });
      }
    } catch (error) {
      setError('Invalid email or password');
    }
    
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <h2>Login to ChainGuard</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p>
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
}
