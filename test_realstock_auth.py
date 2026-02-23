#!/usr/bin/env python3
import requests

# Zeabur测试 - realstock.zeabur.app
API_URL = "https://realstock.zeabur.app"

# 先登录获取token
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "username": "admin",
    "password": "52Onion699"
})
print("登录响应:", login_response.status_code)
if login_response.ok:
    token = login_response.json().get("token")
    print("Token:", token)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n测试favorite_list...")
    try:
        fav_response = requests.get(
            f"{API_URL}/api/stock/favorite_list",
            headers=headers,
            params={"page": 1, "page_size": 50},
            timeout=10
        )
        print("favorite_list响应:", fav_response.status_code)
        print("favorite_list内容:", fav_response.text[:500])
    except Exception as e:
        print("favorite_list错误:", e)
    
    print("\n测试observation_list...")
    try:
        obs_response = requests.get(
            f"{API_URL}/api/stock/observation_list",
            headers=headers,
            params={"page": 1, "page_size": 50},
            timeout=10
        )
        print("observation_list响应:", obs_response.status_code)
        print("observation_list内容:", obs_response.text[:500])
    except Exception as e:
        print("observation_list错误:", e)
    
    print("\n测试query/stock_selected...")
    try:
        query_response = requests.get(
            f"{API_URL}/api/query/stock_selected",
            headers=headers,
            params={"page": 1, "page_size": 50},
            timeout=10
        )
        print("query/stock_selected响应:", query_response.status_code)
        print("query/stock_selected内容:", query_response.text[:500])
    except Exception as e:
        print("query/stock_selected错误:", e)
