import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Dashboard(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    layout = models.JSONField(default=list, help_text='Widget layout configuration')
    is_default = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)
    owner = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='dashboards')

    def __str__(self):
        return self.name


class Widget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    widget_type = models.CharField(max_length=50, choices=[
        ('kpi', _('KPI Card')), ('chart_line', _('Line Chart')),
        ('chart_bar', _('Bar Chart')), ('chart_pie', _('Pie Chart')),
        ('table', _('Data Table')), ('metric', _('Single Metric')),
        ('gauge', _('Gauge')), ('map', _('Map')),
    ])
    title = models.CharField(max_length=255)
    data_source = models.CharField(max_length=100, help_text='Module.model or custom query')
    query_config = models.JSONField(default=dict)
    position = models.JSONField(default=dict)
    size = models.JSONField(default=dict)
    refresh_interval = models.IntegerField(default=300, help_text='Seconds')
    settings = models.JSONField(default=dict)


class Report(BaseModel):
    REPORT_TYPES = [
        ('financial', _('Financial')), ('sales', _('Sales')),
        ('hr', _('HR')), ('inventory', _('Inventory')),
        ('custom', _('Custom')),
    ]
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    description = models.TextField(blank=True)
    query_config = models.JSONField(default=dict)
    filters = models.JSONField(default=dict)
    columns = models.JSONField(default=list)
    schedule = models.JSONField(default=dict, blank=True)
    last_generated = models.DateTimeField(null=True, blank=True)
    output_format = models.CharField(max_length=10, default='pdf', choices=[
        ('pdf', 'PDF'), ('excel', 'Excel'), ('csv', 'CSV'),
    ])

    def __str__(self):
        return self.name


class KPI(BaseModel):
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=50)
    metric = models.CharField(max_length=100)
    current_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    target_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    previous_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default='number')
    trend = models.CharField(max_length=10, default='stable', choices=[
        ('up', _('Up')), ('down', _('Down')), ('stable', _('Stable')),
    ])
    last_calculated = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'KPI'
        verbose_name_plural = 'KPIs'

    def __str__(self):
        return self.name

    @property
    def achievement(self):
        if self.target_value and self.target_value > 0:
            return round(float(self.current_value / self.target_value * 100), 2)
        return 0


class DataExport(BaseModel):
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=50)
    export_format = models.CharField(max_length=10, choices=[
        ('csv', 'CSV'), ('excel', 'Excel'), ('json', 'JSON'),
    ])
    filters = models.JSONField(default=dict)
    file_path = models.FileField(upload_to='exports/', blank=True)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('processing', _('Processing')),
        ('completed', _('Completed')), ('failed', _('Failed')),
    ])
    row_count = models.IntegerField(default=0)
    requested_by = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='exports')

    def __str__(self):
        return self.name
