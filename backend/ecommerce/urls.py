from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stores', views.StoreViewSet, basename='store')
router.register(r'pages', views.StorePageViewSet, basename='store-page')
router.register(r'listings', views.ProductListingViewSet, basename='listing')
router.register(r'carts', views.CartViewSet, basename='cart')
router.register(r'orders', views.EcommerceOrderViewSet, basename='ecommerce-order')
router.register(r'reviews', views.ProductReviewViewSet, basename='review')
router.register(r'coupons', views.CouponViewSet, basename='coupon')

urlpatterns = [path('', include(router.urls))]
