import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Vendor(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)
    contact_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    payment_terms = models.IntegerField(default=30, help_text='Payment terms in days')
    rating = models.IntegerField(default=3, choices=[(i, str(i)) for i in range(1, 6)])
    category = models.CharField(max_length=100, blank=True)
    is_approved = models.BooleanField(default=False)
    bank_details = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['company', 'is_approved'])]

    def __str__(self):
        return self.name


class PurchaseOrder(BaseModel):
    STATUS_CHOICES = [
        ('draft', _('Draft')), ('sent', _('Sent')),
        ('confirmed', _('Confirmed')), ('received', _('Received')),
        ('partial', _('Partially Received')), ('cancelled', _('Cancelled')),
    ]
    po_number = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    order_date = models.DateField()
    expected_date = models.DateField(null=True, blank=True)
    received_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    shipping_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    approved_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return f"PO-{self.po_number}"


class PurchaseOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines')
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price * (1 + self.tax_rate / 100)
        super().save(*args, **kwargs)


class RFQ(BaseModel):
    rfq_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    vendors = models.ManyToManyField(Vendor, related_name='rfqs')
    deadline = models.DateField()
    status = models.CharField(max_length=20, default='open', choices=[
        ('draft', _('Draft')), ('open', _('Open')),
        ('closed', _('Closed')), ('awarded', _('Awarded')),
    ])
    items = models.JSONField(default=list)
    awarded_vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='awarded_rfqs')

    def __str__(self):
        return f"RFQ-{self.rfq_number}: {self.title}"


class VendorQuotation(BaseModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='quotations')
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    delivery_days = models.IntegerField(default=0)
    valid_until = models.DateField()
    terms = models.TextField(blank=True)
    items = models.JSONField(default=list)
    is_selected = models.BooleanField(default=False)

    class Meta:
        unique_together = ['rfq', 'vendor']


class SupplyChainEvent(BaseModel):
    event_type = models.CharField(max_length=50, choices=[
        ('order_placed', _('Order Placed')), ('shipped', _('Shipped')),
        ('in_transit', _('In Transit')), ('delivered', _('Delivered')),
        ('quality_check', _('Quality Check')), ('stored', _('Stored')),
    ])
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, null=True, related_name='events')
    description = models.TextField()
    location = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField()
    previous_hash = models.CharField(max_length=64, blank=True)
    event_hash = models.CharField(max_length=64, blank=True)
    verified = models.BooleanField(default=False)
    verification_data = models.JSONField(default=dict)

    class Meta:
        ordering = ['timestamp']
