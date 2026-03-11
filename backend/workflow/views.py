from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Lead, SupplierPI, ClientQuotation, ClientPO,
    CommercialInvoice, Delivery,
)
from .serializers import (
    LeadSerializer, SupplierPISerializer, ClientQuotationSerializer,
    ClientPOSerializer, CommercialInvoiceSerializer, DeliverySerializer,
)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'source']
    search_fields = ['client_name', 'client_company', 'client_email']
    ordering_fields = ['created_at', 'estimated_value']


class SupplierPIViewSet(viewsets.ModelViewSet):
    queryset = SupplierPI.objects.select_related('supplier').prefetch_related('lines').all()
    serializer_class = SupplierPISerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'currency']
    search_fields = ['pi_number', 'supplier__name']
    ordering_fields = ['issue_date', 'total']


class ClientQuotationViewSet(viewsets.ModelViewSet):
    queryset = ClientQuotation.objects.prefetch_related('lines').all()
    serializer_class = ClientQuotationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'currency']
    search_fields = ['quotation_number', 'client_name', 'client_company']
    ordering_fields = ['issue_date', 'total']


class ClientPOViewSet(viewsets.ModelViewSet):
    queryset = ClientPO.objects.prefetch_related('lines').all()
    serializer_class = ClientPOSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'fulfillment_source']
    search_fields = ['po_number', 'client_name', 'client_company']
    ordering_fields = ['order_date', 'total']


class CommercialInvoiceViewSet(viewsets.ModelViewSet):
    queryset = CommercialInvoice.objects.all()
    serializer_class = CommercialInvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'currency']
    search_fields = ['invoice_number', 'client_name', 'client_company']
    ordering_fields = ['issue_date', 'total', 'due_date']


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status']
    search_fields = ['delivery_number', 'client_name']
    ordering_fields = ['created_at', 'scheduled_date']
