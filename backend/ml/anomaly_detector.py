import numpy as np
import pandas as pd
import joblib
import os
from sklearn.ensemble import IsolationForest
from scipy import stats
from config import config

MODEL_PATH = os.path.join(config.ML_MODELS_DIR, 'anomaly_model.joblib')

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.trained = False
        self.feature_stats = {}
        os.makedirs(config.ML_MODELS_DIR, exist_ok=True)
        self._try_load()

    def _try_load(self):
        if os.path.exists(MODEL_PATH):
            try:
                data = joblib.load(MODEL_PATH)
                self.model = data.get('model')
                self.feature_stats = data.get('feature_stats', {})
                self.trained = True
            except Exception:
                self.trained = False

    def _build_features(self, df):
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['energy_rolling_avg'] = df['energy_kwh'].rolling(window=24, min_periods=1).mean()
        df['energy_rolling_std'] = df['energy_kwh'].rolling(window=24, min_periods=1).std().fillna(0)
        df['demand_to_avg_ratio'] = df['energy_kwh'] / (df['energy_rolling_avg'] + 1e-6)
        features = ['energy_kwh', 'peak_demand_kw', 'hour_of_day', 'day_of_week',
                    'energy_rolling_avg', 'energy_rolling_std', 'demand_to_avg_ratio']
        df[features] = df[features].fillna(0)
        return df, features

    def train(self, readings_df):
        if len(readings_df) < 10:
            return False
        df, features = self._build_features(readings_df)
        X = df[features].values
        self.feature_stats = {
            'mean': df[features].mean().to_dict(),
            'std': df[features].std().to_dict(),
            'features': features
        }
        contamination = 0.05
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        self.model.fit(X)
        self.trained = True
        joblib.dump({'model': self.model, 'feature_stats': self.feature_stats}, MODEL_PATH)
        return True

    def predict(self, reading, historical_df=None):
        """
        reading: dict with keys: energy_kwh, peak_demand_kw, timestamp
        Returns: (is_anomaly: bool, score: float, reason: str)
        """
        energy = reading.get('energy_kwh', 0)
        demand = reading.get('peak_demand_kw', 0)
        try:
            ts = pd.to_datetime(reading.get('timestamp'))
            hour = ts.hour
            dow = ts.dayofweek
        except Exception:
            hour = 12
            dow = 0

        if historical_df is not None and len(historical_df) >= 50 and self.trained:
            # ML-based
            if len(historical_df) >= 24:
                rolling_avg = historical_df['energy_kwh'].tail(24).mean()
                rolling_std = historical_df['energy_kwh'].tail(24).std()
            else:
                rolling_avg = historical_df['energy_kwh'].mean()
                rolling_std = historical_df['energy_kwh'].std()

            rolling_std = rolling_std if not np.isnan(rolling_std) else 0
            demand_to_avg = energy / (rolling_avg + 1e-6)

            features = np.array([[energy, demand, hour, dow, rolling_avg, rolling_std, demand_to_avg]])
            score = float(self.model.score_samples(features)[0])
            pred = self.model.predict(features)[0]
            is_anomaly = pred == -1
            reason = self.get_reason({'energy_kwh': energy, 'rolling_avg': rolling_avg,
                                       'rolling_std': rolling_std, 'hour': hour, 'dow': dow,
                                       'demand': demand}) if is_anomaly else "Normal reading"
            return is_anomaly, score, reason
        else:
            # Fallback: z-score based
            if historical_df is not None and len(historical_df) >= 5:
                mean_e = historical_df['energy_kwh'].mean()
                std_e = historical_df['energy_kwh'].std()
                if std_e > 0:
                    z = abs((energy - mean_e) / std_e)
                    is_anomaly = z > 2.5
                    score = -z
                    reason = f"Energy {energy:.1f} kWh deviates {z:.1f}σ from mean {mean_e:.1f} kWh" if is_anomaly else "Normal reading"
                    return is_anomaly, score, reason
            # Very minimal data: simple threshold
            is_anomaly = energy > 2000 or energy < 0
            score = -1.0 if is_anomaly else 0.5
            reason = "Extreme value detected" if is_anomaly else "Normal reading"
            return is_anomaly, score, reason

    def get_reason(self, features):
        energy = features.get('energy_kwh', 0)
        rolling_avg = features.get('rolling_avg', energy)
        rolling_std = features.get('rolling_std', 0)
        hour = features.get('hour', 12)
        demand = features.get('demand', 0)

        reasons = []
        if rolling_std > 0:
            z = abs(energy - rolling_avg) / rolling_std
            if z > 2:
                direction = "above" if energy > rolling_avg else "below"
                reasons.append(f"Energy {energy:.1f}kWh is {z:.1f}σ {direction} 24h average ({rolling_avg:.1f}kWh)")
        if 0 <= hour <= 5 and energy > rolling_avg * 1.5:
            reasons.append(f"Unusually high consumption during off-peak hours ({hour}:00)")
        if demand > rolling_avg * 2:
            reasons.append(f"Peak demand {demand:.1f}kW significantly exceeds average")
        if not reasons:
            reasons.append(f"Statistical anomaly: energy={energy:.1f}kWh at hour={hour}")
        return "; ".join(reasons)

# Global singleton
_detector = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = AnomalyDetector()
    return _detector
