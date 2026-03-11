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


class BranchAwareMixin:
    """
    Mixin that:

    1. Filters the queryset to the **active branch** (single company) or to
       ALL accessible companies when the frontend sends `X-Branch-ID: all`.

    2. Auto-populates `company`, `created_by`, `updated_by` on create, using
       the active branch's Company (from `request.company`) rather than the
       user's primary company.  This means a document created while viewing
       branch B is correctly assigned to branch B.

    Apply to any ModelViewSet that inherits from BaseModel.
    """

    def _get_branch_companies(self):
        """
        Return a queryset of Company IDs the current request is scoped to.
        In 'all' mode that is every company the user can access.
        In 'single' mode it is just request.company.
        """
        request = self.request
        if getattr(request, 'branch_mode', 'single') == 'all':
            ids = list(request.user.companies.values_list('id', flat=True))
            if request.user.company_id:
                ids.append(request.user.company_id)
            return ids
        company = getattr(request, 'company', None) or request.user.company
        return [company.id] if company else []

    def get_queryset(self):
        qs = super().get_queryset()
        ids = self._get_branch_companies()
        if ids:
            return qs.filter(company_id__in=ids)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        company = getattr(self.request, 'company', None) or user.company
        serializer.save(company=company, created_by=user, updated_by=user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class LeadViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'source']
    search_fields = ['client_name', 'client_company', 'client_email']
    ordering_fields = ['created_at', 'estimated_value']


class SupplierPIViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = SupplierPI.objects.select_related('supplier').prefetch_related('lines').all()
    serializer_class = SupplierPISerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'currency']
    search_fields = ['pi_number', 'supplier__name']
    ordering_fields = ['issue_date', 'total']


class ClientQuotationViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = ClientQuotation.objects.prefetch_related('lines').all()
    serializer_class = ClientQuotationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'currency']
    search_fields = ['quotation_number', 'client_name', 'client_company']
    ordering_fields = ['issue_date', 'total']


class ClientPOViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = ClientPO.objects.prefetch_related('lines').all()
    serializer_class = ClientPOSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'fulfillment_source']
    search_fields = ['po_number', 'client_name', 'client_company']
    ordering_fields = ['order_date', 'total']


class CommercialInvoiceViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = CommercialInvoice.objects.all()
    serializer_class = CommercialInvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status', 'currency']
    search_fields = ['invoice_number', 'client_name', 'client_company']
    ordering_fields = ['issue_date', 'total', 'due_date']


class DeliveryViewSet(BranchAwareMixin, viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_line', 'status']
    search_fields = ['delivery_number', 'client_name']
    ordering_fields = ['created_at', 'scheduled_date']
