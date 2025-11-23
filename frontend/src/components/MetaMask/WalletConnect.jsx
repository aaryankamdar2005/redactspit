import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function WalletConnect({ onConnect }) {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState(null);

  const AMOY_CHAIN_ID = '0x13882';
  const AMOY_CONFIG = {
    chainId: AMOY_CHAIN_ID,
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  };

  useEffect(() => {
    checkConnection();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  async function checkConnection() {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          await checkNetwork(provider);
          await getBalance(accounts[0].address, provider);
          onConnect && onConnect(accounts[0].address);
        }
      } catch (error) {
        console.error('Check connection error:', error);
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);

      await switchToAmoy();
      await getBalance(accounts[0], provider);
      onConnect && onConnect(accounts[0]);
    } catch (error) {
      console.error('Connection error:', error);
    }
  }

  async function checkNetwork(provider) {
    const network = await provider.getNetwork();
    setNetwork(network.chainId === 80002n ? 'Polygon Amoy' : 'Wrong Network');
  }

  async function switchToAmoy() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID }],
      });
      setNetwork('Polygon Amoy');
    } catch (error) {
      if (error.code === 4902) {
        await addAmoyNetwork();
      }
    }
  }

  async function addAmoyNetwork() {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [AMOY_CONFIG]
    });
    setNetwork('Polygon Amoy');
  }

  async function getBalance(address, provider) {
    const balance = await provider.getBalance(address);
    setBalance(parseFloat(ethers.formatEther(balance)).toFixed(4));
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      setAccount(null);
      setBalance(null);
    } else {
      setAccount(accounts[0]);
      checkConnection();
    }
  }

  return (
    <div className="wallet-connect">
      {!account ? (
        <button onClick={connectWallet} className="connect-btn">
          Connect MetaMask
        </button>
      ) : (
        <div className="wallet-info">
          <p><strong>Address:</strong> {account.slice(0, 6)}...{account.slice(-4)}</p>
          <p><strong>Network:</strong> {network}</p>
          <p><strong>Balance:</strong> {balance} MATIC</p>
          
          {network !== 'Polygon Amoy' && (
            <button onClick={switchToAmoy}>Switch to Amoy</button>
          )}
        </div>
      )}
    </div>
  );
}
