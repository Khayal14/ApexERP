from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from core.permissions import IsSameCompany
from .models import Store, StorePage, ProductListing, Cart, EcommerceOrder, ProductReview, Coupon
from .serializers import (
    StoreSerializer, StorePageSerializer, ProductListingSerializer,
    CartSerializer, EcommerceOrderSerializer, ProductReviewSerializer, CouponSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class StoreViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        store = self.get_object()
        orders = store.orders.all()
        return Response({
            'total_orders': orders.count(),
            'total_revenue': float(orders.filter(payment_status='paid').aggregate(total=Sum('total'))['total'] or 0),
            'pending_orders': orders.filter(status='pending').count(),
            'total_products': store.listings.filter(is_published=True).count(),
            'abandoned_carts': store.carts.filter(is_abandoned=True).count(),
        })

class StorePageViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = StorePage.objects.all()
    serializer_class = StorePageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['store', 'page_type']

class ProductListingViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductListing.objects.all()
    serializer_class = ProductListingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['store', 'is_published', 'is_featured']
    search_fields = ['display_name']

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def storefront(self, request):
        store_slug = request.query_params.get('store')
        if not store_slug:
            return Response({'error': 'store parameter required'}, status=400)
        listings = ProductListing.objects.filter(store__slug=store_slug, is_published=True)
        return Response(ProductListingSerializer(listings, many=True).data)

class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        cart = self.get_object()
        item = request.data
        items = cart.items or []
        items.append(item)
        cart.items = items
        cart.save()
        return Response(CartSerializer(cart).data)

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        cart = self.get_object()
        order = EcommerceOrder.objects.create(
            store=cart.store, company=cart.store.company,
            order_number=f"EC-{cart.id.hex[:8].upper()}",
            customer_email=request.data.get('email', cart.customer_email),
            customer_name=request.data.get('name', ''),
            shipping_address=request.data.get('shipping_address', {}),
            billing_address=request.data.get('billing_address', {}),
            items=cart.items, subtotal=cart.subtotal,
            tax=cart.tax, shipping_cost=cart.shipping, total=cart.total,
            created_by=request.user if request.user.is_authenticated else None,
            updated_by=request.user if request.user.is_authenticated else None,
        )
        cart.delete()
        return Response(EcommerceOrderSerializer(order).data, status=201)

class EcommerceOrderViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = EcommerceOrder.objects.all()
    serializer_class = EcommerceOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['store', 'status', 'payment_status']
    search_fields = ['order_number', 'customer_name', 'customer_email']

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            order.status = new_status
            order.save()
        return Response(EcommerceOrderSerializer(order).data)

class ProductReviewViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ProductReview.objects.all()
    serializer_class = ProductReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['listing', 'is_approved', 'rating']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.save()
        listing = review.listing
        approved_reviews = listing.reviews.filter(is_approved=True)
        listing.reviews_count = approved_reviews.count()
        listing.avg_rating = approved_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        listing.save()
        return Response(ProductReviewSerializer(review).data)

class CouponViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['store']

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def validate(self, request):
        code = request.data.get('code')
        try:
            coupon = Coupon.objects.get(code=code)
            if coupon.is_valid:
                return Response(CouponSerializer(coupon).data)
            return Response({'error': 'Coupon is not valid'}, status=400)
        except Coupon.DoesNotExist:
            return Response({'error': 'Coupon not found'}, status=404)
