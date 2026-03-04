from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import (
    Department, JobPosition, Employee, PayrollPeriod, Payslip,
    LeaveType, LeaveRequest, Attendance, PerformanceReview,
    Recruitment, Applicant
)
from .serializers import (
    DepartmentSerializer, JobPositionSerializer, EmployeeSerializer,
    PayrollPeriodSerializer, PayslipSerializer,
    LeaveTypeSerializer, LeaveRequestSerializer, AttendanceSerializer,
    PerformanceReviewSerializer, RecruitmentSerializer, ApplicantSerializer
)


class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)


class DepartmentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    search_fields = ['name', 'code']

    @action(detail=True, methods=['get'])
    def org_chart(self, request, pk=None):
        dept = self.get_object()
        employees = dept.employees.filter(status='active').values('id', 'first_name', 'last_name', 'position__title', 'manager_id')
        return Response(list(employees))


class JobPositionViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = JobPosition.objects.all()
    serializer_class = JobPositionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department']


class EmployeeViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'department', 'employment_type']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total_employees': qs.filter(status='active').count(),
            'by_department': list(qs.filter(status='active').values('department__name').annotate(count=Count('id'))),
            'by_type': list(qs.filter(status='active').values('employment_type').annotate(count=Count('id'))),
            'recent_hires': EmployeeSerializer(qs.filter(status='active').order_by('-hire_date')[:5], many=True).data,
            'avg_tenure_days': (timezone.now().date() - qs.filter(status='active').order_by('hire_date').first().hire_date).days if qs.filter(status='active').exists() else 0,
        })

    @action(detail=True, methods=['get'])
    def payslips(self, request, pk=None):
        employee = self.get_object()
        payslips = employee.payslips.all()[:12]
        return Response(PayslipSerializer(payslips, many=True).data)


class PayrollPeriodViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def generate_payslips(self, request, pk=None):
        period = self.get_object()
        employees = Employee.objects.filter(company=request.user.company, status='active')
        created = 0
        for emp in employees:
            _, was_created = Payslip.objects.get_or_create(
                employee=emp, period=period, company=request.user.company,
                defaults={
                    'basic_salary': emp.salary,
                    'created_by': request.user, 'updated_by': request.user,
                }
            )
            if was_created:
                created += 1
        return Response({'created': created, 'total_employees': employees.count()})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        period = self.get_object()
        period.payslips.filter(status='draft').update(status='approved')
        agg = period.payslips.aggregate(
            gross=Sum('gross_salary'), deductions=Sum('total_deductions'), net=Sum('net_salary')
        )
        period.total_gross = agg['gross'] or 0
        period.total_deductions = agg['deductions'] or 0
        period.total_net = agg['net'] or 0
        period.status = 'approved'
        period.save()
        return Response(PayrollPeriodSerializer(period).data)


class PayslipViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Payslip.objects.all()
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'period', 'employee']

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        payslip = self.get_object()
        payslip.calculate()
        payslip.save()
        return Response(PayslipSerializer(payslip).data)


class LeaveTypeViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class LeaveRequestViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'employee', 'leave_type']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'approved'
        leave.approved_by = request.user
        leave.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'rejected'
        leave.save()
        return Response({'status': 'rejected'})

    @action(detail=False, methods=['get'])
    def balance(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id required'}, status=400)
        approved = LeaveRequest.objects.filter(
            employee_id=employee_id, status='approved',
            start_date__year=timezone.now().year
        ).values('leave_type__name', 'leave_type__days_per_year').annotate(used=Sum('days'))
        return Response(list(approved))


class AttendanceViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['employee', 'date', 'status']

    @action(detail=False, methods=['post'])
    def clock_in(self, request):
        employee_id = request.data.get('employee_id')
        today = timezone.now().date()
        attendance, created = Attendance.objects.get_or_create(
            employee_id=employee_id, date=today, company=request.user.company,
            defaults={'check_in': timezone.now(), 'created_by': request.user, 'updated_by': request.user}
        )
        if not created and not attendance.check_in:
            attendance.check_in = timezone.now()
            attendance.save()
        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=['post'])
    def clock_out(self, request):
        employee_id = request.data.get('employee_id')
        today = timezone.now().date()
        try:
            attendance = Attendance.objects.get(employee_id=employee_id, date=today)
            attendance.check_out = timezone.now()
            if attendance.check_in:
                diff = attendance.check_out - attendance.check_in
                attendance.hours_worked = round(diff.total_seconds() / 3600, 2)
                if attendance.hours_worked > 8:
                    attendance.overtime_hours = attendance.hours_worked - 8
            attendance.save()
            return Response(AttendanceSerializer(attendance).data)
        except Attendance.DoesNotExist:
            return Response({'error': 'No check-in found for today'}, status=400)


class PerformanceReviewViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = PerformanceReview.objects.all()
    serializer_class = PerformanceReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['employee', 'status', 'rating']


class RecruitmentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Recruitment.objects.all()
    serializer_class = RecruitmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'position']
    search_fields = ['title', 'description']

    @action(detail=True, methods=['get'])
    def pipeline(self, request, pk=None):
        recruitment = self.get_object()
        stages = recruitment.applicants.values('stage').annotate(count=Count('id'))
        return Response(list(stages))


class ApplicantViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['recruitment', 'stage']
    search_fields = ['first_name', 'last_name', 'email']

    @action(detail=True, methods=['post'])
    def advance(self, request, pk=None):
        applicant = self.get_object()
        stages = ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired']
        current_idx = stages.index(applicant.stage)
        if current_idx < len(stages) - 1:
            applicant.stage = stages[current_idx + 1]
            applicant.save()
        return Response(ApplicantSerializer(applicant).data)
