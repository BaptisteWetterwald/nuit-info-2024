from django.urls import path
from .views import ThreeJSView

urlpatterns = [
    path('threejs/', ThreeJSView.as_view(), name='threejs'),
]
