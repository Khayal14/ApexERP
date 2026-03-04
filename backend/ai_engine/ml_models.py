"""
ML Model implementations using scikit-learn.
These provide predictive analytics across modules.
"""
import numpy as np
import logging
from datetime import timedelta

logger = logging.getLogger('apex_erp')

try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning('scikit-learn not available. AI features will be limited.')


class DemandForecaster:
    """Predict future demand for inventory products."""

    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42) if ML_AVAILABLE else None
        self.scaler = StandardScaler() if ML_AVAILABLE else None
        self.is_trained = False

    def train(self, historical_data):
        if not ML_AVAILABLE or not historical_data:
            return {'status': 'skipped', 'reason': 'ML not available or no data'}

        X = np.array([[d['month'], d['day_of_week'], d['quarter'], d.get('price', 0),
                        d.get('promotions', 0)] for d in historical_data])
        y = np.array([d['demand'] for d in historical_data])

        if len(X) < 10:
            return {'status': 'insufficient_data', 'count': len(X)}

        X_scaled = self.scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)
        self.is_trained = True
        score = self.model.score(X_test, y_test)
        return {'status': 'trained', 'r2_score': round(score, 4), 'samples': len(X)}

    def predict(self, features):
        if not self.is_trained:
            return {'predicted_demand': 0, 'confidence': 0}
        X = np.array([features])
        X_scaled = self.scaler.transform(X)
        prediction = self.model.predict(X_scaled)[0]
        return {'predicted_demand': round(max(prediction, 0), 2), 'confidence': 0.85}


class ExpenseCategorizer:
    """Auto-categorize expenses based on description."""

    def __init__(self):
        self.model = GradientBoostingClassifier(n_estimators=50, random_state=42) if ML_AVAILABLE else None
        self.categories = {}
        self.is_trained = False

    def categorize(self, description, keywords_map):
        """Rule-based categorization with keyword matching."""
        description_lower = description.lower()
        best_match = None
        best_score = 0

        for category, keywords in keywords_map.items():
            score = sum(1 for kw in keywords if kw.lower() in description_lower)
            if score > best_score:
                best_score = score
                best_match = category

        confidence = min(best_score / max(len(description.split()), 1), 1.0)
        return {
            'category': best_match,
            'confidence': round(confidence, 2),
            'method': 'keyword_matching'
        }


class LeadScorer:
    """Score leads based on their attributes and behavior."""

    def score(self, contact_data):
        score = 30  # Base score

        # Attribute scoring
        if contact_data.get('email'):
            score += 10
        if contact_data.get('phone'):
            score += 5
        if contact_data.get('company_name'):
            score += 10
        if contact_data.get('job_title'):
            score += 5

        # Behavior scoring
        activities = contact_data.get('activity_count', 0)
        score += min(activities * 3, 20)

        deals = contact_data.get('deal_count', 0)
        score += min(deals * 10, 20)

        if contact_data.get('website_visits', 0) > 5:
            score += 10

        # Industry scoring
        high_value_industries = ['technology', 'finance', 'healthcare', 'manufacturing']
        if contact_data.get('industry', '').lower() in high_value_industries:
            score += 10

        return {
            'score': min(score, 100),
            'grade': 'A' if score >= 80 else 'B' if score >= 60 else 'C' if score >= 40 else 'D',
            'method': 'rule_based'
        }


class TaskPrioritizer:
    """AI-based task prioritization."""

    def prioritize(self, tasks_data):
        scored_tasks = []
        for task in tasks_data:
            score = 50  # Base

            # Due date urgency
            days_until_due = task.get('days_until_due')
            if days_until_due is not None:
                if days_until_due < 0:
                    score += 30  # Overdue
                elif days_until_due <= 1:
                    score += 25
                elif days_until_due <= 3:
                    score += 15
                elif days_until_due <= 7:
                    score += 5

            # Priority weighting
            priority_weights = {'urgent': 20, 'high': 15, 'medium': 5, 'low': 0}
            score += priority_weights.get(task.get('priority', 'medium'), 5)

            # Dependencies
            if task.get('blocking_count', 0) > 0:
                score += task['blocking_count'] * 5

            scored_tasks.append({
                'task_id': task['id'],
                'score': min(score, 100),
                'recommended_order': 0  # Set after sorting
            })

        scored_tasks.sort(key=lambda x: x['score'], reverse=True)
        for i, t in enumerate(scored_tasks):
            t['recommended_order'] = i + 1

        return scored_tasks
