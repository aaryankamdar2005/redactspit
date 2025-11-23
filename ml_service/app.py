from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import joblib
import numpy as np
import pandas as pd
import uvicorn
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="ChainGuard ML Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
model = None
try:
    model = joblib.load('calibrated_model_quantile.pkl')
    logger.info("✅ Calibrated model loaded!")
except:
    try:
        model = joblib.load('rf_model_quantile.pkl')
        logger.info("✅ RF model loaded!")
    except:
        try:
            model = joblib.load('rf_model.pkl')
            logger.info("✅ RF model loaded from rf_model.pkl")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")

logger.info(f"   Model type: {type(model).__name__}")

# GAS PRICE RULES (in Gwei)
GAS_SAFE_THRESHOLD = 100
GAS_SUSPICIOUS_THRESHOLD = 300

# Request/Response models
class TransactionBatch(BaseModel):
    transactions: List[Dict[str, Any]]

class PredictionResponse(BaseModel):
    risk_score: float
    is_fraudulent: bool
    anomaly_type: str
    confidence: float

class BatchPredictionResponse(BaseModel):
    results: List[PredictionResponse]
    total_analyzed: int

def extract_features(tx, all_txs=None):
    """Extract 9 features matching training script"""
    try:
        value = float(tx.get('value', 0) or 0) / 1e18
        block_height = int(tx.get('blockNumber', 0) or 0)
        timestamp = int(tx.get('timeStamp', 0) or 0)
        from_addr = tx.get('from', '').lower()
        to_addr = (tx.get('to', '') or '').lower()
        
        value_log = np.log1p(value)
        
        from_count = 1
        to_count = 1
        from_unique_receivers = 1
        
        if all_txs and len(all_txs) > 1:
            from_count = sum(1 for t in all_txs if t.get('from', '').lower() == from_addr)
            to_count = sum(1 for t in all_txs if (t.get('to', '') or '').lower() == to_addr)
            unique_receivers = set(t.get('to', '').lower() for t in all_txs if t.get('from', '').lower() == from_addr)
            from_unique_receivers = len(unique_receivers) if unique_receivers else 1
        
        dt = pd.to_datetime(timestamp, unit='s')
        hour = dt.hour
        day_of_week = dt.dayofweek
        
        time_since_last = -1.0
        if all_txs and len(all_txs) > 1:
            sender_txs = [t for t in all_txs if t.get('from', '').lower() == from_addr]
            sender_txs_sorted = sorted(sender_txs, key=lambda x: int(x.get('timeStamp', 0) or 0))
            idx = next((i for i, t in enumerate(sender_txs_sorted) if t.get('hash') == tx.get('hash')), None)
            if idx and idx > 0:
                prev_time = int(sender_txs_sorted[idx-1].get('timeStamp', 0) or 0)
                time_since_last = float(timestamp - prev_time)
        
        sender_age = 0.0
        if all_txs and len(all_txs) > 1:
            sender_txs_times = [int(t.get('timeStamp', 0) or 0) for t in all_txs if t.get('from', '').lower() == from_addr]
            if sender_txs_times:
                first_seen = min(sender_txs_times)
                sender_age = float(timestamp - first_seen)
        
        features = [
            value_log, block_height, from_count, to_count,
            from_unique_receivers, hour, day_of_week,
            time_since_last, sender_age
        ]
        
        return np.array(features, dtype=float).reshape(1, -1)
        
    except Exception as e:
        logger.error(f"❌ Feature extraction error: {e}")
        raise

def get_gas_price_gwei(tx):
    """Extract gas price in Gwei"""
    try:
        gas_price_wei = float(tx.get('gasPrice', 0) or 0)
        gas_price_gwei = gas_price_wei / 1e9
        return gas_price_gwei
    except:
        return 0.0

def apply_gas_price_rules(gas_price_gwei):
    """Check gas price rules (PRIMARY)"""
    if gas_price_gwei < GAS_SAFE_THRESHOLD:
        return (15.0, False, "Safe (Low Gas Price)")
    elif gas_price_gwei <= GAS_SUSPICIOUS_THRESHOLD:
        position = (gas_price_gwei - GAS_SAFE_THRESHOLD) / (GAS_SUSPICIOUS_THRESHOLD - GAS_SAFE_THRESHOLD)
        risk_score = 50 + (position * 20)
        return (risk_score, False, "Suspicious (Medium Gas Price)")
    else:
        excess = min(gas_price_gwei - GAS_SUSPICIOUS_THRESHOLD, 500)
        risk_score = 75 + (excess / 500) * 20
        return (min(risk_score, 95.0), True, "Fraudulent (High Gas Price)")

