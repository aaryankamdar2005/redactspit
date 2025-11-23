import { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './RiskScore.css';

export default function RiskScore({ transactions }) {
  const [riskSummary, setRiskSummary] = useState({
    averageRisk: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      calculateRiskSummary(transactions);
    }
  }, [transactions]);

  function calculateRiskSummary(txs) {
    const validTxs = txs.filter(tx => tx.riskScore !== undefined);
    
    if (validTxs.length === 0) {
      return;
    }

    const totalRisk = validTxs.reduce((sum, tx) => sum + tx.riskScore, 0);
    const avgRisk = totalRisk / validTxs.length;

    const highRisk = validTxs.filter(tx => tx.riskScore >= 0.7).length;
    const mediumRisk = validTxs.filter(tx => tx.riskScore >= 0.3 && tx.riskScore < 0.7).length;
    const lowRisk = validTxs.filter(tx => tx.riskScore < 0.3).length;

    setRiskSummary({
      averageRisk: avgRisk,
      highRiskCount: highRisk,
      mediumRiskCount: mediumRisk,
      lowRiskCount: lowRisk,
      totalTransactions: validTxs.length
    });
  }

  function getRiskLevel(score) {
    if (score < 0.3) return 'Low Risk';
    if (score < 0.7) return 'Medium Risk';
    return 'High Risk';
  }

  function getRiskColor(score) {
    if (score < 0.3) return '#10b981'; // Green
    if (score < 0.7) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  // Data for pie chart
  const pieData = [
    { name: 'Low Risk', value: riskSummary.lowRiskCount, color: '#10b981' },
    { name: 'Medium Risk', value: riskSummary.mediumRiskCount, color: '#f59e0b' },
    { name: 'High Risk', value: riskSummary.highRiskCount, color: '#ef4444' }
  ].filter(item => item.value > 0);

  return (
    <div className="risk-score-container">
      <h3>Risk Analysis Dashboard</h3>

      {riskSummary.totalTransactions === 0 ? (
        <div className="no-data">
          <p>No transaction data available for risk analysis</p>
        </div>
      ) : (
        <>
          {/* Overall Risk Gauge */}
          <div className="gauge-section">
            <h4>Overall Account Risk Score</h4>
            <div className="gauge-wrapper">
              <GaugeChart
                id="overall-risk-gauge"
                nrOfLevels={30}
                colors={['#10b981', '#fbbf24', '#ef4444']}
                arcWidth={0.3}
                percent={riskSummary.averageRisk}
                textColor="#000"
                needleColor="#374151"
                needleBaseColor="#374151"
                hideText={false}
                formatTextValue={value => `${value}%`}
                animate={true}
                animDelay={0}
              />
            </div>
            <div className="gauge-label">
              <span 
                className="risk-badge"
                style={{ backgroundColor: getRiskColor(riskSummary.averageRisk) }}
              >
                {getRiskLevel(riskSummary.averageRisk)}
              </span>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="distribution-section">
            <h4>Risk Distribution</h4>
            
            <div className="stats-grid">
              <div className="stat-card low-risk">
                <div className="stat-icon">✓</div>
                <div className="stat-content">
                  <p className="stat-label">Low Risk</p>
                  <p className="stat-value">{riskSummary.lowRiskCount}</p>
                  <p className="stat-percent">
                    {((riskSummary.lowRiskCount / riskSummary.totalTransactions) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="stat-card medium-risk">
                <div className="stat-icon">⚠</div>
                <div className="stat-content">
                  <p className="stat-label">Medium Risk</p>
                  <p className="stat-value">{riskSummary.mediumRiskCount}</p>
                  <p className="stat-percent">
                    {((riskSummary.mediumRiskCount / riskSummary.totalTransactions) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="stat-card high-risk">
                <div className="stat-icon">✕</div>
                <div className="stat-content">
                  <p className="stat-label">High Risk</p>
                  <p className="stat-value">{riskSummary.highRiskCount}</p>
                  <p className="stat-percent">
                    {((riskSummary.highRiskCount / riskSummary.totalTransactions) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent High-Risk Transactions */}
          {riskSummary.highRiskCount > 0 && (
            <div className="alerts-section">
              <h4>⚠️ High-Risk Transactions Detected</h4>
              <div className="alert-list">
                {transactions
                  .filter(tx => tx.riskScore >= 0.7)
                  .slice(0, 5)
                  .map(tx => (
                    <div key={tx.hash} className="alert-item">
                      <div className="alert-header">
                        <span className="alert-hash">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                        </span>
                        <span className="alert-score" style={{ color: getRiskColor(tx.riskScore) }}>
                          {(tx.riskScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="alert-details">
                        <span>Value: {parseFloat(tx.value).toFixed(4)} MATIC</span>
                        <span>•</span>
                        <span>From: {tx.from.slice(0, 8)}...</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${tx.riskScore * 100}%`,
                            backgroundColor: getRiskColor(tx.riskScore)
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="summary-section">
            <div className="summary-item">
              <span className="summary-label">Total Transactions Analyzed:</span>
              <span className="summary-value">{riskSummary.totalTransactions}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Risk Score:</span>
              <span className="summary-value" style={{ color: getRiskColor(riskSummary.averageRisk) }}>
                {(riskSummary.averageRisk * 100).toFixed(2)}%
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Security Status:</span>
              <span className={`summary-value ${riskSummary.averageRisk < 0.3 ? 'secure' : 'warning'}`}>
                {riskSummary.averageRisk < 0.3 ? '✓ Secure' : '⚠ Monitor Closely'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
