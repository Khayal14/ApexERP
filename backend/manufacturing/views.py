from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import BillOfMaterials, WorkCenter, ProductionOrder, WorkOrder, QualityCheck, MaintenanceRecord
from .serializers import (
    BillOfMaterialsSerializer, BOMLineSerializer, WorkCenterSerializer,
    ProductionOrderSerializer, WorkOrderSerializer, QualityCheckSerializer, MaintenanceRecordSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class BillOfMaterialsViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = BillOfMaterials.objects.all()
    serializer_class = BillOfMaterialsSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['product']

    @action(detail=True, methods=['post'])
    def calculate_cost(self, request, pk=None):
        bom = self.get_object()
        return Response({'total_cost': float(bom.calculate_cost())})

class WorkCenterViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = WorkCenter.objects.all()
    serializer_class = WorkCenterSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def utilization(self, request):
        centers = self.get_queryset()
        return Response([{
            'name': wc.name, 'capacity': wc.capacity,
            'active_orders': wc.work_orders.filter(status='in_progress').count(),
            'utilization': round(wc.work_orders.filter(status='in_progress').count() / max(wc.capacity, 1) * 100, 2),
        } for wc in centers])

class ProductionOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'priority', 'product']

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        order = self.get_object()
        order.status = 'in_progress'
        order.actual_start = timezone.now()
        order.save()
        return Response(ProductionOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        order = self.get_object()
        order.status = 'completed'
        order.actual_end = timezone.now()
        order.completed_quantity = request.data.get('quantity', order.quantity)
        order.save()
        return Response(ProductionOrderSerializer(order).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total_orders': qs.count(),
            'in_progress': qs.filter(status='in_progress').count(),
            'completed_today': qs.filter(status='completed', actual_end__date=timezone.now().date()).count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'by_priority': list(qs.filter(status__in=['draft', 'confirmed', 'in_progress']).values('priority').annotate(count=Count('id'))),
        })

class WorkOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all()
    serializer_class = WorkOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'production_order', 'work_center']

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        wo = self.get_object()
        wo.status = 'in_progress'
        wo.started_at = timezone.now()
        wo.save()
        return Response(WorkOrderSerializer(wo).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        wo = self.get_object()
        wo.status = 'completed'
        wo.completed_at = timezone.now()
        if wo.started_at:
            wo.duration_actual = round((wo.completed_at - wo.started_at).total_seconds() / 3600, 2)
        wo.save()
        return Response(WorkOrderSerializer(wo).data)

class QualityCheckViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = QualityCheck.objects.all()
    serializer_class = QualityCheckSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['production_order', 'result', 'check_type']

    @action(detail=True, methods=['post'])
    def record_result(self, request, pk=None):
        check = self.get_object()
        check.result = request.data.get('result', 'pending')
        check.measured_value = request.data.get('measured_value', '')
        check.inspector = request.user
        check.inspected_at = timezone.now()
        check.save()
        return Response(QualityCheckSerializer(check).data)

class MaintenanceRecordViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['work_center', 'status', 'maintenance_type']

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming = self.get_queryset().filter(
            status='scheduled', scheduled_date__lte=timezone.now().date() + timezone.timedelta(days=30)
        )
        return Response(MaintenanceRecordSerializer(upcoming, many=True).data)
