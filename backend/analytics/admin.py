from django.contrib import admin
from .models import Dashboard, Widget, Report, KPI, DataExport

@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'is_default', 'is_shared']

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'current_value', 'target_value', 'trend']

admin.site.register(Widget)
admin.site.register(Report)
admin.site.register(DataExport)
