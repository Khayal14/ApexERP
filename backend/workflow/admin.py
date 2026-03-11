from django.contrib import admin
from .models import (
    Lead, SupplierPI, SupplierPILine,
    ClientQuotation, ClientQuotationLine,
    ClientPO, ClientPOLine,
    CommercialInvoice, Delivery,
)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['client_name', 'client_company', 'business_line', 'status', 'estimated_value', 'currency', 'created_at']
    list_filter = ['business_line', 'status', 'source']
    search_fields = ['client_name', 'client_company', 'client_email']


class SupplierPILineInline(admin.TabularInline):
    model = SupplierPILine
    extra = 1


@admin.register(SupplierPI)
class SupplierPIAdmin(admin.ModelAdmin):
    list_display = ['pi_number', 'supplier', 'business_line', 'currency', 'total', 'issue_date']
    list_filter = ['business_line', 'currency']
    search_fields = ['pi_number', 'supplier__name']
    inlines = [SupplierPILineInline]


class ClientQuotationLineInline(admin.TabularInline):
    model = ClientQuotationLine
    extra = 1


@admin.register(ClientQuotation)
class ClientQuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_number', 'client_name', 'business_line', 'status', 'total', 'issue_date']
    list_filter = ['business_line', 'status']
    search_fields = ['quotation_number', 'client_name', 'client_company']
    inlines = [ClientQuotationLineInline]


class ClientPOLineInline(admin.TabularInline):
    model = ClientPOLine
    extra = 1


@admin.register(ClientPO)
class ClientPOAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'client_name', 'business_line', 'status', 'fulfillment_source', 'total', 'order_date']
    list_filter = ['business_line', 'status', 'fulfillment_source']
    search_fields = ['po_number', 'client_name', 'client_company']
    inlines = [ClientPOLineInline]


@admin.register(CommercialInvoice)
class CommercialInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'client_name', 'business_line', 'status', 'total', 'balance_due', 'due_date']
    list_filter = ['business_line', 'status']
    search_fields = ['invoice_number', 'client_name', 'client_company']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['delivery_number', 'client_name', 'business_line', 'status', 'scheduled_date', 'actual_date']
    list_filter = ['business_line', 'status']
    search_fields = ['delivery_number', 'client_name']
