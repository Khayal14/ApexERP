from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import (
    Warehouse, ProductCategory, Product, StockLevel, StockMovement,
    InventoryCount, InventoryCountLine, ProductBOM, BOMLine,
    CompanyCostSetting, ProductCost, GoodsReceipt, GoodsReceiptLine,
    StockAlert, InterCompanyTransfer, InterCompanyTransferLine,
)
from .serializers import (
    WarehouseSerializer, ProductCategorySerializer, ProductSerializer,
    StockLevelSerializer, StockMovementSerializer,
    InventoryCountSerializer, ProductBOMSerializer, BOMLineSerializer,
    CompanyCostSettingSerializer, ProductCostSerializer,
    GoodsReceiptSerializer, GoodsReceiptLineSerializer,
    StockAlertSerializer, InterCompanyTransferSerializer,
    InterCompanyTransferLineSerializer,
)


class CompanyFilterMixin:
    """Filter all querysets by the user's active company."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        company = getattr(self.request.user, 'company', None)
        if company:
            return qs.filter(company=company)
        return qs.none()


class ProductViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('stock_levels')
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        field = self.request.query_params.get('business_field')
        if role:
            qs = qs.filter(product_role=role)
        if field:
            qs = qs.filter(business_field=field)
        return qs

    @action(detail=True, methods=['post'])
    def calculate_bom_requirements(self, request, pk=None):
        """Given an order quantity, return required raw materials."""
        product = self.get_object()
        order_qty = float(request.data.get('quantity', 1))
        if not hasattr(product, 'bom'):
            return Response({'error': 'No BOM configured for this product'}, status=400)
        requirements = []
        for line in product.bom.lines.select_related('component'):
            needed = line.quantity * order_qty
            stock = sum(sl.quantity for sl in line.component.stock_levels.all())
            requirements.append({
                'component_id':   str(line.component.id),
                'component_name': line.component.name,
                'component_sku':  line.component.sku,
                'component_role': line.component.product_role,
                'required_qty':   needed,
                'on_hand_qty':    float(stock),
                'shortfall':      max(0, needed - float(stock)),
                'unit':           line.unit_of_measure,
            })
        return Response({'product': product.name, 'order_qty': order_qty, 'requirements': requirements})


class WarehouseViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer


class ProductCategoryViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class StockLevelViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = StockLevel.objects.select_related('product', 'warehouse').all()
    serializer_class = StockLevelSerializer

    def get_queryset(self):
        # StockLevel has no company FK; bypass CompanyFilterMixin, filter via product
        company = getattr(self.request.user, 'company', None)
        if company:
            return StockLevel.objects.filter(product__company=company).select_related('product', 'warehouse')
        return StockLevel.objects.none()


class StockMovementViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'source_warehouse', 'destination_warehouse')
    serializer_class = StockMovementSerializer


class ProductBOMViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductBOM.objects.select_related('product').prefetch_related('lines__component')
    serializer_class = ProductBOMSerializer

    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        bom = self.get_object()
        data = request.data.copy()
        data['bom'] = bom.id
        ser = BOMLineSerializer(data=data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=201)
        return Response(ser.errors, status=400)

    @action(detail=True, methods=['delete'], url_path='remove_line/(?P<line_id>[^/.]+)')
    def remove_line(self, request, pk=None, line_id=None):
        bom = self.get_object()
        line = BOMLine.objects.filter(id=line_id, bom=bom).first()
        if not line:
            return Response({'error': 'Line not found'}, status=404)
        line.delete()
        return Response(status=204)


class CompanyCostSettingViewSet(viewsets.ModelViewSet):
    queryset = CompanyCostSetting.objects.all()
    serializer_class = CompanyCostSettingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company = getattr(self.request.user, 'company', None)
        if company:
            return CompanyCostSetting.objects.filter(company=company)
        return CompanyCostSetting.objects.none()


class ProductCostViewSet(viewsets.ModelViewSet):
    queryset = ProductCost.objects.select_related('product')
    serializer_class = ProductCostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company = getattr(self.request.user, 'company', None)
        if company:
            return ProductCost.objects.filter(product__company=company).select_related('product')
        return ProductCost.objects.none()

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        cost = self.get_object()
        cost.recalculate()
        return Response(ProductCostSerializer(cost).data)

    @action(detail=False, methods=['post'])
    def recalculate_all(self, request):
        company = getattr(request.user, 'company', None)
        updated = 0
        for cost in ProductCost.objects.filter(product__company=company):
            cost.recalculate()
            updated += 1
        return Response({'updated': updated})


class GoodsReceiptViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = GoodsReceipt.objects.select_related('purchase_order', 'warehouse').prefetch_related('lines__product')
    serializer_class = GoodsReceiptSerializer

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        receipt = self.get_object()
        if receipt.status != 'draft':
            return Response({'error': f'Cannot confirm a receipt with status: {receipt.status}'}, status=400)
        receipt.confirm()
        return Response(GoodsReceiptSerializer(receipt).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        receipt = self.get_object()
        if receipt.status == 'confirmed':
            return Response({'error': 'Cannot cancel a confirmed receipt'}, status=400)
        receipt.status = 'cancelled'
        receipt.save()
        return Response(GoodsReceiptSerializer(receipt).data)


class StockAlertViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = StockAlert.objects.select_related('product', 'warehouse')
    serializer_class = StockAlertSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('unacknowledged'):
            qs = qs.filter(is_acknowledged=False)
        return qs

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.is_acknowledged = True
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return Response(StockAlertSerializer(alert).data)

    @action(detail=False, methods=['post'])
    def acknowledge_all(self, request):
        company = getattr(request.user, 'company', None)
        updated = StockAlert.objects.filter(company=company, is_acknowledged=False).update(
            is_acknowledged=True,
            acknowledged_by=request.user,
            acknowledged_at=timezone.now(),
        )
        return Response({'acknowledged': updated})


class InterCompanyTransferViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = InterCompanyTransfer.objects.select_related(
        'from_company', 'to_company', 'from_warehouse', 'to_warehouse'
    ).prefetch_related('lines__product')
    serializer_class = InterCompanyTransferSerializer

    @action(detail=True, methods=['post'], url_path='do-dispatch')
    def do_dispatch(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'draft':
            return Response({'error': f'Cannot dispatch from status: {transfer.status}'}, status=400)
        transfer.dispatch()
        return Response(InterCompanyTransferSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def mark_in_transit(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'dispatched':
            return Response({'error': 'Transfer must be dispatched first'}, status=400)
        transfer.status = 'in_transit'
        transfer.save()
        return Response(InterCompanyTransferSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status not in ('dispatched', 'in_transit'):
            return Response({'error': f'Cannot receive from status: {transfer.status}'}, status=400)
        transfer.receive()
        return Response(InterCompanyTransferSerializer(transfer).data)


class InventoryCountViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = InventoryCount.objects.select_related('warehouse').prefetch_related('lines__product')
    serializer_class = InventoryCountSerializer
