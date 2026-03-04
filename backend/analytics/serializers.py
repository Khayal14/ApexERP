from rest_framework import serializers
from .models import Dashboard, Widget, Report, KPI, DataExport

class WidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Widget
        fields = '__all__'

class DashboardSerializer(serializers.ModelSerializer):
    widgets = WidgetSerializer(many=True, read_only=True)
    class Meta:
        model = Dashboard
        fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

class KPISerializer(serializers.ModelSerializer):
    achievement = serializers.ReadOnlyField()
    change_percent = serializers.SerializerMethodField()
    class Meta:
        model = KPI
        fields = '__all__'
    def get_change_percent(self, obj):
        if obj.previous_value and obj.previous_value > 0:
            return round(float((obj.current_value - obj.previous_value) / obj.previous_value * 100), 2)
        return 0

class DataExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataExport
        fields = '__all__'
