#!/usr/bin/env python3
import requests

API_URL = "https://realstock.zeabur.app"

print("测试根路径...")
try:
    response = requests.get(f"{API_URL}/", timeout=10)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
except Exception as e:
    print(f"错误: {e}")

print("\n测试/api/logs...")
try:
    response = requests.get(f"{API_URL}/api/logs?task_name=选股&limit=5", timeout=10)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text[:500]}")
except Exception as e:
    print(f"错误: {e}")
