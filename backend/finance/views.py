from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import timedelta
from core.permissions import IsSameCompany
from .models import (
    Currency, FiscalYear, ChartOfAccount, JournalEntry, JournalEntryLine,
    Invoice, InvoiceLine, Payment, TaxRate, Budget, BudgetLine,
    ExpenseCategory, Expense
)
from .serializers import (
    CurrencySerializer, FiscalYearSerializer, ChartOfAccountSerializer,
    JournalEntrySerializer, JournalEntryLineSerializer,
    InvoiceSerializer, InvoiceLineSerializer, PaymentSerializer,
    TaxRateSerializer, BudgetSerializer, ExpenseCategorySerializer, ExpenseSerializer
)


class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active']


class FiscalYearViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]


class ChartOfAccountViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['account_type', 'is_active', 'parent']
    search_fields = ['code', 'name']

    @action(detail=False, methods=['get'])
    def tree(self, request):
        accounts = self.get_queryset().filter(parent__isnull=True)
        serializer = self.get_serializer(accounts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        accounts = self.get_queryset().filter(balance__gt=0).values(
            'code', 'name', 'account_type', 'balance'
        )
        total_debit = sum(a['balance'] for a in accounts if a['account_type'] in ['asset', 'expense'])
        total_credit = sum(a['balance'] for a in accounts if a['account_type'] in ['liability', 'equity', 'revenue'])
        return Response({
            'accounts': list(accounts),
            'total_debit': total_debit,
            'total_credit': total_credit,
            'balanced': abs(total_debit - total_credit) < 0.01,
        })


class JournalEntryViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'fiscal_year', 'date']
    search_fields = ['entry_number', 'description']

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'draft':
            return Response({'error': 'Only draft entries can be posted'}, status=400)
        total_debit = entry.lines.aggregate(total=Sum('debit'))['total'] or 0
        total_credit = entry.lines.aggregate(total=Sum('credit'))['total'] or 0
        if abs(total_debit - total_credit) > 0.01:
            return Response({'error': 'Entry is not balanced'}, status=400)
        entry.status = 'posted'
        entry.total_debit = total_debit
        entry.total_credit = total_credit
        entry.posted_at = timezone.now()
        entry.posted_by = request.user
        entry.save()
        for line in entry.lines.all():
            account = line.account
            account.balance += line.debit - line.credit
            account.save()
        return Response(JournalEntrySerializer(entry).data)

    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        entry = self.get_object()
        serializer = JournalEntryLineSerializer(data={**request.data, 'journal_entry': entry.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class InvoiceViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'invoice_type']
    search_fields = ['invoice_number', 'customer_name']

    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceLineSerializer(data={**request.data, 'invoice': invoice.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._recalculate(invoice)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'sent'
        invoice.save()
        return Response({'status': 'Invoice sent'})

    def _recalculate(self, invoice):
        lines = invoice.lines.all()
        invoice.subtotal = sum(l.quantity * l.unit_price for l in lines)
        invoice.tax_amount = sum(l.total - (l.quantity * l.unit_price) for l in lines)
        invoice.total = sum(l.total for l in lines) - invoice.discount_amount
        invoice.balance_due = invoice.total - invoice.amount_paid
        invoice.save()

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        overdue = self.get_queryset().filter(
            status__in=['sent', 'partial'],
            due_date__lt=timezone.now().date()
        )
        return Response(InvoiceSerializer(overdue, many=True).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total_invoiced': qs.aggregate(total=Sum('total'))['total'] or 0,
            'total_paid': qs.aggregate(total=Sum('amount_paid'))['total'] or 0,
            'total_outstanding': qs.filter(status__in=['sent', 'partial']).aggregate(total=Sum('balance_due'))['total'] or 0,
            'overdue_count': qs.filter(status__in=['sent', 'partial'], due_date__lt=timezone.now().date()).count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'), total=Sum('total'))),
        })


class PaymentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'payment_method']

    def perform_create(self, serializer):
        payment = serializer.save(
            company=self.request.user.company,
            created_by=self.request.user,
            updated_by=self.request.user
        )
        if payment.status == 'completed':
            self._apply_payment(payment)

    def _apply_payment(self, payment):
        invoice = payment.invoice
        total_paid = invoice.payments.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0
        invoice.amount_paid = total_paid
        invoice.balance_due = invoice.total - total_paid
        if invoice.balance_due <= 0:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'partial'
        invoice.save()


class TaxRateViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer
    permission_classes = [permissions.IsAuthenticated]


class BudgetViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]

    @action(detail=False, methods=['get'])
    def variance_report(self, request):
        budgets = self.get_queryset().filter(status='active')
        report = []
        for budget in budgets:
            report.append({
                'name': budget.name,
                'total': float(budget.total_budget),
                'spent': float(budget.spent),
                'remaining': float(budget.remaining),
                'utilization': float(budget.spent / budget.total_budget * 100) if budget.total_budget else 0,
            })
        return Response(report)


class ExpenseCategoryViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class ExpenseViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'category', 'employee']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        expense = self.get_object()
        expense.status = 'approved'
        expense.save()
        return Response({'status': 'Expense approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        expense = self.get_object()
        expense.status = 'rejected'
        expense.save()
        return Response({'status': 'Expense rejected'})

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        today = timezone.now().date()
        month_start = today.replace(day=1)
        return Response({
            'total_expenses': qs.filter(status='approved').aggregate(total=Sum('amount'))['total'] or 0,
            'this_month': qs.filter(date__gte=month_start, status='approved').aggregate(total=Sum('amount'))['total'] or 0,
            'pending_count': qs.filter(status='pending').count(),
            'by_category': list(qs.filter(status='approved').values('category__name').annotate(
                total=Sum('amount'), count=Count('id')
            )),
        })