def adjust_ml_score_with_gas(ml_risk, gas_risk, gas_price_gwei):
    """Combine gas price rule with ML prediction"""
    if gas_price_gwei > GAS_SUSPICIOUS_THRESHOLD:
        return max(gas_risk, ml_risk)
    elif gas_price_gwei >= GAS_SAFE_THRESHOLD:
        return (gas_risk * 0.7) + (ml_risk * 0.3)
    else:
        return (gas_risk * 0.4) + (ml_risk * 0.6)

def get_final_anomaly_type(risk_score):
    """Determine anomaly type from final risk score"""
    if risk_score < 30:
        return "Safe"
    elif risk_score < 50:
        return "Low Risk"
    elif risk_score < 70:
        return "Suspicious Activity"
    elif risk_score < 85:
        return "High Risk"
    else:
        return "Critical Fraud Alert"

# API Endpoints
@app.get("/")
def root():
    return {
        "service": "ChainGuard ML Service with Gas Price Rules",
        "status": "online",
        "model_loaded": model is not None,
        "gas_rules": {
            "safe": "< 100 Gwei",
            "suspicious": "100-300 Gwei",
            "fraudulent": "> 300 Gwei"
        }
    }

@app.get("/health")
def health():
    return {
        "status": "healthy" if model else "degraded",
        "model_loaded": model is not None,
        "timestamp": pd.Timestamp.now().isoformat()
    }

@app.post("/predict-batch", response_model=BatchPredictionResponse)
async def predict_batch(data: TransactionBatch):
    """Analyze transactions with GAS PRICE RULES FIRST, then ML"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        transactions = data.transactions
        logger.info(f"📊 Analyzing {len(transactions)} transactions...")
        
        results = []
        
        for idx, tx in enumerate(transactions):
            try:
                logger.info(f"   [{idx + 1}/{len(transactions)}] Processing...")
                
                # STEP 1: Check gas price FIRST
                gas_price_gwei = get_gas_price_gwei(tx)
                gas_risk, gas_fraud, gas_type = apply_gas_price_rules(gas_price_gwei)
                
                logger.info(f"   🔥 Gas: {gas_price_gwei:.2f} Gwei → Risk={gas_risk:.1f}%")
                
                # STEP 2: Get ML prediction
                features = extract_features(tx, all_txs=transactions)
                proba = model.predict_proba(features)
                ml_risk = round(proba[0][1] * 100, 2)
                
                logger.info(f"   🤖 ML: Risk={ml_risk:.1f}%")
                
                # STEP 3: Combine
                final_risk = adjust_ml_score_with_gas(ml_risk, gas_risk, gas_price_gwei)
                final_risk = round(final_risk, 2)
                
                is_fraudulent = final_risk >= 70
                anomaly_type = get_final_anomaly_type(final_risk)
                confidence = float(max(proba[0]))
                
                logger.info(f"   ✅ FINAL: Risk={final_risk}%, Fraud={is_fraudulent}")
                
                results.append(PredictionResponse(
                    risk_score=final_risk,
                    is_fraudulent=is_fraudulent,
                    anomaly_type=anomaly_type,
                    confidence=round(confidence, 4)
                ))
                
            except Exception as e:
                logger.error(f"   ❌ Error: {str(e)}")
                results.append(PredictionResponse(
                    risk_score=0.0,
                    is_fraudulent=False,
                    anomaly_type="Analysis Failed",
                    confidence=0.0
                ))
        
        logger.info(f"✅ Complete: {len(results)} results")
        
        return BatchPredictionResponse(
            results=results,
            total_analyzed=len(results)
        )
        
    except Exception as e:
        logger.error(f"❌ Batch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
def model_info():
    """Get model information"""
    if model is None:
        return {"error": "Model not loaded"}
    
    return {
        "model_type": type(model).__name__,
        "features_expected": 9,
        "gas_price_rules": {
            "safe": "< 100 Gwei",
            "suspicious": "100-300 Gwei",
            "fraudulent": "> 300 Gwei"
        }
    }

@app.post("/test-predict")
async def test_predict():
    """Test with sample transaction"""
    sample_tx = {
        "hash": "0xtest",
        "blockNumber": "28347126",
        "timeStamp": "1761752025",
        "from": "0xdbcc587c73c1fc82b4bb154d1af3adc025ea3163",
        "to": "0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1",
        "value": "100000000000000000",
        "gasPrice": "50000000000"  # 50 Gwei
    }
    
    result = await predict_batch(TransactionBatch(transactions=[sample_tx]))
    return result

# Run server
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
    