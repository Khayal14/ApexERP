import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Warehouse(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    manager = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    capacity = models.IntegerField(default=0, help_text='Total capacity in units')
    is_primary = models.BooleanField(default=False)

    class Meta:
        unique_together = ['company', 'code']

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProductCategory(BaseModel):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = _('product categories')

    def __str__(self):
        return self.name


class Product(BaseModel):
    PRODUCT_TYPES = [
        ('physical', _('Physical')), ('digital', _('Digital')), ('service', _('Service')),
    ]
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50)
    barcode = models.CharField(max_length=50, blank=True)
    qr_code = models.CharField(max_length=255, blank=True)
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='physical')
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    unit_of_measure = models.CharField(max_length=20, default='unit')
    cost_price = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    min_stock_level = models.IntegerField(default=0)
    max_stock_level = models.IntegerField(default=0)
    reorder_point = models.IntegerField(default=0)
    reorder_quantity = models.IntegerField(default=0)
    weight = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    dimensions = models.JSONField(default=dict, blank=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    tags = models.JSONField(default=list)
    is_sellable = models.BooleanField(default=True)
    is_purchasable = models.BooleanField(default=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ['company', 'sku']
        indexes = [
            models.Index(fields=['company', 'sku']),
            models.Index(fields=['barcode']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"


class StockLevel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_levels')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_levels')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    reserved_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    available_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    last_counted = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'warehouse']

    def save(self, *args, **kwargs):
        self.available_quantity = self.quantity - self.reserved_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} @ {self.warehouse.name}: {self.quantity}"


class StockMovement(BaseModel):
    MOVEMENT_TYPES = [
        ('in', _('Stock In')), ('out', _('Stock Out')),
        ('transfer', _('Transfer')), ('adjustment', _('Adjustment')),
        ('return', _('Return')),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    source_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='outgoing_movements')
    destination_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    reference = models.CharField(max_length=255, blank=True)
    reason = models.TextField(blank=True)
    date = models.DateTimeField()
    cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        ordering = ['-date']
        indexes = [models.Index(fields=['product', '-date'])]


class InventoryCount(BaseModel):
    name = models.CharField(max_length=255)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='counts')
    date = models.DateField()
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('in_progress', _('In Progress')),
        ('completed', _('Completed')), ('approved', _('Approved')),
    ])
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name


class InventoryCountLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    count = models.ForeignKey(InventoryCount, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    system_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    counted_quantity = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    variance = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    def save(self, *args, **kwargs):
        if self.counted_quantity is not None:
            self.variance = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)


class DemandForecast(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='forecasts')
    period_start = models.DateField()
    period_end = models.DateField()
    forecasted_demand = models.DecimalField(max_digits=12, decimal_places=3)
    actual_demand = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    confidence = models.FloatField(default=0.8)
    model_version = models.CharField(max_length=50, blank=True)
    factors = models.JSONField(default=dict)

    class Meta:
        ordering = ['-period_start']
