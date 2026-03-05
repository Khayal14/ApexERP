from rest_framework import serializers
from .models import Store, StorePage, ProductListing, Cart, EcommerceOrder, ProductReview, Coupon

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class StorePageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorePage
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class ProductListingSerializer(serializers.ModelSerializer):
    on_sale = serializers.ReadOnlyField()
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    class Meta:
        model = ProductListing
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class EcommerceOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EcommerceOrder
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class CouponSerializer(serializers.ModelSerializer):
    is_valid = serializers.ReadOnlyField()
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
