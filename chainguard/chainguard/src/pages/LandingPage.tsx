import { ShieldCheck, Activity, Lock, AlertTriangle, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { ShaderAnimation } from "../components/ui/ShaderAnimation";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const viewLived = async () => {
    navigate('/signup');
  };

  // ✅ ADDED: Smooth scroll function
  const scrollToReport = () => {
    const section = document.getElementById("technical-report");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full text-white overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      <ShaderAnimation />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 -z-10 pointer-events-none" />

      <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-tighter">ChainGuard</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link 
            to="/signup" 
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] flex items-center gap-2"
          >
            Sign Up <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center justify-center pt-20 pb-32 text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-900/20 backdrop-blur-sm mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-xs font-medium text-blue-200 uppercase tracking-widest">AI-Powered Security</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
          AI/ML DeFi Transaction <br /> Anomaly Detection
        </h1>

        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed">
          ChainGuard analyzes blockchain transaction features (gas, value, history) to generate 
          Risk Scores and actionable alerts. Protect your exchange from fraud in real-time.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            onClick={viewLived} 
            className="px-8 py-4 bg-white text-black rounded-lg font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            View Live Demo
          </button>

          {/* ✅ UPDATED BUTTON: Now scrolls down */}
          <button 
            onClick={scrollToReport}
            className="px-8 py-4 border border-white/20 bg-black/20 backdrop-blur-md rounded-lg font-medium hover:bg-white/10 transition-all text-white cursor-pointer"
          >
            Read Technical Report
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="relative z-10 container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Robust ML Model</h3>
            <p className="text-sm text-gray-400">
              Utilizing Random Forest and XGBoost to classify transactions based on tabular features like gas used and sender history.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Risk Score (0-100)</h3>
            <p className="text-sm text-gray-400">
              We convert confidence predictions into a definitive risk score, giving you instant clarity on transaction safety.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <AlertTriangle className="text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Actionable Alerts</h3>
            <p className="text-sm text-gray-400">
              Automated logic maps high-risk scores to security actions, such as flagging wallets or freezing transactions.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Lock className="text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Privacy Preserving</h3>
            <p className="text-sm text-gray-400">
              Sensitive features are obfuscated using symmetric encryption and hashing before analysis to ensure data privacy.
            </p>
          </div>

        </div>
      </div>

      {/* ✅ ADDED TECHNICAL REPORT SECTION */}
      <div 
        id="technical-report"
        className="relative z-10 container mx-auto px-6 py-24"
      >
        <h2 className="text-4xl font-bold mb-4">Technical Report</h2>
        <p className="text-gray-300 max-w-3xl leading-relaxed">
          This section contains detailed documentation of the ML model, feature engineering pipeline,
          evaluation metrics, risk scoring logic, security integrations, and the anomaly detection architecture.
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500">
              © 2025 ChainGuard Security. All rights reserved.
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors">
              <Phone className="w-4 h-4" /> 
              <span>Support: <a href="tel:02246181477" className="font-mono hover:underline">02246181477</a></span>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">99.8%</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Precision</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">&lt; 50ms</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Monitoring</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
