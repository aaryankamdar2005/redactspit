import { ethers } from 'ethers';

const AMOY_RPC = import.meta.env.VITE_POLYGON_RPC;

export async function getTransactions(address, blockCount = 100) {
  try {
    const provider = new ethers.JsonRpcProvider(AMOY_RPC);
    const latestBlock = await provider.getBlockNumber();
    const transactions = [];

    for (let i = 0; i < blockCount; i++) {
      const blockNumber = latestBlock - i;
      const block = await provider.getBlock(blockNumber, true);
      
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (tx.from?.toLowerCase() === address.toLowerCase() ||
              tx.to?.toLowerCase() === address.toLowerCase()) {
            
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: ethers.formatEther(tx.value),
              gasPrice: ethers.formatUnits(tx.gasPrice || tx.maxFeePerGas, 'gwei'),
              gasLimit: tx.gasLimit.toString(),
              blockNumber: tx.blockNumber,
              timestamp: block.timestamp,
              type: tx.type
            });
          }
        }
      }
    }

    return transactions;
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return [];
  }
}

export async function getTransactionReceipt(txHash) {
  try {
    const provider = new ethers.JsonRpcProvider(AMOY_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    return {
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'Success' : 'Failed',
      effectiveGasPrice: ethers.formatUnits(receipt.effectiveGasPrice, 'gwei')
    };
  } catch (error) {
    console.error('Get receipt error:', error);
    return null;
  }
}
