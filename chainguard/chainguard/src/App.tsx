import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import EnterpriseDashboard from "./pages/dashboards/EnterpriseDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";


// Role-based Route Protection
const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element, requiredRole: 'user' | 'enterprise' }) => {
  const { token, user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  
  if (!token || !user) return <Navigate to="/login" />;
  
  // If user tries to access enterprise page, or vice versa
  if (user.role !== requiredRole) {
     return <Navigate to={user.role === 'enterprise' ? '/dashboard/enterprise' : '/dashboard/user'} />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* User Dashboard */}
          <Route path="/dashboard/user" element={
        
              <UserDashboard />
           
          } />

          {/* Enterprise Dashboard */}
          <Route path="/dashboard/enterprise" element={
   
              <EnterpriseDashboard />
          
          } />

         
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;