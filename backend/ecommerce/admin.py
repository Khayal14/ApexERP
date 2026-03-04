from django.contrib import admin
from .models import Store, StorePage, ProductListing, Cart, EcommerceOrder, ProductReview, Coupon

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_live', 'currency']

@admin.register(ProductListing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'store', 'price', 'is_published', 'is_featured']
    list_filter = ['store', 'is_published']

@admin.register(EcommerceOrder)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer_name', 'status', 'payment_status', 'total']
    list_filter = ['status', 'payment_status']

admin.site.register(StorePage)
admin.site.register(Cart)
admin.site.register(ProductReview)
admin.site.register(Coupon)
