from rest_framework import serializers
from .models import (
    Department, JobPosition, Employee, PayrollPeriod, Payslip,
    LeaveType, LeaveRequest, Attendance, PerformanceReview,
    Recruitment, Applicant
)

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class JobPositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    vacancy = serializers.SerializerMethodField()

    class Meta:
        model = JobPosition
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_vacancy(self, obj):
        return obj.headcount - obj.filled


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    position_title = serializers.CharField(source='position.title', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
        extra_kwargs = {'salary': {'write_only': False}}


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Payslip
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class PayrollPeriodSerializer(serializers.ModelSerializer):
    payslip_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPeriod
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

    def get_payslip_count(self, obj):
        return obj.payslips.count()


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.full_name', read_only=True)

    class Meta:
        model = PerformanceReview
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class RecruitmentSerializer(serializers.ModelSerializer):
    position_title = serializers.CharField(source='position.title', read_only=True)

    class Meta:
        model = Recruitment
        fields = '__all__'
        read_only_fields = AUTO_FIELDS


class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
