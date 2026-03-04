from rest_framework import serializers
from .models import MLModel, PredictionLog, AIInsight

class MLModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModel
        fields = '__all__'

class PredictionLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model.name', read_only=True)
    class Meta:
        model = PredictionLog
        fields = '__all__'

class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = '__all__'
