import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


# ─── Business Line choices used across the entire ERP ───
BUSINESS_LINE_CHOICES = [
    ('led', _('LED Lights')),
    ('heater', _('Heater & Thermocouple')),
    ('solar', _('Solar AC')),
    ('trade', _('Trade')),
]


class Lead(BaseModel):
    """Step 1: A client contacts us or we identify a potential client."""
    LEAD_SOURCES = [
        ('direct', _('Direct Contact')),
        ('referral', _('Referral')),
        ('website', _('Website')),
        ('exhibition', _('Exhibition')),
        ('cold_call', _('Cold Call')),
        ('other', _('Other')),
    ]
    STATUS_CHOICES = [
        ('new', _('New')),
        ('contacted', _('Contacted')),
        ('qualified', _('Qualified')),
        ('converted', _('Converted to Quotation')),
        ('lost', _('Lost')),
    ]
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=50, blank=True)
    client_company = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=20, choices=LEAD_SOURCES, default='direct')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    product_interest = models.TextField(blank=True, help_text='What product(s) the client needs')
    estimated_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LEAD-{self.client_name} ({self.get_business_line_display()})"


class SupplierPI(BaseModel):
    """Proforma Invoice received from a supplier abroad — used as pricing basis."""
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    pi_number = models.CharField(max_length=100, help_text='Supplier PI reference number')
    supplier = models.ForeignKey('supply_chain.Vendor', on_delete=models.CASCADE, related_name='proforma_invoices')
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    insurance_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    customs_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    exchange_rate_to_iqd = models.DecimalField(max_digits=12, decimal_places=4, default=1, help_text='Rate to convert to IQD')
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to='supplier_pis/', blank=True, null=True)

    class Meta:
        ordering = ['-issue_date']
        verbose_name = 'Supplier Proforma Invoice'
        verbose_name_plural = 'Supplier Proforma Invoices'

    def __str__(self):
        return f"SPI-{self.pi_number} ({self.supplier.name})"


class SupplierPILine(models.Model):
    """Individual line items on a Supplier PI."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier_pi = models.ForeignKey(SupplierPI, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class ClientQuotation(BaseModel):
    """Step 2-3: Offer/quotation we create for the client, priced based on Supplier PI + margin."""
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('sent', _('Sent to Client')),
        ('accepted', _('Accepted')),
        ('rejected', _('Rejected')),
        ('expired', _('Expired')),
    ]
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    quotation_number = models.CharField(max_length=50, unique=True)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    supplier_pi = models.ForeignKey(SupplierPI, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_quotations', help_text='The supplier PI this quotation is based on')
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=50, blank=True)
    client_company = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    issue_date = models.DateField()
    valid_until = models.DateField()
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='Profit margin %')
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    terms = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"QUO-{self.quotation_number} ({self.client_name})"


class ClientQuotationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(ClientQuotation, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    supplier_unit_price = models.DecimalField(max_digits=18, decimal_places=2, default=0, help_text='Price from supplier PI')
    margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    selling_unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.selling_unit_price
        super().save(*args, **kwargs)


class ClientPO(BaseModel):
    """Step 3: Purchase Order received from client after quotation accepted."""
    STATUS_CHOICES = [
        ('received', _('Received')),
        ('confirmed', _('Confirmed')),
        ('in_fulfillment', _('In Fulfillment')),
        ('partially_fulfilled', _('Partially Fulfilled')),
        ('fulfilled', _('Fulfilled')),
        ('cancelled', _('Cancelled')),
    ]
    FULFILLMENT_CHOICES = [
        ('from_stock', _('From Stock')),
        ('from_supplier', _('Order from Supplier')),
        ('mixed', _('Mixed - Stock + Supplier')),
    ]
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    po_number = models.CharField(max_length=50, unique=True)
    quotation = models.ForeignKey(ClientQuotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_pos')
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_company = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    fulfillment_source = models.CharField(max_length=20, choices=FULFILLMENT_CHOICES, default='from_stock')
    order_date = models.DateField()
    expected_delivery = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    supplier_po = models.ForeignKey('supply_chain.PurchaseOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='client_pos', help_text='Supplier PO if products ordered abroad')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return f"CPO-{self.po_number} ({self.client_name})"


class ClientPOLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_po = models.ForeignKey(ClientPO, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('inventory.Product', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    fulfilled_from_stock = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    fulfilled_from_supplier = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class CommercialInvoice(BaseModel):
    """Step 5: Commercial invoice created for the client."""
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('issued', _('Issued')),
        ('partially_paid', _('Partially Paid')),
        ('paid', _('Paid')),
        ('overdue', _('Overdue')),
        ('cancelled', _('Cancelled')),
    ]
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    invoice_number = models.CharField(max_length=50, unique=True)
    client_po = models.ForeignKey(ClientPO, on_delete=models.SET_NULL, null=True, blank=True, related_name='commercial_invoices')
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_company = models.CharField(max_length=255, blank=True)
    client_address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    issue_date = models.DateField()
    due_date = models.DateField()
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    terms = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"CI-{self.invoice_number} ({self.client_name})"


class Delivery(BaseModel):
    """Step 6: Track delivery to client."""
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('awaiting_stock', _('Awaiting Supplier Shipment')),
        ('received_at_warehouse', _('Received at Warehouse')),
        ('dispatched', _('Dispatched to Client')),
        ('in_transit', _('In Transit')),
        ('delivered', _('Delivered')),
    ]
    business_line = models.CharField(max_length=20, choices=BUSINESS_LINE_CHOICES)
    delivery_number = models.CharField(max_length=50, unique=True)
    client_po = models.ForeignKey(ClientPO, on_delete=models.CASCADE, related_name='deliveries')
    commercial_invoice = models.ForeignKey(CommercialInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    client_name = models.CharField(max_length=255)
    delivery_address = models.TextField(blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    tracking_number = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Deliveries'

    def __str__(self):
        return f"DEL-{self.delivery_number} ({self.client_name})"
