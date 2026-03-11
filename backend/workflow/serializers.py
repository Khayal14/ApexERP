from rest_framework import serializers
from .models import (
    Lead, SupplierPI, SupplierPILine,
    ClientQuotation, ClientQuotationLine,
    ClientPO, ClientPOLine,
    CommercialInvoice, Delivery,
)


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class SupplierPILineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPILine
        fields = '__all__'


class SupplierPISerializer(serializers.ModelSerializer):
    lines = SupplierPILineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = SupplierPI
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ClientQuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientQuotationLine
        fields = '__all__'


class ClientQuotationSerializer(serializers.ModelSerializer):
    lines = ClientQuotationLineSerializer(many=True, read_only=True)

    class Meta:
        model = ClientQuotation
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ClientPOLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPOLine
        fields = '__all__'


class ClientPOSerializer(serializers.ModelSerializer):
    lines = ClientPOLineSerializer(many=True, read_only=True)

    class Meta:
        model = ClientPO
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class CommercialInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommercialInvoice
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
