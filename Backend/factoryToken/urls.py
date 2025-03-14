# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/deploy-token/', views.deploy_token, name='deploy_token'),
    path('api/transaction-status/<str:tx_hash>/', views.get_transaction_status, name='transaction_status'),
]