import { useState, useEffect } from 'react';
import { getTransactions } from '../../services/blockchainService';
import { scoreTransactions } from '../../services/apiService';

export default function TransactionList({ walletAddress }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchAndScoreTransactions();
    }
  }, [walletAddress]);

  async function fetchAndScoreTransactions() {
    setLoading(true);
    try {
      const txs = await getTransactions(walletAddress, 50);
      setTransactions(txs);

      if (txs.length > 0) {
        const response = await scoreTransactions(txs);
        setTransactions(response.data.results);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  function getRiskColor(score) {
    if (score < 0.3) return 'green';
    if (score < 0.7) return 'orange';
    return 'red';
  }

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div className="transaction-list">
      <h3>Recent Transactions</h3>
      
      {transactions.length === 0 ? (
        <p>No transactions found</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Value (MATIC)</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.hash}>
                <td>
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tx.hash.slice(0, 10)}...
                  </a>
                </td>
                <td>{tx.from.slice(0, 8)}...</td>
                <td>{tx.to ? tx.to.slice(0, 8) : 'Contract'}...</td>
                <td>{parseFloat(tx.value).toFixed(4)}</td>
                <td>
                  <span style={{ color: getRiskColor(tx.riskScore || 0) }}>
                    {tx.riskScore ? `${(tx.riskScore * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
