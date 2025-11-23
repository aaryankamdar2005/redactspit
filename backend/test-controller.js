const transactionController = require('./src/controllers/transactionController');

console.log('Testing Transaction Controller Methods:\n');

const methods = [
  'fetchTransaction',
  'fetchWalletTransactions',
  'analyzeTransaction',
  'batchAnalyze',
  'getUserTransactions',
  'getFlaggedTransactions',
  'getAlerts'
];

methods.forEach(method => {
  if (typeof transactionController[method] === 'function') {
    console.log(`✅ ${method} - OK`);
  } else {
    console.log(`❌ ${method} - MISSING OR NOT A FUNCTION`);
  }
});
