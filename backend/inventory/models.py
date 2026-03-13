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
    PRODUCT_ROLES = [
        ('raw_material',  _('Raw Material')),
        ('semi_finished', _('Semi-Finished')),
        ('finished_good', _('Finished Good')),
    ]
    BUSINESS_FIELDS = [
        ('led_lights',          _('LED Lights')),
        ('heater_thermocouple', _('Heater & Thermocouple')),
        ('solar_ac',            _('Solar AC')),
        ('trade',               _('Trade')),
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
    product_role = models.CharField(max_length=20, choices=PRODUCT_ROLES, default='finished_good')
    business_field = models.CharField(max_length=30, choices=BUSINESS_FIELDS, blank=True)
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
    incoming_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
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


class ProductBOM(BaseModel):
    """Bill of Materials for a finished or semi-finished product.
    Named ProductBOM (not BillOfMaterials) to avoid reverse-accessor clash
    with manufacturing.BillOfMaterials which inherits the same BaseModel."""
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='bom',
        limit_choices_to={'product_role__in': ['semi_finished', 'finished_good']},
    )
    version = models.CharField(max_length=20, default='1.0')
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _('product BOM')
        verbose_name_plural = _('product BOMs')

    def __str__(self):
        return f"BOM \u2013 {self.product.name} v{self.version}"


class BOMLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bom = models.ForeignKey(ProductBOM, on_delete=models.CASCADE, related_name='lines')
    component = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='used_in_boms')
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    unit_of_measure = models.CharField(max_length=20, default='unit')
    notes = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f"{self.component.name} \xd7 {self.quantity}"


class CompanyCostSetting(models.Model):
    """Default labour & overhead percentages per company (applied to selling price)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField('core.Company', on_delete=models.CASCADE, related_name='cost_setting')
    labour_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='% of selling price allocated to labour',
    )
    overhead_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='% of selling price allocated to overhead',
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Cost settings \u2013 {self.company.name}"


class ProductCost(models.Model):
    """Calculated cost breakdown per finished / semi-finished product."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='cost_breakdown')
    material_cost = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        help_text='Auto-calculated from BOM lines x unit costs',
    )
    labour_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    labour_cost = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        help_text='selling_price x labour_percentage / 100',
    )
    overhead_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overhead_cost = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
        help_text='selling_price x overhead_percentage / 100',
    )
    total_cost = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    gross_profit = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    profit_margin = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text='(gross_profit / selling_price) x 100',
    )
    currency = models.CharField(max_length=3, default='EGP')
    last_calculated = models.DateTimeField(null=True, blank=True)

    def recalculate(self):
        from django.utils import timezone
        p = self.product
        sp = p.selling_price or 0
        # Material cost from BOM
        mc = 0
        if hasattr(p, 'bom'):
            for line in p.bom.lines.select_related('component'):
                mc += line.quantity * (line.component.cost_price or 0)
        self.material_cost = mc
        self.labour_cost = sp * self.labour_percentage / 100
        self.overhead_cost = sp * self.overhead_percentage / 100
        self.total_cost = self.material_cost + self.labour_cost + self.overhead_cost
        self.gross_profit = sp - self.total_cost
        self.profit_margin = (self.gross_profit / sp * 100) if sp else 0
        self.last_calculated = timezone.now()
        self.save()

    def __str__(self):
        return f"Cost \u2013 {self.product.name}"


class GoodsReceipt(BaseModel):
    STATUS_CHOICES = [
        ('draft',     _('Draft')),
        ('confirmed', _('Confirmed')),
        ('cancelled', _('Cancelled')),
    ]
    receipt_number = models.CharField(max_length=50)
    purchase_order = models.ForeignKey(
        'supply_chain.PurchaseOrder',
        on_delete=models.CASCADE,
        related_name='receipts',
    )
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='receipts')
    received_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='goods_receipts',
    )

    class Meta:
        ordering = ['-received_date']

    def __str__(self):
        return f"GR-{self.receipt_number}"

    def confirm(self):
        """Confirm receipt: move incoming -> on-hand for each line."""
        if self.status != 'draft':
            return
        from django.utils import timezone as tz
        for line in self.lines.select_related('product'):
            sl, _ = StockLevel.objects.get_or_create(
                product=line.product, warehouse=self.warehouse
            )
            sl.quantity += line.received_quantity
            sl.incoming_quantity = max(0, sl.incoming_quantity - line.received_quantity)
            sl.save()
            StockMovement.objects.create(
                company=self.company,
                product=line.product,
                destination_warehouse=self.warehouse,
                movement_type='in',
                quantity=line.received_quantity,
                reference=f"GR-{self.receipt_number}",
                date=tz.now(),
                cost=line.unit_cost * line.received_quantity,
            )
        self.status = 'confirmed'
        self.save()


class GoodsReceiptLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    po_line = models.ForeignKey(
        'supply_chain.PurchaseOrderLine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    expected_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.product.name} \xd7 {self.received_quantity}"


class StockAlert(BaseModel):
    ALERT_TYPES = [
        ('low_stock',        _('Low Stock')),
        ('out_of_stock',     _('Out of Stock')),
        ('low_raw_material', _('Low Raw Material')),
        ('incoming_delayed', _('Incoming Delayed')),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='alerts')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True)
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    threshold_qty = models.DecimalField(max_digits=12, decimal_places=3)
    current_qty = models.DecimalField(max_digits=12, decimal_places=3)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts',
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'is_acknowledged'])]

    def __str__(self):
        return f"{self.get_alert_type_display()} \u2013 {self.product.name}"


class InterCompanyTransfer(BaseModel):
    STATUS_CHOICES = [
        ('draft',      _('Draft')),
        ('dispatched', _('Dispatched')),
        ('in_transit', _('In Transit')),
        ('received',   _('Received')),
        ('cancelled',  _('Cancelled')),
    ]
    transfer_number = models.CharField(max_length=50)
    from_company = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='outgoing_transfers',
    )
    from_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='outgoing_transfers',
    )
    to_company = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='incoming_transfers',
    )
    to_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='incoming_transfers',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    transfer_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-transfer_date']

    def __str__(self):
        return f"TRF-{self.transfer_number}"

    def dispatch(self):
        """Deduct stock from source warehouse."""
        if self.status != 'draft':
            return
        for line in self.lines.select_related('product'):
            sl = StockLevel.objects.filter(
                product=line.product, warehouse=self.from_warehouse
            ).first()
            if sl:
                sl.quantity = max(0, sl.quantity - line.quantity)
                sl.save()
        self.status = 'dispatched'
        self.save()

    def receive(self):
        """Add stock to destination warehouse."""
        if self.status not in ('dispatched', 'in_transit'):
            return
        for line in self.lines.select_related('product'):
            sl, _ = StockLevel.objects.get_or_create(
                product=line.product, warehouse=self.to_warehouse
            )
            sl.quantity += line.quantity
            sl.save()
        self.status = 'received'
        self.save()


class InterCompanyTransferLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transfer = models.ForeignKey(InterCompanyTransfer, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.product.name} \xd7 {self.quantity}"
