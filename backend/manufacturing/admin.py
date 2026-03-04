from django.contrib import admin
from .models import BillOfMaterials, BOMLine, WorkCenter, ProductionOrder, WorkOrder, QualityCheck, MaintenanceRecord

class BOMLineInline(admin.TabularInline):
    model = BOMLine
    extra = 2

@admin.register(BillOfMaterials)
class BOMAdmin(admin.ModelAdmin):
    list_display = ['product', 'name', 'version', 'total_cost']
    inlines = [BOMLineInline]

@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'product', 'quantity', 'status', 'priority']
    list_filter = ['status', 'priority']

admin.site.register(WorkCenter)
admin.site.register(WorkOrder)
admin.site.register(QualityCheck)
admin.site.register(MaintenanceRecord)
