from rest_framework import serializers
from .models import BillOfMaterials, BOMLine, WorkCenter, ProductionOrder, WorkOrder, QualityCheck, MaintenanceRecord

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class BOMLineSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)
    class Meta:
        model = BOMLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class BillOfMaterialsSerializer(serializers.ModelSerializer):
    lines = BOMLineSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = BillOfMaterials
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class WorkCenterSerializer(serializers.ModelSerializer):
    active_orders = serializers.SerializerMethodField()
    class Meta:
        model = WorkCenter
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_active_orders(self, obj):
        return obj.work_orders.filter(status='in_progress').count()

class WorkOrderSerializer(serializers.ModelSerializer):
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)
    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class ProductionOrderSerializer(serializers.ModelSerializer):
    work_orders = WorkOrderSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    completion_rate = serializers.SerializerMethodField()
    class Meta:
        model = ProductionOrder
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_completion_rate(self, obj):
        return round(float(obj.completed_quantity / obj.quantity * 100), 2) if obj.quantity else 0

class QualityCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityCheck
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
