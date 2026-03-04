from rest_framework import serializers
from .models import Quotation, QuotationLine, SalesOrder, SalesOrderLine, ReturnOrder, PricingRule

class QuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationLine
        fields = '__all__'

class QuotationSerializer(serializers.ModelSerializer):
    lines = QuotationLineSerializer(many=True, read_only=True)
    class Meta:
        model = Quotation
        fields = '__all__'

class SalesOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default='')
    class Meta:
        model = SalesOrderLine
        fields = '__all__'

class SalesOrderSerializer(serializers.ModelSerializer):
    lines = SalesOrderLineSerializer(many=True, read_only=True)
    class Meta:
        model = SalesOrder
        fields = '__all__'

class ReturnOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnOrder
        fields = '__all__'

class PricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingRule
        fields = '__all__'
