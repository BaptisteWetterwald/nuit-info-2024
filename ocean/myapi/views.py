from django.views import View
from django.shortcuts import render

class ThreeJSView(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'myapi/index.html', {'message': 'This is a GET request'})

    def post(self, request, *args, **kwargs):
        return render(request, 'myapi/index.html', {'message': 'This is a POST request'})
