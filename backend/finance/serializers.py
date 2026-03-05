from rest_framework import serializers
from .models import (

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')

    Currency, FiscalYear, ChartOfAccount, JournalEntry, JournalEntryLine,
    Invoice, InvoiceLine, Payment, TaxRate, Budget, BudgetLine,
    ExpenseCategory, Expense
)


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class ChartOfAccountSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = ChartOfAccount
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return ChartOfAccountSerializer(children, many=True).data if children.exists() else []


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def validate(self, data):
        if data.get('status') == 'posted':
            lines = self.instance.lines.all() if self.instance else []
            total_debit = sum(l.debit for l in lines)
            total_credit = sum(l.credit for l in lines)
            if total_debit != total_credit:
                raise serializers.ValidationError('Debits must equal credits.')
        return data


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments_total = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_payments_total(self, obj):
        return sum(p.amount for p in obj.payments.filter(status='completed'))


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class BudgetLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class BudgetSerializer(serializers.ModelSerializer):
    lines = BudgetLineSerializer(many=True, read_only=True)
    utilization = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_utilization(self, obj):
        if obj.total_budget > 0:
            return round(float(obj.spent / obj.total_budget * 100), 2)
        return 0


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
