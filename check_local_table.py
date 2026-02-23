#!/usr/bin/env python3
import pymysql
from utils.db_utils import get_config

# 连接本地MySQL查看表结构
config = get_config()

try:
    conn = pymysql.connect(
        host=config.get('DB_HOST', 'localhost'),
        port=int(config.get('DB_PORT', 3306)),
        user=config.get('DB_USER', 'root'),
        password=config.get('DB_PASSWORD', ''),
        database=config.get('DB_NAME', 'cn_stock')
    )
    
    with conn.cursor() as cursor:
        print("=== stock_selected 表结构 ===")
        cursor.execute("SHOW CREATE TABLE stock_selected")
        result = cursor.fetchone()
        print(result[1])
        print("\n=== 表中的字段 ===")
        cursor.execute("DESCRIBE stock_selected")
        for row in cursor.fetchall():
            print(row)
            
except Exception as e:
    print(f"错误: {e}")
finally:
    if 'conn' in locals():
        conn.close()
