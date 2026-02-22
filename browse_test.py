from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 访问你部署的前端
    page.goto('https://cn-stock.netlify.app')
    page.wait_for_load_state('networkidle')
    
    # 截图
    page.screenshot(path='/tmp/homepage.png', full_page=True)
    
    # 获取页面标题
    print(f"页面标题: {page.title()}")
    
    # 获取页面主要内容
    print("\n=== 页面主要内容 ===")
    content = page.content()
    print(content[:2000])  # 只显示前2000字符
    
    browser.close()
    print("\n截图已保存到 /tmp/homepage.png")
