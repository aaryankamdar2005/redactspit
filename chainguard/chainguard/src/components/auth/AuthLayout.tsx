import { ReactNode } from 'react';
import { ShaderAnimation } from '../ui/ShaderAnimation';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode, title: string, subtitle: string }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 font-sans">
      <ShaderAnimation />
      <div className="fixed inset-0 bg-black/60 -z-10" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-4 group">
            <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tighter">ChainGuard</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-center">{subtitle}</p>
        </div>

        {/* Glass Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}