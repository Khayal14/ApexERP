from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import Dashboard, Widget, Report, KPI, DataExport
from .serializers import (
    DashboardSerializer, WidgetSerializer, ReportSerializer, KPISerializer, DataExportSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class DashboardViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def executive(self, request):
        company = request.user.company
        from finance.models import Invoice
        from sales.models import SalesOrder
        from hr.models import Employee
        from crm.models import Deal
        today = timezone.now().date()
        month_start = today.replace(day=1)
        return Response({
            'revenue_this_month': float(Invoice.objects.filter(
                company=company, status='paid', issue_date__gte=month_start
            ).aggregate(total=Sum('total'))['total'] or 0),
            'active_employees': Employee.objects.filter(company=company, status='active').count(),
            'open_deals': Deal.objects.filter(company=company, status='open').count(),
            'pipeline_value': float(Deal.objects.filter(
                company=company, status='open'
            ).aggregate(total=Sum('value'))['total'] or 0),
            'orders_this_month': SalesOrder.objects.filter(
                company=company, order_date__gte=month_start
            ).count(),
        })

class WidgetViewSet(viewsets.ModelViewSet):
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['dashboard']

class ReportViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['report_type']

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        report = self.get_object()
        report.last_generated = timezone.now()
        report.save()
        return Response({'status': 'Report generation started'})

class KPIViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['module']

    @action(detail=False, methods=['post'])
    def refresh_all(self, request):
        kpis = self.get_queryset()
        for kpi in kpis:
            kpi.last_calculated = timezone.now()
            kpi.save()
        return Response({'status': f'Refreshed {kpis.count()} KPIs'})

class DataExportViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = DataExport.objects.all()
    serializer_class = DataExportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        export = serializer.save(
            company=self.request.user.company, created_by=self.request.user,
            updated_by=self.request.user, requested_by=self.request.user
        )
        from .tasks import process_data_export
        process_data_export.delay(str(export.id))
