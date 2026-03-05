from rest_framework import serializers
from .models import Quotation, QuotationLine, SalesOrder, SalesOrderLine, ReturnOrder, PricingRule

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class QuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class QuotationSerializer(serializers.ModelSerializer):
    lines = QuotationLineSerializer(many=True, read_only=True)
    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class SalesOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default='')
    class Meta:
        model = SalesOrderLine
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class SalesOrderSerializer(serializers.ModelSerializer):
    lines = SalesOrderLineSerializer(many=True, read_only=True)
    class Meta:
        model = SalesOrder
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class ReturnOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnOrder
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class PricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingRule
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
