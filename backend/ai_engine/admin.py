from django.contrib import admin
from .models import MLModel, PredictionLog, AIInsight


@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'model_type', 'version', 'accuracy', 'created_at', 'is_active')
    list_filter = ('model_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')


@admin.register(PredictionLog)
class PredictionLogAdmin(admin.ModelAdmin):
    list_display = ('model', 'confidence', 'feedback', 'processing_time_ms', 'created_at')
    list_filter = ('model', 'feedback', 'created_at')
    search_fields = ('feedback',)


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = ('title', 'insight_type', 'severity', 'is_acknowledged', 'created_at')
    list_filter = ('insight_type', 'severity', 'is_acknowledged', 'created_at')
    search_fields = ('title', 'description')
