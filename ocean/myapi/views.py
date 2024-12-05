from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class MyDataView(APIView):
    def get(self, request):
        # You can replace this with dynamically fetched data or external API data
        data = {
            "message": "Hello, World!",
            "items": [1, 2, 3, 4, 5]
        }
        return Response(data, status=status.HTTP_200_OK)