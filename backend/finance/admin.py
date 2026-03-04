from django.contrib import admin
from .models import (
    Currency, FiscalYear, ChartOfAccount, JournalEntry, JournalEntryLine,
    Invoice, InvoiceLine, Payment, TaxRate, Budget, Expense, ExpenseCategory
)


class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 2


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 1


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'symbol', 'exchange_rate', 'is_active']


@admin.register(ChartOfAccount)
class ChartOfAccountAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'account_type', 'balance', 'company']
    list_filter = ['account_type', 'company']
    search_fields = ['code', 'name']


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['entry_number', 'date', 'description', 'status', 'total_debit']
    list_filter = ['status', 'date']
    inlines = [JournalEntryLineInline]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'invoice_type', 'status', 'total', 'due_date']
    list_filter = ['status', 'invoice_type']
    search_fields = ['invoice_number', 'customer_name']
    inlines = [InvoiceLineInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_number', 'invoice', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method']


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['name', 'fiscal_year', 'total_budget', 'spent', 'remaining', 'status']
    list_filter = ['status']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['description', 'amount', 'category', 'status', 'employee', 'date']
    list_filter = ['status', 'category']
