from django.contrib import admin
from .models import Warehouse, ProductCategory, Product, StockLevel, StockMovement, InventoryCount, DemandForecast

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'product_type', 'cost_price', 'selling_price', 'reorder_point']
    list_filter = ['product_type', 'category']
    search_fields = ['name', 'sku', 'barcode']

@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ['product', 'warehouse', 'quantity', 'available_quantity']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'date']
    list_filter = ['movement_type']

admin.site.register(Warehouse)
admin.site.register(ProductCategory)
admin.site.register(InventoryCount)
admin.site.register(DemandForecast)
