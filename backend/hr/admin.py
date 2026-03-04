from django.contrib import admin
from .models import (
    Department, JobPosition, Employee, PayrollPeriod, Payslip,
    LeaveType, LeaveRequest, Attendance, PerformanceReview,
    Recruitment, Applicant
)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'company']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'first_name', 'last_name', 'department', 'status', 'hire_date']
    list_filter = ['status', 'department', 'employment_type']
    search_fields = ['first_name', 'last_name', 'employee_id']

@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'status', 'total_net']

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ['employee', 'period', 'gross_salary', 'net_salary', 'status']

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'days', 'status']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'check_in', 'check_out', 'hours_worked', 'status']

@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ['employee', 'reviewer', 'rating', 'status']

@admin.register(Recruitment)
class RecruitmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'position', 'status', 'applicant_count']

admin.site.register(JobPosition)
admin.site.register(LeaveType)
admin.site.register(Applicant)
