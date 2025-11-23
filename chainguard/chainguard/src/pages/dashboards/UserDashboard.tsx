import { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import { ShaderAnimation } from '../../components/ui/ShaderAnimation';
import { 
  Loader2, LogOut, Wallet, ShieldCheck, User, RefreshCw, ExternalLink, 
  ChevronLeft, ChevronRight, Activity, BrainCircuit, AlertTriangle, 
  CheckCircle, XCircle, AlertOctagon, TrendingUp 
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar
} from 'recharts';

// ===================== CONFIGURATION =====================
const API_BASE_URL = 'http://localhost:5001/api';
const ITEMS_PER_PAGE = 15;

const NETWORKS = [
  { name: "Amoy Testnet", rpc: "https://rpc-amoy.polygon.technology/", symbol: "MATIC", chainId: 80002 },
  { name: "Sepolia Testnet", rpc: "https://rpc.sepolia.org", symbol: "ETH", chainId: 11155111 },
  { name: "Polygon Mainnet", rpc: "https://polygon-rpc.com", symbol: "MATIC", chainId: 137 },
  { name: "Ethereum Mainnet", rpc: "https://eth.llamarpc.com", symbol: "ETH", chainId: 1 }
];

// ===================== MAIN COMPONENT =====================

export default function UserDashboard() {
  const { logout } = useAuth();
  
  // State
  const [account, setAccount] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccountRisky, setIsAccountRisky] = useState(false);
  const [averageRiskScore, setAverageRiskScore] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // --- HELPER FUNCTIONS ---
  const getMethod = (input: string) => {
    if (!input || input === "0x") return "Transfer";
    return input.substring(0, 10);
  };

  const getRiskAnalysis = (tx: any) => {
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

    // Fallback if no ML analysis
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

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    return transactions.map((tx) => {
      let gwei = 0;
      let fill = "#4ade80";

      if (tx.ml_analysis) {
        gwei = tx.ml_analysis.risk_score;
        if (tx.ml_analysis.is_fraudulent || gwei >= 70) fill = "#ef4444";
        else if (gwei >= 40) fill = "#facc15";
      } else {
        gwei = Number(ethers.formatUnits(tx.gasPrice || "0", "gwei"));
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
  }, [transactions]);

  // --- TRANSACTION VOLUME DATA ---
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

  // --- CORE LOGIC ---
  const connectWallet = async () => {
    setError(null);
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        await analyzeWallet(address);
      } catch (err: any) {
        console.error("Connection Error:", err);
        setError(err.message || "Failed to connect wallet.");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("MetaMask is not installed!");
      setIsLoading(false);
    }
  };

  const analyzeWallet = async (addressToScan: string) => {
    setIsLoading(true);
    setBalances([]);
    setTransactions([]);
    setCurrentPage(1);
    setIsAccountRisky(false);
    setAverageRiskScore(0);

    try {
      // 1. Fetch Balances
      const balancePromises = NETWORKS.map(async (net) => {
        try {
          const provider = new ethers.JsonRpcProvider(net.rpc);
          const bal = await provider.getBalance(addressToScan);
          return { ...net, balance: ethers.formatEther(bal) };
        } catch (e) {
          return { ...net, balance: "0" };
        }
      });
      const bals = await Promise.all(balancePromises);
      setBalances(bals);

      // 2. Fetch Transactions via Custom API
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in again');
      }

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

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.transactions) {
        const txList = data.transactions;
        setTransactions(txList);

        let riskyCount = 0;
        let totalRiskScore = 0;
        let scoredCount = 0;

        txList.forEach((tx: any) => {
          const risk = getRiskAnalysis(tx);
          if (risk.score > 0) {
            totalRiskScore += risk.score;
            scoredCount++;
          }

          if (tx.ml_analysis) {
            if (tx.ml_analysis.is_fraudulent || tx.ml_analysis.risk_score >= 70) {
              riskyCount++;
            }
          } else {
            const gwei = Number(ethers.formatUnits(tx.gasPrice || "0", "gwei"));
            if (gwei >= 100) riskyCount++;
          }
        });

        const riskRatio = txList.length > 0 ? riskyCount / txList.length : 0;
        if (riskRatio > 0.10) setIsAccountRisky(true);

        const avgScore = scoredCount > 0 ? totalRiskScore / scoredCount : 0;
        setAverageRiskScore(avgScore);

      } else {
        setTransactions([]);
      }

    } catch (error: any) {
      console.error("Analysis Error:", error);
      setError(error.message || "Failed to fetch wallet data.");
    }
    setIsLoading(false);
  };

  // --- PAGINATION ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="relative min-h-screen w-full text-white font-sans pb-20">
      
      {/* ORIGINAL SHADER BACKGROUND */}
      <ShaderAnimation />
      <div className="fixed inset-0 bg-black/80 -z-10" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500 w-6 h-6" />
            <span className="font-bold text-lg">ChainGuard Personal</span>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 pt-12">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg mb-6 text-center">{error}</div>}

        {!account ? (
          <div className="max-w-md mx-auto mt-20 p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md text-center shadow-2xl">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Wallet className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
            <p className="text-gray-400 mb-6">Connect your MetaMask to analyze your personal portfolio and risk score.</p>
            <button onClick={connectWallet} disabled={isLoading} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-all flex justify-center items-center gap-2">
              {isLoading ? <Loader2 className="animate-spin" /> : "Connect MetaMask"}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in space-y-8">
             
             {/* Identity Card */}
             <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <User className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Connected Account</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-mono font-bold break-all">{account}</p>
                    <a href={`https://amoy.polygonscan.com/address/${account}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white"><ExternalLink className="w-4 h-4"/></a>
                  </div>
                  
                  <div className="mt-2">
                    {isAccountRisky ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                            <AlertOctagon className="w-3 h-3" /> Potential Fraud Detected
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle className="w-3 h-3" /> Account Status: Clean
                        </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => analyzeWallet(account!)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors" title="Refresh Data">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
             </div>

             {/* Balances */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {balances.map((b, i) => (
                  <div key={i} className="bg-black/40 p-5 rounded-xl border border-white/10">
                    <p className="text-xs text-gray-500 uppercase mb-1">{b.name}</p>
                    <p className="text-xl font-bold">{parseFloat(b.balance).toFixed(4)} <span className="text-sm text-blue-400">{b.symbol}</span></p>
                  </div>
                ))}
             </div>

             {/* DASHBOARD SPLIT LAYOUT */}
             <div className="flex flex-col xl:flex-row gap-6 items-start">
                
                {/* LEFT: Transactions (75%) */}
                <div className="w-full xl:w-3/4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                    <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-xl flex items-center gap-2">
                        <ActivityIndicator /> Personal Audit Log
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
                            <th className="px-6 py-4">To</th>
                            <th className="px-6 py-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentTransactions.length === 0 ? (
                            <tr><td colSpan={8} className="p-12 text-center text-gray-500">No transactions found.</td></tr>
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
                                    <td className="px-6 py-4 font-mono text-xs">
                                    {tx.to ? (
                                        tx.to.toLowerCase() === account?.toLowerCase()
                                        ? <span className="text-gray-500">IN (Self)</span>
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

                {/* RIGHT: Analytics (25%) */}
                <div className="w-full xl:w-1/4 min-w-[300px] space-y-6">
                    {/* Average Risk Score Card */}
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

                    {/* Risk Distribution Chart */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                            <BrainCircuit className="text-purple-400" /> 
                            Risk Distribution
                        </h3>

                        <div className="h-[300px] bg-black/40 rounded-xl border border-white/5 p-4 relative">
                            <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-4 text-center">Transaction Risk</h4>
                            
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

                    {/* Transaction Volume Chart */}
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