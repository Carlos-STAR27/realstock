#!/usr/bin/env python3
import requests

# 本地测试
API_URL = "http://localhost:8000"

# 先登录获取token
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "username": "admin",
    "password": "52Onion699"
})
print("登录响应:", login_response.status_code)
if login_response.ok:
    token = login_response.json().get("token")
    print("Token:", token)
    
    # 测试查询API
    headers = {"Authorization": f"Bearer {token}"}
    query_response = requests.get(
        f"{API_URL}/api/query/stock_selected",
        headers=headers,
        params={
            "page": 1,
            "page_size": 50
        }
    )
    print("\n查询响应状态:", query_response.status_code)
    print("查询响应内容:", query_response.text)
