from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from core.permissions import IsSameCompany
from .models import Vendor, PurchaseOrder, PurchaseOrderLine, RFQ, VendorQuotation, SupplyChainEvent
from .serializers import (
    VendorSerializer, PurchaseOrderSerializer, PurchaseOrderLineSerializer,
    RFQSerializer, VendorQuotationSerializer, SupplyChainEventSerializer
)
import hashlib

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class VendorViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['is_approved', 'category', 'country']
    search_fields = ['name', 'code', 'contact_name']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        vendor = self.get_object()
        vendor.is_approved = True
        vendor.save()
        return Response({'status': 'Vendor approved'})

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        vendor = self.get_object()
        orders = vendor.purchase_orders.all()
        return Response({
            'total_orders': orders.count(),
            'total_value': float(orders.aggregate(total=Sum('total'))['total'] or 0),
            'avg_rating': vendor.rating,
        })

class PurchaseOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'vendor']
    search_fields = ['po_number']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        po = self.get_object()
        po.status = 'confirmed'
        po.approved_by = request.user
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        po = self.get_object()
        lines = po.lines.all()
        all_received = all(l.received_quantity >= l.quantity for l in lines)
        po.status = 'received' if all_received else 'partial'
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        po = self.get_object()
        serializer = PurchaseOrderLineSerializer(data={**request.data, 'purchase_order': po.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        lines = po.lines.all()
        po.subtotal = sum(l.quantity * l.unit_price for l in lines)
        po.total = sum(l.total for l in lines)
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

class RFQViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def award(self, request, pk=None):
        rfq = self.get_object()
        vendor_id = request.data.get('vendor_id')
        rfq.awarded_vendor_id = vendor_id
        rfq.status = 'awarded'
        rfq.save()
        VendorQuotation.objects.filter(rfq=rfq, vendor_id=vendor_id).update(is_selected=True)
        return Response(RFQSerializer(rfq).data)

class VendorQuotationViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = VendorQuotation.objects.all()
    serializer_class = VendorQuotationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['rfq', 'vendor']

class SupplyChainEventViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = SupplyChainEvent.objects.all()
    serializer_class = SupplyChainEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        last_event = SupplyChainEvent.objects.filter(company=self.request.user.company).order_by('-timestamp').first()
        prev_hash = last_event.event_hash if last_event else '0' * 64
        event = serializer.save(
            company=self.request.user.company, created_by=self.request.user,
            updated_by=self.request.user, previous_hash=prev_hash
        )
        data = f"{event.id}{event.event_type}{event.timestamp}{prev_hash}"
        event.event_hash = hashlib.sha256(data.encode()).hexdigest()
        event.save()

    @action(detail=False, methods=['get'])
    def verify_chain(self, request):
        events = self.get_queryset().order_by('timestamp')
        is_valid = True
        prev_hash = '0' * 64
        for event in events:
            if event.previous_hash != prev_hash:
                is_valid = False
                break
            prev_hash = event.event_hash
        return Response({'chain_valid': is_valid, 'total_events': events.count()})
