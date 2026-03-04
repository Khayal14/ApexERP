from rest_framework import serializers
from .models import Vendor, PurchaseOrder, PurchaseOrderLine, RFQ, VendorQuotation, SupplyChainEvent

class VendorSerializer(serializers.ModelSerializer):
    order_count = serializers.SerializerMethodField()
    class Meta:
        model = Vendor
        fields = '__all__'
    def get_order_count(self, obj):
        return obj.purchase_orders.count()

class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = '__all__'

class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    class Meta:
        model = PurchaseOrder
        fields = '__all__'

class RFQSerializer(serializers.ModelSerializer):
    quotation_count = serializers.SerializerMethodField()
    class Meta:
        model = RFQ
        fields = '__all__'
    def get_quotation_count(self, obj):
        return obj.quotations.count()

class VendorQuotationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    class Meta:
        model = VendorQuotation
        fields = '__all__'

class SupplyChainEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplyChainEvent
        fields = '__all__'
