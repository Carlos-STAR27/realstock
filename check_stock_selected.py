
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

host = "localhost"
port = 3306
user = "root"
password = "showlang"
database = "cn_stock"

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        cursorclass=pymysql.cursors.DictCursor
    )
    print("Successfully connected to MySQL")
    
    with conn.cursor() as cursor:
        # 检查 stock_selected 表的行数
        cursor.execute("SELECT COUNT(*) as count FROM stock_selected")
        result = cursor.fetchone()
        print(f"stock_selected 表共有 {result['count']} 条记录")
        
        # 检查有哪些执行日期
        if result['count'] > 0:
            cursor.execute("SELECT DISTINCT execute_date FROM stock_selected ORDER BY execute_date DESC LIMIT 10")
            dates = cursor.fetchall()
            print("\n最近10个执行日期:")
            for d in dates:
                print(f"  - {d['execute_date']}")
            
            # 显示几条记录
            cursor.execute("SELECT * FROM stock_selected LIMIT 5")
            rows = cursor.fetchall()
            print("\n前5条记录:")
            for i, row in enumerate(rows):
                print(f"\n  记录 {i+1}:")
                for key, value in row.items():
                    print(f"    {key}: {value}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
