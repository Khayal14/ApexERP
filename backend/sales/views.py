from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import Quotation, QuotationLine, SalesOrder, SalesOrderLine, ReturnOrder, PricingRule
from .serializers import (
    QuotationSerializer, QuotationLineSerializer, SalesOrderSerializer,
    SalesOrderLineSerializer, ReturnOrderSerializer, PricingRuleSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class QuotationViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status']
    search_fields = ['quote_number', 'customer_name']

    @action(detail=True, methods=['post'])
    def convert_to_order(self, request, pk=None):
        quote = self.get_object()
        order = SalesOrder.objects.create(
            company=quote.company, quotation=quote, customer_name=quote.customer_name,
            customer_email=quote.customer_email, contact=quote.contact,
            order_date=timezone.now().date(), subtotal=quote.subtotal,
            tax_amount=quote.tax_amount, discount_amount=quote.discount_amount,
            total=quote.total, currency=quote.currency,
            created_by=request.user, updated_by=request.user,
            order_number=f"SO-{quote.quote_number}",
        )
        for line in quote.lines.all():
            SalesOrderLine.objects.create(
                sales_order=order, product=line.product, description=line.description,
                quantity=line.quantity, unit_price=line.unit_price,
                discount_percent=line.discount_percent, tax_rate=line.tax_rate, total=line.total,
            )
        quote.status = 'accepted'
        quote.save()
        return Response(SalesOrderSerializer(order).data, status=201)

class SalesOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'payment_status']
    search_fields = ['order_number', 'customer_name']

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        order = self.get_object()
        order.status = 'confirmed'
        order.save()
        return Response(SalesOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        order = self.get_object()
        order.status = 'shipped'
        order.save()
        return Response(SalesOrderSerializer(order).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        today = timezone.now().date()
        month_start = today.replace(day=1)
        return Response({
            'total_orders': qs.count(),
            'total_revenue': float(qs.filter(payment_status='paid').aggregate(total=Sum('total'))['total'] or 0),
            'this_month_revenue': float(qs.filter(order_date__gte=month_start, payment_status='paid').aggregate(total=Sum('total'))['total'] or 0),
            'pending_orders': qs.filter(status='pending').count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'), total=Sum('total'))),
            'avg_order_value': float(qs.aggregate(avg=Avg('total'))['avg'] or 0),
        })

class ReturnOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ReturnOrder.objects.all()
    serializer_class = ReturnOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        ret = self.get_object()
        ret.status = 'approved'
        ret.save()
        return Response(ReturnOrderSerializer(ret).data)

class PricingRuleViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = PricingRule.objects.all()
    serializer_class = PricingRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def calculate_price(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        from inventory.models import Product
        try:
            product = Product.objects.get(id=product_id)
            base_price = float(product.selling_price)
            rules = PricingRule.objects.filter(
                company=request.user.company, is_active=True,
                min_quantity__lte=quantity
            ).filter(
                models.Q(product=product) | models.Q(category=product.category) | models.Q(product__isnull=True, category__isnull=True)
            ).order_by('-priority')
            final_price = base_price
            for rule in rules[:1]:
                if rule.rule_type == 'discount':
                    final_price = base_price * (1 - float(rule.value) / 100)
                elif rule.rule_type == 'markup':
                    final_price = base_price * (1 + float(rule.value) / 100)
                elif rule.rule_type == 'fixed':
                    final_price = float(rule.value)
            return Response({'base_price': base_price, 'final_price': final_price, 'quantity': quantity})
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)
