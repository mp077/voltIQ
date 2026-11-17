import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from config import config
from database import get_db

DAY_MODEL_PATH = os.path.join(config.ML_MODELS_DIR, 'forecast_day.joblib')
WEEK_MODEL_PATH = os.path.join(config.ML_MODELS_DIR, 'forecast_week.joblib')

class EnergyForecaster:
    def __init__(self):
        self.day_model = None
        self.week_model = None
        self.trained = False
        os.makedirs(config.ML_MODELS_DIR, exist_ok=True)
        self._try_load()

    def _try_load(self):
        try:
            if os.path.exists(DAY_MODEL_PATH):
                self.day_model = joblib.load(DAY_MODEL_PATH)
            if os.path.exists(WEEK_MODEL_PATH):
                self.week_model = joblib.load(WEEK_MODEL_PATH)
            if self.day_model and self.week_model:
                self.trained = True
        except Exception:
            self.trained = False

    def _build_features(self, df):
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        daily = df.groupby(df['timestamp'].dt.date)['energy_kwh'].sum().reset_index()
        daily.columns = ['date', 'energy_kwh']
        daily['date'] = pd.to_datetime(daily['date'])
        daily = daily.sort_values('date')

        daily['day_of_week'] = daily['date'].dt.dayofweek
        daily['month'] = daily['date'].dt.month
        daily['week_of_year'] = daily['date'].dt.isocalendar().week.astype(int)
        daily['lag_1d'] = daily['energy_kwh'].shift(1)
        daily['lag_7d'] = daily['energy_kwh'].shift(7)
        daily['rolling_7d_avg'] = daily['energy_kwh'].rolling(7, min_periods=1).mean()
        daily['rolling_7d_std'] = daily['energy_kwh'].rolling(7, min_periods=1).std().fillna(0)

        daily = daily.dropna(subset=['lag_1d'])
        return daily

    def train(self, readings_df):
        if readings_df is None or len(readings_df) < 14:
            return False
        daily = self._build_features(readings_df)
        if len(daily) < 7:
            return False

        features = ['day_of_week', 'month', 'week_of_year', 'lag_1d', 'lag_7d',
                    'rolling_7d_avg', 'rolling_7d_std']
        daily[features] = daily[features].fillna(0)
        X = daily[features].values
        y = daily['energy_kwh'].values

        self.day_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.day_model.fit(X, y)

        self.week_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.week_model.fit(X, y)

        joblib.dump(self.day_model, DAY_MODEL_PATH)
        joblib.dump(self.week_model, WEEK_MODEL_PATH)
        self.trained = True
        return True

    def _make_feature_row(self, target_date, daily_history):
        target_date = pd.Timestamp(target_date)
        dow = target_date.dayofweek
        month = target_date.month
        woy = target_date.isocalendar()[1]

        lag_1d_date = target_date - timedelta(days=1)
        lag_7d_date = target_date - timedelta(days=7)

        def get_val(dt):
            row = daily_history[daily_history['date'] == dt]
            if not row.empty:
                return float(row['energy_kwh'].values[0])
            return float(daily_history['energy_kwh'].mean()) if not daily_history.empty else 200.0

        lag_1d = get_val(lag_1d_date)
        lag_7d = get_val(lag_7d_date)
        recent = daily_history.tail(7)
        rolling_avg = float(recent['energy_kwh'].mean()) if not recent.empty else 200.0
        rolling_std = float(recent['energy_kwh'].std()) if len(recent) > 1 else 0.0

        return np.array([[dow, month, woy, lag_1d, lag_7d, rolling_avg, rolling_std]])

    def predict_next_day(self, readings_df=None, building_id=None):
        if readings_df is None:
            readings_df = self._load_readings(building_id)
        if readings_df is None or len(readings_df) < 2:
            return {'date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'), 'predicted_kwh': 200.0}

        daily = self._build_features(readings_df)
        target_date = datetime.now().date() + timedelta(days=1)
        feat = self._make_feature_row(target_date, daily)

        if self.trained and self.day_model:
            predicted = float(self.day_model.predict(feat)[0])
        else:
            predicted = float(daily['energy_kwh'].mean()) if not daily.empty else 200.0

        return {'date': str(target_date), 'predicted_kwh': round(max(predicted, 0), 2)}

    def predict_next_week(self, readings_df=None, building_id=None):
        if readings_df is None:
            readings_df = self._load_readings(building_id)
        if readings_df is None or len(readings_df) < 2:
            base = 200.0
            return [{'date': (datetime.now() + timedelta(days=i+1)).strftime('%Y-%m-%d'),
                     'predicted_kwh': base} for i in range(7)]

        daily = self._build_features(readings_df)
        results = []
        for i in range(1, 8):
            target_date = datetime.now().date() + timedelta(days=i)
            feat = self._make_feature_row(target_date, daily)
            if self.trained and self.week_model:
                predicted = float(self.week_model.predict(feat)[0])
            else:
                predicted = float(daily['energy_kwh'].mean()) if not daily.empty else 200.0
            results.append({'date': str(target_date), 'predicted_kwh': round(max(predicted, 0), 2)})
        return results

    def calculate_mae(self, actuals, predictions):
        if not actuals or not predictions:
            return 0.0
        a = np.array(actuals)
        p = np.array(predictions)
        return float(np.mean(np.abs(a - p)))

    def save_forecast_to_db(self, forecast_data):
        conn = get_db()
        try:
            conn.execute("""
                INSERT INTO energy_forecasts (meter_id, building_id, forecast_type, forecast_date, predicted_kwh, mae)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                forecast_data.get('meter_id'),
                forecast_data.get('building_id'),
                forecast_data.get('forecast_type', 'daily'),
                forecast_data.get('forecast_date'),
                forecast_data.get('predicted_kwh'),
                forecast_data.get('mae')
            ))
            conn.commit()
        finally:
            conn.close()

    def _load_readings(self, building_id=None):
        conn = get_db()
        try:
            if building_id:
                rows = conn.execute(
                    "SELECT timestamp, energy_kwh FROM energy_readings WHERE building_id=? ORDER BY timestamp",
                    (building_id,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT timestamp, energy_kwh FROM energy_readings ORDER BY timestamp"
                ).fetchall()
            if not rows:
                return None
            return pd.DataFrame([dict(r) for r in rows])
        finally:
            conn.close()

# Global singleton
_forecaster = None

def get_forecaster():
    global _forecaster
    if _forecaster is None:
        _forecaster = EnergyForecaster()
    return _forecaster
