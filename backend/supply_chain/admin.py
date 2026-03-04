from django.contrib import admin
from .models import Vendor, PurchaseOrder, PurchaseOrderLine, RFQ, VendorQuotation, SupplyChainEvent

class POLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 1

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'email', 'is_approved', 'rating']
    list_filter = ['is_approved', 'category']

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'vendor', 'status', 'total', 'order_date']
    list_filter = ['status']
    inlines = [POLineInline]

@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ['rfq_number', 'title', 'status', 'deadline']

admin.site.register(VendorQuotation)
admin.site.register(SupplyChainEvent)
