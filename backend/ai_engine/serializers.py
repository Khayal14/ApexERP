from rest_framework import serializers
from .models import MLModel, PredictionLog, AIInsight

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class MLModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModel
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class PredictionLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model.name', read_only=True)
    class Meta:
        model = PredictionLog
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
