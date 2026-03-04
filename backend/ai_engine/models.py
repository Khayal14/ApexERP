import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class MLModel(BaseModel):
    """Track deployed ML models."""
    name = models.CharField(max_length=255)
    model_type = models.CharField(max_length=50, choices=[
        ('demand_forecast', _('Demand Forecasting')),
        ('lead_scoring', _('Lead Scoring')),
        ('expense_categorization', _('Expense Categorization')),
        ('talent_matching', _('Talent Matching')),
        ('price_optimization', _('Price Optimization')),
        ('sentiment_analysis', _('Sentiment Analysis')),
        ('task_prioritization', _('Task Prioritization')),
    ])
    version = models.CharField(max_length=20)
    file_path = models.CharField(max_length=500, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    parameters = models.JSONField(default=dict)
    training_data_info = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    last_trained = models.DateTimeField(null=True, blank=True)
    last_used = models.DateTimeField(null=True, blank=True)
    prediction_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ['company', 'model_type', 'version']

    def __str__(self):
        return f"{self.name} v{self.version}"


class PredictionLog(BaseModel):
    """Log all AI predictions for audit."""
    model = models.ForeignKey(MLModel, on_delete=models.CASCADE, related_name='predictions')
    input_data = models.JSONField()
    output_data = models.JSONField()
    confidence = models.FloatField(null=True, blank=True)
    feedback = models.CharField(max_length=20, blank=True, choices=[
        ('correct', _('Correct')), ('incorrect', _('Incorrect')), ('partial', _('Partial')),
    ])
    processing_time_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class AIInsight(BaseModel):
    """AI-generated business insights."""
    module = models.CharField(max_length=50)
    insight_type = models.CharField(max_length=50, choices=[
        ('anomaly', _('Anomaly Detection')),
        ('trend', _('Trend Analysis')),
        ('recommendation', _('Recommendation')),
        ('forecast', _('Forecast')),
        ('optimization', _('Optimization')),
    ])
    title = models.CharField(max_length=255)
    description = models.TextField()
    data = models.JSONField(default=dict)
    severity = models.CharField(max_length=20, default='info', choices=[
        ('info', _('Info')), ('warning', _('Warning')), ('critical', _('Critical')),
    ])
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.module}] {self.title}"
