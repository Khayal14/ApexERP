import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Currency(models.Model):
    code = models.CharField(max_length=3, primary_key=True)
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=5)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = _('currencies')

    def __str__(self):
        return f"{self.code} ({self.symbol})"


class FiscalYear(BaseModel):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class ChartOfAccount(BaseModel):
    """Hierarchical chart of accounts."""
    ACCOUNT_TYPES = [
        ('asset', _('Asset')),
        ('liability', _('Liability')),
        ('equity', _('Equity')),
        ('revenue', _('Revenue')),
        ('expense', _('Expense')),
    ]
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True, blank=True)
    is_reconcilable = models.BooleanField(default=False)
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        ordering = ['code']
        unique_together = ['company', 'code']
        indexes = [
            models.Index(fields=['company', 'account_type']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(BaseModel):
    """General ledger entries."""
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('posted', _('Posted')),
        ('cancelled', _('Cancelled')),
    ]
    entry_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, related_name='journal_entries')
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    reference = models.CharField(max_length=255, blank=True)
    total_debit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-date', '-entry_number']
        indexes = [
            models.Index(fields=['company', 'date']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f"{self.entry_number} - {self.date}"


class JournalEntryLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='journal_lines')
    description = models.CharField(max_length=500, blank=True)
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.0)

    class Meta:
        ordering = ['id']


class Invoice(BaseModel):
    """Sales and purchase invoices."""
    INVOICE_TYPES = [
        ('sales', _('Sales Invoice')),
        ('purchase', _('Purchase Invoice')),
        ('credit_note', _('Credit Note')),
        ('debit_note', _('Debit Note')),
    ]
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('sent', _('Sent')),
        ('partial', _('Partially Paid')),
        ('paid', _('Paid')),
        ('overdue', _('Overdue')),
        ('cancelled', _('Cancelled')),
    ]
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=True)
    customer_address = models.TextField(blank=True)
    issue_date = models.DateField()
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'invoice_type']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"


class InvoiceLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        subtotal = self.quantity * self.unit_price
        discount = subtotal * (self.discount_percent / 100)
        self.total = subtotal - discount + ((subtotal - discount) * self.tax_rate / 100)
        super().save(*args, **kwargs)


class Payment(BaseModel):
    """Payment tracking."""
    PAYMENT_METHODS = [
        ('cash', _('Cash')),
        ('bank_transfer', _('Bank Transfer')),
        ('credit_card', _('Credit Card')),
        ('check', _('Check')),
        ('stripe', _('Stripe')),
        ('paypal', _('PayPal')),
    ]
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('completed', _('Completed')),
        ('failed', _('Failed')),
        ('refunded', _('Refunded')),
    ]
    payment_number = models.CharField(max_length=50, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField()
    reference = models.CharField(max_length=255, blank=True)
    stripe_payment_id = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.payment_number} - {self.amount}"


class TaxRate(BaseModel):
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    tax_type = models.CharField(max_length=50, choices=[
        ('sales', _('Sales Tax')), ('vat', _('VAT')),
        ('gst', _('GST')), ('withholding', _('Withholding')),
    ])
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class Budget(BaseModel):
    """Department/project budgets."""
    name = models.CharField(max_length=255)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE)
    department = models.CharField(max_length=100, blank=True)
    total_budget = models.DecimalField(max_digits=18, decimal_places=2)
    spent = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    remaining = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='active', choices=[
        ('active', _('Active')), ('exceeded', _('Exceeded')),
        ('closed', _('Closed')),
    ])

    def save(self, *args, **kwargs):
        self.remaining = self.total_budget - self.spent
        if self.spent > self.total_budget:
            self.status = 'exceeded'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class BudgetLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    planned_amount = models.DecimalField(max_digits=18, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    month = models.IntegerField(choices=[(i, i) for i in range(1, 13)])


class ExpenseCategory(BaseModel):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.SET_NULL, null=True)
    ai_keywords = models.JSONField(default=list, help_text='Keywords for AI auto-categorization')

    def __str__(self):
        return self.name


class Expense(BaseModel):
    """Expense tracking with AI auto-categorization."""
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    date = models.DateField()
    receipt = models.FileField(upload_to='receipts/', blank=True)
    is_reimbursable = models.BooleanField(default=False)
    employee = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='expenses')
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('approved', _('Approved')),
        ('rejected', _('Rejected')), ('reimbursed', _('Reimbursed')),
    ])
    ai_categorized = models.BooleanField(default=False)
    ai_confidence = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.description[:50]} - {self.amount}"
