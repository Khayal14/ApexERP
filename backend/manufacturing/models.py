import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class BillOfMaterials(BaseModel):
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='boms')
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=20, default='1.0')
    is_default = models.BooleanField(default=True)
    total_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _('Bill of Materials')
        verbose_name_plural = _('Bills of Materials')

    def __str__(self):
        return f"BOM: {self.product.name} v{self.version}"

    def calculate_cost(self):
        total = sum(line.total_cost for line in self.lines.all())
        self.total_cost = total
        self.save()
        return total


class BOMLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bom = models.ForeignKey(BillOfMaterials, on_delete=models.CASCADE, related_name='lines')
    component = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='bom_usages')
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    scrap_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity * self.unit_cost * (1 + self.scrap_rate / 100)
        super().save(*args, **kwargs)


class WorkCenter(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    capacity = models.IntegerField(default=1)
    cost_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    efficiency = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    is_available = models.BooleanField(default=True)
    iot_device_id = models.CharField(max_length=100, blank=True, help_text='IoT device ID for monitoring')
    maintenance_schedule = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProductionOrder(BaseModel):
    STATUS_CHOICES = [
        ('draft', _('Draft')), ('confirmed', _('Confirmed')),
        ('in_progress', _('In Progress')), ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    ]
    PRIORITY_CHOICES = [
        ('low', _('Low')), ('normal', _('Normal')),
        ('high', _('High')), ('urgent', _('Urgent')),
    ]
    order_number = models.CharField(max_length=50, unique=True)
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='production_orders')
    bom = models.ForeignKey(BillOfMaterials, on_delete=models.SET_NULL, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    completed_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    planned_start = models.DateTimeField(null=True, blank=True)
    planned_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.SET_NULL, null=True)
    estimated_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"MO-{self.order_number}"


class WorkOrder(BaseModel):
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='work_orders')
    work_center = models.ForeignKey(WorkCenter, on_delete=models.CASCADE, related_name='work_orders')
    name = models.CharField(max_length=255)
    sequence = models.IntegerField(default=0)
    duration_expected = models.DecimalField(max_digits=8, decimal_places=2, help_text='Expected hours')
    duration_actual = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('in_progress', _('In Progress')),
        ('completed', _('Completed')), ('cancelled', _('Cancelled')),
    ])
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['sequence']


class QualityCheck(BaseModel):
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='quality_checks')
    name = models.CharField(max_length=255)
    check_type = models.CharField(max_length=50, choices=[
        ('visual', _('Visual Inspection')), ('measurement', _('Measurement')),
        ('functional', _('Functional Test')), ('sample', _('Sample Test')),
    ])
    specification = models.TextField(blank=True)
    result = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('pass', _('Pass')),
        ('fail', _('Fail')), ('conditional', _('Conditional Pass')),
    ])
    measured_value = models.CharField(max_length=100, blank=True)
    inspector = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    inspected_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    images = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']


class MaintenanceRecord(BaseModel):
    work_center = models.ForeignKey(WorkCenter, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=50, choices=[
        ('preventive', _('Preventive')), ('corrective', _('Corrective')),
        ('predictive', _('Predictive')),
    ])
    description = models.TextField()
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    downtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='scheduled', choices=[
        ('scheduled', _('Scheduled')), ('in_progress', _('In Progress')),
        ('completed', _('Completed')),
    ])
