from django.contrib import admin
from .models import MLModel, PredictionLog, AIInsight


@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'model_type', 'version', 'accuracy', 'created_at', 'is_active')
    list_filter = ('model_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')


@admin.register(PredictionLog)
class PredictionLogAdmin(admin.ModelAdmin):
    list_display = ('model', 'prediction', 'confidence', 'actual_value', 'created_at')
    list_filter = ('model', 'created_at')
    search_fields = ('prediction', 'actual_value')


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = ('title', 'insight_type', 'confidence_score', 'created_at', 'is_active')
    list_filter = ('insight_type', 'is_active', 'created_at')
    search_fields = ('title', 'description', 'insight_type')
