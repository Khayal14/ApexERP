import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Quotation(BaseModel):
    quote_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=True)
    contact = models.ForeignKey('crm.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('sent', _('Sent')), ('accepted', _('Accepted')),
        ('rejected', _('Rejected')), ('expired', _('Expired')),
    ])
    issue_date = models.DateField()
    expiry_date = models.DateField()
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    terms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.quote_number} - {self.customer_name}"


class QuotationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        subtotal = self.quantity * self.unit_price
        discount = subtotal * (self.discount_percent / 100)
        self.total = (subtotal - discount) * (1 + self.tax_rate / 100)
        super().save(*args, **kwargs)


class SalesOrder(BaseModel):
    order_number = models.CharField(max_length=50, unique=True)
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_orders')
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=True)
    contact = models.ForeignKey('crm.Contact', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('confirmed', _('Confirmed')),
        ('processing', _('Processing')), ('shipped', _('Shipped')),
        ('delivered', _('Delivered')), ('cancelled', _('Cancelled')),
    ])
    order_date = models.DateField()
    delivery_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    shipping_address = models.TextField(blank=True)
    billing_address = models.TextField(blank=True)
    payment_status = models.CharField(max_length=20, default='unpaid', choices=[
        ('unpaid', _('Unpaid')), ('partial', _('Partial')),
        ('paid', _('Paid')), ('refunded', _('Refunded')),
    ])
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-order_date']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['order_date']),
        ]

    def __str__(self):
        return f"SO-{self.order_number}"


class SalesOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    fulfilled_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    def save(self, *args, **kwargs):
        subtotal = self.quantity * self.unit_price
        discount = subtotal * (self.discount_percent / 100)
        self.total = (subtotal - discount) * (1 + self.tax_rate / 100)
        super().save(*args, **kwargs)


class ReturnOrder(BaseModel):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='returns')
    return_number = models.CharField(max_length=50, unique=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('approved', _('Approved')),
        ('received', _('Received')), ('refunded', _('Refunded')),
        ('rejected', _('Rejected')),
    ])
    refund_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    items = models.JSONField(default=list)

    def __str__(self):
        return f"RET-{self.return_number}"


class PricingRule(BaseModel):
    name = models.CharField(max_length=255)
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, null=True, blank=True, related_name='pricing_rules')
    category = models.ForeignKey('inventory.ProductCategory', on_delete=models.CASCADE, null=True, blank=True)
    rule_type = models.CharField(max_length=20, choices=[
        ('discount', _('Discount')), ('markup', _('Markup')),
        ('fixed', _('Fixed Price')), ('tiered', _('Tiered')),
    ])
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_quantity = models.IntegerField(default=1)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    priority = models.IntegerField(default=0)
    ai_optimized = models.BooleanField(default=False)

    class Meta:
        ordering = ['-priority']

    def __str__(self):
        return self.name
