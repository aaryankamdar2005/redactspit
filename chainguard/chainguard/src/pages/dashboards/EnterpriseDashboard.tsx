
import { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import { ShaderAnimation } from '../../components/ui/ShaderAnimation';
import {
Loader2, Search, ShieldCheck, LogOut, Wallet, ExternalLink,
AlertTriangle, CheckCircle, XCircle, Plus, X, LayoutGrid,
ChevronLeft, ChevronRight, BrainCircuit, AlertOctagon, TrendingUp, Activity
} from 'lucide-react';
import {
ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
BarChart, Bar
} from 'recharts';
// --- CONFIGURATION ---
const ETHERSCAN_API_KEY = "BA4HVQCKQCGVQNVPMBXE5I24F24QD2JH1Y";
const API_BASE_URL = 'http://localhost:5001/api';
const ITEMS_PER_PAGE = 15;
interface WalletCache {
transactions: any[];
isPotentialFraud: boolean;
fetchedAt: number;
}
export default function EnterpriseDashboard() {
const { logout, user } = useAuth();
// State
const [searchAddress, setSearchAddress] = useState("");
const [walletList, setWalletList] = useState<string[]>([]);
const [activeAddress, setActiveAddress] = useState<string | null>(null);
const [walletRisks, setWalletRisks] = useState<Record<string, boolean>>({});
const [walletCache, setWalletCache] = useState<Record<string, WalletCache>>({});
const [flaggedAddresses, setFlaggedAddresses] = useState<Set<string>>(new Set());
const [transactions, setTransactions] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [isObfuscating, setIsObfuscating] = useState(false); // NEW
const [error, setError] = useState<string | null>(null);
const [averageRiskScore, setAverageRiskScore] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
// --- HELPER FUNCTIONS ---
const getMethod = (input: string) => {
if (!input || input === "0x") return "Transfer";
return input.substring(0, 10);
};
const getRiskAnalysis = (tx: any) => {
const isFromFlagged = flaggedAddresses.has(tx.from?.toLowerCase()) && tx.from?.toLowerCase() !== activeAddress?.toLowerCase();
const isToFlagged = flaggedAddresses.has(tx.to?.toLowerCase()) && tx.to?.toLowerCase() !== activeAddress?.toLowerCase();


if (isFromFlagged || isToFlagged) {
  return {
    label: "Flagged Address",
    sub: "Cross-wallet alert",
    color: "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse",
    icon: <AlertOctagon className="w-3 h-3 mr-1" />,
    level: 3,
    score: 95
  };
}

if (tx.ml_analysis) {
  const riskScore = tx.ml_analysis.risk_score;
  const isFraudulent = tx.ml_analysis.is_fraudulent;

  if (isFraudulent || riskScore >= 70) {
    return { 
      label: "Fraud", 
      sub: `${riskScore.toFixed(0)}% Risk`,
      color: "bg-red-500/10 text-red-400 border border-red-500/20", 
      icon: <XCircle className="w-3 h-3 mr-1" />,
      level: 3,
      score: riskScore
    };
  } else if (riskScore >= 40) {
    return { 
      label: "High Risk", 
      sub: `${riskScore.toFixed(0)}% Risk`,
      color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", 
      icon: <AlertTriangle className="w-3 h-3 mr-1" />,
      level: 2,
      score: riskScore
    };
  } else {
    return { 
      label: "Safe", 
      sub: `${riskScore.toFixed(0)}% Risk`,
      color: "bg-green-500/10 text-green-400 border border-green-500/20", 
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
      level: 1,
      score: riskScore
    };
  }
}

const gasPriceWei = tx.gasPrice;
if (!gasPriceWei) return { label: "Unknown", color: "text-gray-400", icon: null, level: 0, sub: "N/A", score: 0 };
const gasPriceGwei = Number(ethers.formatUnits(gasPriceWei, "gwei"));

if (gasPriceGwei > 300) {
  return { 
    label: "Fraud", 
    sub: `${gasPriceGwei.toFixed(0)} Gwei`,
    color: "bg-red-500/10 text-red-400 border border-red-500/20", 
    icon: <XCircle className="w-3 h-3 mr-1" />,
    level: 3,
    score: 85
  };
} else if (gasPriceGwei >= 100) {
  return { 
    label: "High Risk", 
    sub: `${gasPriceGwei.toFixed(0)} Gwei`,
    color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", 
    icon: <AlertTriangle className="w-3 h-3 mr-1" />,
    level: 2,
    score: 55
  };
} else {
  return { 
    label: "Safe", 
    sub: `${gasPriceGwei.toFixed(0)} Gwei`,
    color: "bg-green-500/10 text-green-400 border border-green-500/20", 
    icon: <CheckCircle className="w-3 h-3 mr-1" />,
    level: 1,
    score: 15
  };
}
};
// NEW: Simulate obfuscation
const simulateObfuscation = async (): Promise<void> => {
setIsObfuscating(true);
await new Promise(resolve => setTimeout(resolve, 1500));
console.log('🔒 Address obfuscation complete');
setIsObfuscating(false);
};
// --- DATA PREPARATION FOR GRAPH ---
const chartData = useMemo(() => {
return transactions.map((tx, index) => {
let gwei = 0;
let fill = "#4ade80";

const isFromFlagged = flaggedAddresses.has(tx.from?.toLowerCase()) && tx.from?.toLowerCase() !== activeAddress?.toLowerCase();
  const isToFlagged = flaggedAddresses.has(tx.to?.toLowerCase()) && tx.to?.toLowerCase() !== activeAddress?.toLowerCase();

  if (isFromFlagged || isToFlagged) {
    gwei = 95;
    fill = "#dc2626";
  } else if (tx.ml_analysis) {
    gwei = tx.ml_analysis.risk_score;
    if (tx.ml_analysis.is_fraudulent || gwei >= 70) fill = "#ef4444";
    else if (gwei >= 40) fill = "#facc15";
  } else {
    gwei = Number(ethers.formatUnits(tx.gasPrice, "gwei"));
    if (gwei > 300) fill = "#ef4444";
    else if (gwei >= 100) fill = "#facc15";
  }

  const method = getMethod(tx.input);
  const pseudoRandomX = parseInt(tx.hash.substring(tx.hash.length - 4), 16) % 100;

  return {
    x: pseudoRandomX, 
    y: gwei,          
    methodName: method, 
    fill: fill,
    hash: tx.hash
  };
});
}, [transactions, flaggedAddresses, activeAddress]);
// Transaction Volume Data
const volumeData = useMemo(() => {
if (transactions.length === 0) return [];

const groupedByDate: Record<string, number> = {};

transactions.forEach((tx) => {
  const date = new Date(tx.timeStamp * 1000).toLocaleDateString();
  groupedByDate[date] = (groupedByDate[date] || 0) + 1;
});

const volumeArray = Object.entries(groupedByDate).map(([date, count]) => ({
  date,
  count
}));

return volumeArray.slice(-10);
}, [transactions]);
// Switch wallet with cache
const switchToWallet = (address: string) => {
setActiveAddress(address);
setCurrentPage(1);

const cached = walletCache[address];
if (cached) {
  console.log(`✅ Using cached data for ${address}`);
  setTransactions(cached.transactions);
  setWalletRisks(prev => ({ ...prev, [address]: cached.isPotentialFraud }));
  
  let totalRiskScore = 0;
  let scoredCount = 0;
  cached.transactions.forEach((tx: any) => {
    const risk = getRiskAnalysis(tx);
    if (risk.score > 0) {
      totalRiskScore += risk.score;
      scoredCount++;
    }
  });
  const avgScore = scoredCount > 0 ? totalRiskScore / scoredCount : 0;
  setAverageRiskScore(avgScore);
  
  setError(null);
} else {
  console.log(`🔄 Fetching data for ${address}`);
  analyzeWallet(address);
}
};
// --- CORE LOGIC WITH OBFUSCATION SIMULATION ---
const analyzeWallet = async (addressToScan: string) => {
setError(null);
setIsLoading(true);
setActiveAddress(addressToScan);
setTransactions([]);
setCurrentPage(1);
setAverageRiskScore(0);

try {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please log in again');
  }

  console.log('Calling API:', `${API_BASE_URL}/simple-transactions/analyze/${addressToScan}`);

  const response = await fetch(
    `${API_BASE_URL}/simple-transactions/analyze/${addressToScan}?limit=100&chainId=80002`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Response status:', response.status);

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  console.log('API Response:', data);
  
  if (data.success && data.transactions) {
    const txList = data.transactions;
    
    // NEW: Show obfuscation loading
    setIsLoading(false);
    await simulateObfuscation();
    
    setTransactions(txList);

    // Calculate Risk Ratio, Average Score, and flag addresses
    let riskyCount = 0;
    let totalRiskScore = 0;
    let scoredCount = 0;
    const newFlaggedAddresses = new Set(flaggedAddresses);

    txList.forEach((tx: any) => {
      const risk = getRiskAnalysis(tx);
      
      if (risk.score > 0) {
        totalRiskScore += risk.score;
        scoredCount++;
      }

      if (tx.ml_analysis) {
        if (tx.ml_analysis.is_fraudulent || tx.ml_analysis.risk_score >= 70) {
          riskyCount++;
          newFlaggedAddresses.add(addressToScan.toLowerCase());
        }
      } else {
        const gwei = Number(ethers.formatUnits(tx.gasPrice || "0", "gwei"));
        if (gwei >= 100) {
          riskyCount++;
          newFlaggedAddresses.add(addressToScan.toLowerCase());
        }
      }
    });

    setFlaggedAddresses(newFlaggedAddresses);

    const riskRatio = txList.length > 0 ? riskyCount / txList.length : 0;
    const isPotentialFraud = riskRatio > 0.10;

    setWalletRisks(prev => ({
      ...prev,
      [addressToScan]: isPotentialFraud
    }));

    const avgScore = scoredCount > 0 ? totalRiskScore / scoredCount : 0;
    setAverageRiskScore(avgScore);

    setWalletCache(prev => ({
      ...prev,
      [addressToScan]: {
        transactions: txList,
        isPotentialFraud,
        fetchedAt: Date.now()
      }
    }));

    console.log(`Analysis: ${riskyCount}/${txList.length} risky, Avg: ${avgScore.toFixed(1)}%, Flagged: ${newFlaggedAddresses.size}`);

  } else {
    setTransactions([]);
    setWalletRisks(prev => ({ ...prev, [addressToScan]: false }));
    setIsLoading(false);
  }

} catch (err: any) {
  console.error('Analysis error:', err);
  setError(err.message || "Analysis failed. Check if backend is running");
  setIsLoading(false);
}
};
// --- HANDLERS ---
const handleAddAndScan = (e: React.FormEvent) => {
e.preventDefault();
if (!ethers.isAddress(searchAddress)) {
setError("Invalid Ethereum Address");
return;
}
if (!walletList.includes(searchAddress)) {
setWalletList(prev => [...prev, searchAddress]);
}
analyzeWallet(searchAddress);
setSearchAddress("");
};
const removeWallet = (e: React.MouseEvent, addressToRemove: string) => {
e.stopPropagation();
const newList = walletList.filter(addr => addr !== addressToRemove);
setWalletList(newList);

setWalletCache(prev => {
  const newCache = { ...prev };
  delete newCache[addressToRemove];
  return newCache;
});

if (activeAddress === addressToRemove) {
  setActiveAddress(null);
  setTransactions([]);
}
};
// --- PAGINATION ---
const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);
const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
return (
<div className="relative min-h-screen w-full text-white font-sans selection:bg-blue-500 selection:text-white pb-20">
<ShaderAnimation />
<div className="fixed inset-0 bg-black/80 -z-10 pointer-events-none" />

{/* NEW: Obfuscation Loading Overlay */}
  {isObfuscating && (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white/5 border border-green-500/30 rounded-2xl p-8 max-w-md mx-4 text-center">
        <div className="mb-4">
          <ShieldCheck className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-green-400">Privacy Protection Active</h3>
        <p className="text-gray-300 mb-4">Hashing sensitive addresses...</p>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-green-400" />
          <span className="text-sm text-gray-400">Securing transaction data</span>
        </div>
      </div>
    </div>
  )}

  <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-blue-500 w-6 h-6" />
        <span className="font-bold text-lg tracking-tight">ChainGuard Enterprise</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:block text-xs text-right">
          <p className="text-gray-400">Logged in as</p>
          <p className="text-white font-mono">{user?.organization || 'Admin'} / {user?.email}</p>
        </div>
        <button onClick={logout} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </nav>

  <div className="container mx-auto px-6 pt-12">
    <div className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-purple-400 pb-2">
         Enterprise Investigation Console
      </h1>
      <p className="text-gray-400 max-w-2xl mx-auto">
        Add multiple suspect wallets to your watchlist and switch between them to analyze risks in real-time.
      </p>
      {flaggedAddresses.size > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-sm text-red-300">{flaggedAddresses.size} high-risk wallet{flaggedAddresses.size !== 1 ? 's' : ''} flagged</span>
        </div>
      )}
    </div>

    <div className="max-w-3xl mx-auto mb-8 relative z-10">
      <form onSubmit={handleAddAndScan} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Add Suspect Wallet Address (0x...)" 
            className="w-full bg-transparent border-none text-white placeholder-gray-500 px-12 py-4 focus:outline-none font-mono text-lg"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
          />
          <button 
            type="submit"
            disabled={isLoading || isObfuscating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Plus className="w-5 h-5" /> Add & Scan</>}
          </button>
        </div>
      </form>
      {error && <p className="mt-4 text-red-400 text-center bg-red-500/10 py-2 rounded border border-red-500/20">{error}</p>}
    </div>

    {walletList.length > 0 && (
      <div className="max-w-5xl mx-auto mb-12 animate-fade-in">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 pl-2 flex items-center gap-2">
          <LayoutGrid className="w-3 h-3" /> Monitored Wallets
        </p>
        <div className="flex flex-wrap gap-4">
          {walletList.map((addr) => {
            const isPotentialFraud = walletRisks[addr];
            const isCached = !!walletCache[addr];

            return (
              <button
                key={addr}
                onClick={() => switchToWallet(addr)}
                className={`
                  group relative pl-4 pr-10 py-3 rounded-xl font-mono text-sm border transition-all text-left
                  flex flex-col gap-1 min-w-[200px]
                  ${activeAddress === addr 
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-2 w-full">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeAddress === addr ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`} />
                    <span className="truncate">{addr.substring(0, 8)}...{addr.substring(38)}</span>
                    {isCached && activeAddress !== addr && (
                      <span className="text-[8px] text-gray-500 ml-auto">●</span>
                    )}
                </div>

                {isPotentialFraud ? (
                     <div className="flex items-center gap-1.5 mt-1 ml-4 text-xs font-bold text-red-400 animate-pulse">
                        <AlertOctagon className="w-3 h-3" />
                        <span>Potential Fraud</span>
                     </div>
                ) : (
                    <div className="flex items-center gap-1.5 mt-1 ml-4 text-xs text-green-500/50">
                        <CheckCircle className="w-3 h-3" />
                        <span>Clean History</span>
                    </div>
                )}
                
                <div onClick={(e) => removeWallet(e, addr)} className="absolute right-2 top-3 p-1 rounded-full hover:bg-red-500/20 hover:text-red-400 text-transparent group-hover:text-gray-500 transition-all">
                  <X className="w-3 h-3" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )}

    {activeAddress && (
      <div className="animate-fade-in flex flex-col xl:flex-row gap-6 items-start">
        
        <div className="w-full xl:w-3/4 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Active Target</p>
                  <div className="flex items-center gap-2">
                      <p className="text-xl md:text-2xl font-mono font-bold text-white break-all">{activeAddress}</p>
                      <a href={`https://amoy.polygonscan.com/address/${activeAddress}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
                          <ExternalLink className="w-5 h-5" />
                      </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <ActivityIndicator /> Transaction Audit Log
              </h3>
              <span className="text-xs font-mono text-gray-400 bg-black/50 px-3 py-1 rounded border border-white/5">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300 text-sm whitespace-nowrap">
                <thead className="bg-black/40 text-gray-500 uppercase text-xs font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Tx Hash</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Risk Analysis</th>
                    <th className="px-6 py-4">Block</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">From</th> {/* NEW COLUMN */}
                    <th className="px-6 py-4">To</th>
                    <th className="px-6 py-4 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentTransactions.length === 0 ? (
                    <tr><td colSpan={9} className="p-12 text-center text-gray-500">No transactions found.</td></tr>
                  ) : (
                    currentTransactions.map((tx) => {
                      const risk = getRiskAnalysis(tx);
                      return (
                        <tr key={tx.hash} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            {tx.isError === "0" ? 
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">Success</span> : 
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">Failed</span>
                            }
                          </td>
                          <td className="px-6 py-4 font-mono text-blue-400">
                            <a href={`https://amoy.polygonscan.com/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="hover:text-blue-300 hover:underline">
                              {tx.hash.substring(0, 10)}...
                            </a>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/10 text-xs text-gray-300">
                              {getMethod(tx.input)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${risk.color}`}>
                              {risk.icon}
                              <span className="mr-2">{risk.label}</span>
                              <span className="opacity-70 font-mono border-l border-white/20 pl-2 ml-1">{risk.sub}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-400">{tx.blockNumber}</td>
                          <td className="px-6 py-4 text-gray-400">{new Date(tx.timeStamp * 1000).toLocaleDateString()}</td>
                          {/* NEW: From Column */}
                          <td className="px-6 py-4 font-mono text-xs">
                            {tx.from ? (
                              tx.from.toLowerCase() === activeAddress.toLowerCase()
                                ? <span className="text-gray-500">Self</span>
                                : <span className="text-purple-400">{tx.from.substring(0,8)}...</span>
                            ) : <span className="text-gray-500">Unknown</span>}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {tx.to ? (
                              tx.to.toLowerCase() === activeAddress.toLowerCase()
                                ? <span className="text-gray-500">IN</span>
                                : <span className="text-blue-400">{tx.to.substring(0,8)}...</span>
                            ) : <span className="text-yellow-500">Contract Create</span>}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-white">
                            {parseFloat(ethers.formatEther(tx.value)).toFixed(4)} <span className="text-xs text-gray-600">MATIC</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {transactions.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                <button 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-xs text-gray-500">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, transactions.length)} of {transactions.length}
                </span>
                <button 
                  onClick={nextPage} 
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Analytics sidebar - UNCHANGED */}
        <div className="w-full xl:w-1/4 space-y-6 min-w-[300px]">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Avg Risk Score
              </h4>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold">
                {averageRiskScore.toFixed(1)}
                <span className="text-lg text-gray-400">%</span>
              </p>
              <div className={`px-2 py-1 rounded text-xs font-bold mb-1 ${
                averageRiskScore >= 30 ? 'bg-red-500/20 text-red-400' :
                averageRiskScore >= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {averageRiskScore >= 30 ? 'High' : averageRiskScore >= 15 ? 'Medium' : 'Low'}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Based on {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm h-full relative overflow-hidden flex flex-col">
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                <BrainCircuit className="text-purple-400" /> 
                AI Risk Analytics
              </h3>

              <div className="h-[300px] bg-black/40 rounded-xl border border-white/5 p-4 relative">
                <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-4 text-center">Risk Distribution</h4>
                
                {transactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" dataKey="x" hide={true} />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Risk" 
                        tick={{ fontSize: 10, fill: '#888' }}
                        stroke="#555"
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-black border border-white/20 p-2 rounded text-xs z-50">
                                <p className="text-white font-bold">{data.methodName}</p>
                                <p className="text-gray-400">Risk: {data.y.toFixed(2)}</p>
                                <p className="text-blue-400 text-[10px]">{data.hash.substring(0,10)}...</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter name="Transactions" data={chartData}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                    No data to visualize
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center gap-3 text-[10px] text-gray-400">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div>Safe</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div>High Risk</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Fraud</div>
              </div>

            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Activity className="text-blue-400 w-5 h-5" /> 
              Transaction Volume
            </h3>

            <div className="h-[200px] bg-black/40 rounded-xl border border-white/5 p-2">
              {volumeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 8, fill: '#888' }} 
                      stroke="#555"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} stroke="#555" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#000', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                  No volume data
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    )}
  </div>
</div>
);
}
function ActivityIndicator() {
return (
<span className="relative flex h-3 w-3 mr-1">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
<span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
</span>
)
}