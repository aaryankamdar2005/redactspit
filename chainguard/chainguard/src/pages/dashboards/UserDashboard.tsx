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
        return { label: "Fraud", sub: `${riskScore.toFixed(0)}% Risk`, color: "bg-red-500/10 text-red-400 border border-red-500/20", icon: <XCircle className="w-3 h-3 mr-1" />, level: 3, score: riskScore };
      } else if (riskScore >= 40) {
        return { label: "High Risk", sub: `${riskScore.toFixed(0)}% Risk`, color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", icon: <AlertTriangle className="w-3 h-3 mr-1" />, level: 2, score: riskScore };
      } else {
        return { label: "Safe", sub: `${riskScore.toFixed(0)}% Risk`, color: "bg-green-500/10 text-green-400 border border-green-500/20", icon: <CheckCircle className="w-3 h-3 mr-1" />, level: 1, score: riskScore };
      }
    }

    const gasPriceWei = tx.gasPrice;
    if (!gasPriceWei) return { label: "Unknown", color: "text-gray-400", icon: null, level: 0, sub: "N/A", score: 0 };
    const gasPriceGwei = Number(ethers.formatUnits(gasPriceWei, "gwei"));

    if (gasPriceGwei > 300) return { label: "Fraud", sub: `${gasPriceGwei.toFixed(0)} Gwei`, color: "bg-red-500/10 text-red-400 border border-red-500/20", icon: <XCircle className="w-3 h-3 mr-1" />, level: 3, score: 85 };
    else if (gasPriceGwei >= 100) return { label: "High Risk", sub: `${gasPriceGwei.toFixed(0)} Gwei`, color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", icon: <AlertTriangle className="w-3 h-3 mr-1" />, level: 2, score: 55 };
    else return { label: "Safe", sub: `${gasPriceGwei.toFixed(0)} Gwei`, color: "bg-green-500/10 text-green-400 border border-green-500/20", icon: <CheckCircle className="w-3 h-3 mr-1" />, level: 1, score: 15 };
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

      return {
        x: parseInt(tx.hash.substring(tx.hash.length - 4), 16) % 100,
        y: gwei,
        methodName: getMethod(tx.input),
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
    return Object.entries(groupedByDate).map(([date, count]) => ({ date, count })).slice(-10);
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
      // 1. Balances
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

      // 2. Transactions
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in again');

      const response = await fetch(
        `${API_BASE_URL}/simple-transactions/analyze/${addressToScan}?limit=100&chainId=80002`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }
      );

      if (response.status === 401 || response.status === 403) throw new Error('Authentication failed.');
      
      // Handle 404 as empty
      if (!response.ok && (response.status === 404 || response.status === 400)) {
         setTransactions([]);
         setIsLoading(false);
         return;
      }

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      
      if (data.success && data.transactions) {
        const txList = data.transactions;
        setTransactions(txList);

        let riskyCount = 0;
        let totalRiskScore = 0;
        let scoredCount = 0;

        txList.forEach((tx: any) => {
          const risk = getRiskAnalysis(tx);
          if (risk.score > 0) { totalRiskScore += risk.score; scoredCount++; }
          if (tx.ml_analysis) {
            if (tx.ml_analysis.is_fraudulent || tx.ml_analysis.risk_score >= 70) riskyCount++;
          } else {
            if (Number(ethers.formatUnits(tx.gasPrice || "0", "gwei")) >= 100) riskyCount++;
          }
        });

        if (txList.length > 0 && riskyCount / txList.length > 0.10) setIsAccountRisky(true);
        if (scoredCount > 0) setAverageRiskScore(totalRiskScore / scoredCount);
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
      <ShaderAnimation />
      <div className="fixed inset-0 bg-black/80 -z-10" />

      {/* Navbar with Connect Button */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500 w-6 h-6" />
            <span className="font-bold text-lg">ChainGuard Personal</span>
          </div>
          <div className="flex items-center gap-4">
            {!account && (
              <button 
                onClick={connectWallet}
                disabled={isLoading}
                className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all"
              >
                <Wallet className="w-4 h-4" /> 
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-12">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg mb-6 text-center">{error}</div>}

        {/* Logic: If account connected, show dashboard. If not, show Placeholder */}
        {!account ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-sm max-w-lg w-full">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <Wallet className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-8 text-lg">
                Access your personal dashboard to analyze transaction risks, view multi-chain balances, and monitor your portfolio health.
              </p>
              <button 
                onClick={connectWallet}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex justify-center items-center gap-3"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Wallet className="w-5 h-5" /> Connect MetaMask</>}
              </button>
            </div>
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"><AlertOctagon className="w-3 h-3" /> Potential Fraud Detected</span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle className="w-3 h-3" /> Account Status: Clean</span>
                    )}
                  </div>
                </div>
                <button onClick={() => analyzeWallet(account!)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
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

             <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Table */}
                <div className="w-full xl:w-3/4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                        {/* Table Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-xl flex items-center gap-2"><ActivityIndicator /> Personal Audit Log</h3>
                            <span className="text-xs font-mono text-gray-400 bg-black/50 px-3 py-1 rounded border border-white/5">Page {currentPage} of {totalPages || 1}</span>
                        </div>
                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-300 text-sm whitespace-nowrap">
                                <thead className="bg-black/40 text-gray-500 uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Tx Hash</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Risk Analysis</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {currentTransactions.length === 0 ? (
                                        <tr><td colSpan={6} className="p-12 text-center text-gray-500">No transactions found.</td></tr>
                                    ) : (
                                        currentTransactions.map((tx) => {
                                            const risk = getRiskAnalysis(tx);
                                            return (
                                                <tr key={tx.hash} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">{tx.isError === "0" ? <span className="text-green-400">Success</span> : <span className="text-red-400">Failed</span>}</td>
                                                    <td className="px-6 py-4 font-mono text-blue-400"><a href={`https://amoy.polygonscan.com/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="hover:underline">{tx.hash.substring(0, 10)}...</a></td>
                                                    <td className="px-6 py-4 font-mono text-xs">{getMethod(tx.input)}</td>
                                                    <td className="px-6 py-4"><div className={`inline-flex items-center px-2 py-1 rounded text-xs ${risk.color}`}>{risk.icon} {risk.label}</div></td>
                                                    <td className="px-6 py-4 text-gray-400">{new Date(tx.timeStamp * 1000).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-right font-mono">{parseFloat(ethers.formatEther(tx.value)).toFixed(4)} MATIC</td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {transactions.length > 0 && (
                            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between">
                                <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 flex items-center gap-2"><ChevronLeft className="w-4 h-4"/> Prev</button>
                                <button onClick={nextPage} disabled={currentPage === totalPages} className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 flex items-center gap-2">Next <ChevronRight className="w-4 h-4"/></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts Sidebar */}
                <div className="w-full xl:w-1/4 min-w-[300px] space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <h4 className="text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4" /> Average Risk Score</h4>
                        <p className="text-4xl font-bold">{averageRiskScore.toFixed(1)} <span className="text-lg text-gray-400">%</span></p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BrainCircuit className="text-purple-400" /> Risk Map</h3>
                        <div className="h-[200px] bg-black/40 rounded-xl border border-white/5 p-2">
                            {transactions.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis type="number" dataKey="x" hide />
                                        <YAxis type="number" dataKey="y" stroke="#555" />
                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                        <Scatter data={chartData} fill="#8884d8">
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-500 text-xs">No data</div>}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-blue-400 w-5 h-5" /> Volume</h3>
                        <div className="h-[150px] bg-black/40 rounded-xl border border-white/5 p-2">
                            {volumeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={volumeData}>
                                        <XAxis dataKey="date" hide />
                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-500 text-xs">No data</div>}
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
  return <span className="relative flex h-3 w-3 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>;
}