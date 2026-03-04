from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import (
    Warehouse, ProductCategory, Product, StockLevel, StockMovement,
    InventoryCount, InventoryCountLine, DemandForecast
)
from .serializers import (
    WarehouseSerializer, ProductCategorySerializer, ProductSerializer,
    StockLevelSerializer, StockMovementSerializer,
    InventoryCountSerializer, DemandForecastSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class WarehouseViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]

class ProductCategoryViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['product_type', 'category', 'is_sellable']
    search_fields = ['name', 'sku', 'barcode']

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        products = self.get_queryset().filter(stock_levels__quantity__lte=F('reorder_point')).distinct()
        return Response(ProductSerializer(products, many=True).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total_products': qs.count(),
            'total_value': float(StockLevel.objects.filter(
                product__company=request.user.company
            ).aggregate(total=Sum(F('quantity') * F('product__cost_price')))['total'] or 0),
            'low_stock_count': qs.filter(stock_levels__quantity__lte=F('reorder_point')).distinct().count(),
            'by_category': list(qs.values('category__name').annotate(count=Count('id'))),
        })

    @action(detail=True, methods=['get'])
    def stock_by_warehouse(self, request, pk=None):
        product = self.get_object()
        return Response(StockLevelSerializer(product.stock_levels.all(), many=True).data)

    @action(detail=True, methods=['get'])
    def movement_history(self, request, pk=None):
        product = self.get_object()
        return Response(StockMovementSerializer(product.movements.all()[:50], many=True).data)

class StockLevelViewSet(viewsets.ModelViewSet):
    queryset = StockLevel.objects.all()
    serializer_class = StockLevelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['product', 'warehouse']

class StockMovementViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['product', 'movement_type']

    def perform_create(self, serializer):
        movement = serializer.save(
            company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user
        )
        if movement.movement_type == 'in' and movement.destination_warehouse:
            sl, _ = StockLevel.objects.get_or_create(product=movement.product, warehouse=movement.destination_warehouse)
            sl.quantity += movement.quantity
            sl.save()
        elif movement.movement_type == 'out' and movement.source_warehouse:
            sl, _ = StockLevel.objects.get_or_create(product=movement.product, warehouse=movement.source_warehouse)
            sl.quantity -= movement.quantity
            sl.save()
        elif movement.movement_type == 'transfer':
            if movement.source_warehouse:
                sl_src, _ = StockLevel.objects.get_or_create(product=movement.product, warehouse=movement.source_warehouse)
                sl_src.quantity -= movement.quantity
                sl_src.save()
            if movement.destination_warehouse:
                sl_dst, _ = StockLevel.objects.get_or_create(product=movement.product, warehouse=movement.destination_warehouse)
                sl_dst.quantity += movement.quantity
                sl_dst.save()

class InventoryCountViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = InventoryCount.objects.all()
    serializer_class = InventoryCountSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        count = self.get_object()
        for line in count.lines.all():
            if line.counted_quantity is not None and line.variance != 0:
                sl = StockLevel.objects.get(product=line.product, warehouse=count.warehouse)
                sl.quantity = line.counted_quantity
                sl.last_counted = timezone.now()
                sl.save()
        count.status = 'completed'
        count.save()
        return Response({'status': 'Count finalized'})

class DemandForecastViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = DemandForecast.objects.all()
    serializer_class = DemandForecastSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['product']

    @action(detail=False, methods=['post'])
    def generate(self, request):
        product_id = request.data.get('product_id')
        from ai_engine.tasks import generate_demand_forecast
        generate_demand_forecast.delay(str(product_id), str(request.user.company_id))
        return Response({'status': 'Forecast generation started'})
