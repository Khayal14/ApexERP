from rest_framework import serializers
from .models import (
    Lead, SupplierPI, SupplierPILine,
    ClientQuotation, ClientQuotationLine,
    ClientPO, ClientPOLine,
    CommercialInvoice, Delivery,
)

# Fields auto-populated by BranchAwareMixin.perform_create / perform_update.
# They must be read-only so the frontend never needs to supply them and an
# attacker cannot spoof them.
_AUTO_FIELDS = ('id', 'company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = _AUTO_FIELDS


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
        read_only_fields = _AUTO_FIELDS


class ClientQuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientQuotationLine
        fields = '__all__'


class ClientQuotationSerializer(serializers.ModelSerializer):
    lines = ClientQuotationLineSerializer(many=True, read_only=True)

    class Meta:
        model = ClientQuotation
        fields = '__all__'
        read_only_fields = _AUTO_FIELDS


class ClientPOLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPOLine
        fields = '__all__'


class ClientPOSerializer(serializers.ModelSerializer):
    lines = ClientPOLineSerializer(many=True, read_only=True)

    class Meta:
        model = ClientPO
        fields = '__all__'
        read_only_fields = _AUTO_FIELDS


class CommercialInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommercialInvoice
        fields = '__all__'
        read_only_fields = _AUTO_FIELDS


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = _AUTO_FIELDS
