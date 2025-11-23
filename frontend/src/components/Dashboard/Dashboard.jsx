import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import WalletConnect from "../MetaMask/WalletConnect";
import TransactionList from "./TransactionList";
import Helpline from "../Support/Helpline";

export default function Dashboard() {
  const [walletAddress, setWalletAddress] = useState(null);
  const { user, signOut, otpVerified } = useAuth();
  const navigate = useNavigate();

  // Redirect if OTP is not verified
  useEffect(() => {
    if (!otpVerified) {
      navigate("/verify-otp");
    }
  }, [otpVerified, navigate]);

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  // Prevent UI from flickering while redirecting
  if (!otpVerified) return null;

  return (
    <div className="dashboard">
      <header>
        <h1>ChainGuard Dashboard</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="wallet-section">
          <WalletConnect onConnect={setWalletAddress} />
        </section>

        {walletAddress && (
          <section className="transactions-section">
            <TransactionList walletAddress={walletAddress} />
          </section>
        )}

        <section className="support-section">
          <Helpline />
        </section>
      </div>
    </div>
  );
}
