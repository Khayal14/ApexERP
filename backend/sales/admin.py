from django.contrib import admin
from .models import Quotation, QuotationLine, SalesOrder, SalesOrderLine, ReturnOrder, PricingRule

class QuotationLineInline(admin.TabularInline):
    model = QuotationLine
    extra = 1

class SalesOrderLineInline(admin.TabularInline):
    model = SalesOrderLine
    extra = 1

@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quote_number', 'customer_name', 'status', 'total', 'issue_date']
    list_filter = ['status']
    inlines = [QuotationLineInline]

@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer_name', 'status', 'payment_status', 'total']
    list_filter = ['status', 'payment_status']
    inlines = [SalesOrderLineInline]

admin.site.register(ReturnOrder)
admin.site.register(PricingRule)
