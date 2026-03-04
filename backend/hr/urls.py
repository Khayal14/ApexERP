from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'departments', views.DepartmentViewSet, basename='department')
router.register(r'positions', views.JobPositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'payroll-periods', views.PayrollPeriodViewSet, basename='payroll-period')
router.register(r'payslips', views.PayslipViewSet, basename='payslip')
router.register(r'leave-types', views.LeaveTypeViewSet, basename='leave-type')
router.register(r'leave-requests', views.LeaveRequestViewSet, basename='leave-request')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'reviews', views.PerformanceReviewViewSet, basename='review')
router.register(r'recruitments', views.RecruitmentViewSet, basename='recruitment')
router.register(r'applicants', views.ApplicantViewSet, basename='applicant')

urlpatterns = [path('', include(router.urls))]
