from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_default_timeout(60000)  # 60秒超时
    
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    
    network_logs = []
    page.on("response", lambda res: network_logs.append(f"{res.status} {res.url}"))
    
    print("1. 访问登录页面...")
    try:
        page.goto('https://cn-stock.netlify.app/auth/signin', timeout=60000)
        page.wait_for_load_state('networkidle')
    except Exception as e:
        print(f"   加载警告: {e}")
    
    print("2. 登录...")
    page.fill('input#username', 'admin')
    page.fill('input#password', '52Onion699')
    page.click('button[type="submit"]')
    time.sleep(3)
    
    print(f"   当前URL: {page.url}")
    
    print("\n3. 访问 AI 选股页面...")
    try:
        page.goto('https://cn-stock.netlify.app/select', timeout=60000)
        page.wait_for_load_state('networkidle')
    except Exception as e:
        print(f"   加载警告: {e}")
    
    time.sleep(2)
    print(f"   当前URL: {page.url}")
    
    # 截图
    page.screenshot(path='/tmp/ai_select_page.png', full_page=True)
    print("   截图保存到 /tmp/ai_select_page.png")
    
    # 获取页面内容
    print("\n=== 页面文本内容 ===")
    body_text = page.locator('body').inner_text()
    print(body_text[:2000])
    
    # 检查错误提示
    print("\n=== 控制台错误 ===")
    for log in console_logs:
        if 'error' in log.lower() or 'fail' in log.lower():
            print(log)
    
    print("\n=== API 请求 (非200状态) ===")
    for log in network_logs:
        if not log.startswith('200'):
            print(log)
    
    browser.close()
