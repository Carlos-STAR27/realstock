from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 收集控制台日志
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    
    # 收集网络请求
    network_logs = []
    page.on("request", lambda req: network_logs.append(f"-> {req.method} {req.url}"))
    page.on("response", lambda res: network_logs.append(f"<- {res.status} {res.url}"))
    
    print("1. 访问登录页面...")
    page.goto('https://cn-stock.netlify.app/auth/signin')
    page.wait_for_load_state('networkidle')
    
    # 截图
    page.screenshot(path='/tmp/login_page.png', full_page=True)
    print("截图保存到 /tmp/login_page.png")
    
    # 检查页面内容
    print("\n2. 页面标题:", page.title())
    
    # 填写登录表单
    print("\n3. 填写登录表单...")
    page.fill('input#username', 'admin')
    page.fill('input#password', '52Onion699')
    
    # 点击登录按钮
    print("\n4. 点击登录按钮...")
    page.click('button[type="submit"]')
    
    # 等待响应
    time.sleep(3)
    page.wait_for_load_state('networkidle')
    
    # 截图结果
    page.screenshot(path='/tmp/login_result.png', full_page=True)
    print("结果截图保存到 /tmp/login_result.png")
    
    # 打印当前URL
    print(f"\n5. 当前URL: {page.url}")
    
    # 打印控制台日志
    print("\n=== 控制台日志 ===")
    for log in console_logs[-20:]:
        print(log)
    
    # 打印网络请求（只显示API相关）
    print("\n=== API网络请求 ===")
    for log in network_logs:
        if 'api' in log.lower() or 'auth' in log.lower():
            print(log)
    
    # 检查是否有错误提示
    error_element = page.query_selector('.bg-destructive')
    if error_element:
        print(f"\n错误提示: {error_element.inner_text()}")
    
    browser.close()
