from rest_framework import serializers
from .models import (
    Warehouse, ProductCategory, Product, StockLevel, StockMovement,
    InventoryCount, InventoryCountLine, DemandForecast
)

class WarehouseSerializer(serializers.ModelSerializer):
    utilization = serializers.SerializerMethodField()
    class Meta:
        model = Warehouse
        fields = '__all__'
    def get_utilization(self, obj):
        total_stock = sum(sl.quantity for sl in obj.stock_levels.all())
        return round(float(total_stock / obj.capacity * 100), 2) if obj.capacity > 0 else 0

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    total_stock = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    class Meta:
        model = Product
        fields = '__all__'
    def get_total_stock(self, obj):
        return float(sum(sl.quantity for sl in obj.stock_levels.all()))

class StockLevelSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    class Meta:
        model = StockLevel
        fields = '__all__'

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = StockMovement
        fields = '__all__'

class InventoryCountLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = InventoryCountLine
        fields = '__all__'

class InventoryCountSerializer(serializers.ModelSerializer):
    lines = InventoryCountLineSerializer(many=True, read_only=True)
    class Meta:
        model = InventoryCount
        fields = '__all__'

class DemandForecastSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    accuracy = serializers.SerializerMethodField()
    class Meta:
        model = DemandForecast
        fields = '__all__'
    def get_accuracy(self, obj):
        if obj.actual_demand and obj.forecasted_demand:
            return round((1 - abs(float(obj.actual_demand - obj.forecasted_demand) / float(obj.forecasted_demand))) * 100, 2)
        return None
