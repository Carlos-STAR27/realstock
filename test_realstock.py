#!/usr/bin/env python3
import requests

# Zeabur测试 - realstock.zeabur.app
API_URL = "https://realstock.zeabur.app"

print("测试根路径...")
try:
    root_response = requests.get(f"{API_URL}/", timeout=10)
    print("根路径响应:", root_response.status_code)
    print("根路径内容:", root_response.text[:200])
except Exception as e:
    print("根路径错误:", e)

print("\n测试execute_dates...")
try:
    execute_dates_response = requests.get(f"{API_URL}/api/manage/execute_dates", timeout=10)
    print("execute_dates响应:", execute_dates_response.status_code)
    print("execute_dates内容:", execute_dates_response.text)
except Exception as e:
    print("execute_dates错误:", e)

print("\n测试登录...")
try:
    login_response = requests.post(f"{API_URL}/api/auth/login", json={
        "username": "admin",
        "password": "52Onion699"
    }, timeout=10)
    print("登录响应:", login_response.status_code)
    print("登录内容:", login_response.text)
except Exception as e:
    print("登录错误:", e)
