from rest_framework import serializers
from .models import (
    Warehouse, ProductCategory, Product, StockLevel, StockMovement,
    InventoryCount, InventoryCountLine, ProductBOM, BOMLine,
    CompanyCostSetting, ProductCost, GoodsReceipt, GoodsReceiptLine,
    StockAlert, InterCompanyTransfer, InterCompanyTransferLine,
)


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    incoming_quantity = serializers.SerializerMethodField()
    has_bom = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_stock_quantity(self, obj):
        return sum(sl.quantity for sl in obj.stock_levels.all())

    def get_incoming_quantity(self, obj):
        return sum(sl.incoming_quantity for sl in obj.stock_levels.all())

    def get_has_bom(self, obj):
        return hasattr(obj, 'bom')


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'


class StockLevelSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_role = serializers.CharField(source='product.product_role', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = StockLevel
        fields = '__all__'


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    source_name = serializers.CharField(source='source_warehouse.name', read_only=True)
    destination_name = serializers.CharField(source='destination_warehouse.name', read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'


class BOMLineSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)
    component_sku = serializers.CharField(source='component.sku', read_only=True)
    component_role = serializers.CharField(source='component.product_role', read_only=True)
    component_cost = serializers.DecimalField(
        source='component.cost_price',
        max_digits=18,
        decimal_places=4,
        read_only=True,
    )
    line_cost = serializers.SerializerMethodField()

    class Meta:
        model = BOMLine
        fields = '__all__'

    def get_line_cost(self, obj):
        return float(obj.quantity * (obj.component.cost_price or 0))


class ProductBOMSerializer(serializers.ModelSerializer):
    lines = BOMLineSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    total_material_cost = serializers.SerializerMethodField()

    class Meta:
        model = ProductBOM
        fields = '__all__'

    def get_total_material_cost(self, obj):
        return sum(
            float(line.quantity * (line.component.cost_price or 0))
            for line in obj.lines.select_related('component')
        )


class CompanyCostSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyCostSetting
        fields = '__all__'


class ProductCostSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    selling_price = serializers.DecimalField(
        source='product.selling_price',
        max_digits=18,
        decimal_places=2,
        read_only=True,
    )
    business_field = serializers.CharField(source='product.business_field', read_only=True)

    class Meta:
        model = ProductCost
        fields = '__all__'


class GoodsReceiptLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = GoodsReceiptLine
        fields = '__all__'


class GoodsReceiptSerializer(serializers.ModelSerializer):
    lines = GoodsReceiptLineSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = '__all__'


class StockAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_role = serializers.CharField(source='product.product_role', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = StockAlert
        fields = '__all__'


class InterCompanyTransferLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = InterCompanyTransferLine
        fields = '__all__'


class InterCompanyTransferSerializer(serializers.ModelSerializer):
    lines = InterCompanyTransferLineSerializer(many=True, read_only=True)
    from_company_name = serializers.CharField(source='from_company.name', read_only=True)
    to_company_name = serializers.CharField(source='to_company.name', read_only=True)
    from_warehouse_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)

    class Meta:
        model = InterCompanyTransfer
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
