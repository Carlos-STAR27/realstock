#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 加载环境变量
load_dotenv()

def get_tidb_engine():
    """获取TiDB连接引擎"""
    db_host = os.getenv('DB_HOST')
    db_port = os.getenv('DB_PORT')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_name = os.getenv('DB_NAME')
    
    connect_args = {}
    if 'tidbcloud' in db_host:
        connect_args['ssl'] = {'ca': None, 'check_hostname': False}
    
    url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    return create_engine(url, connect_args=connect_args)

def check_tidb_tables():
    try:
        engine = get_tidb_engine()
        print("✅ TiDB连接成功\n")
        
        with engine.connect() as conn:
            print("=== 所有表 ===")
            result = conn.execute(text("SHOW TABLES"))
            for row in result:
                print(f"  {row[0]}")
            
            print("\n=== stock_selected 表结构 ===")
            result = conn.execute(text("DESCRIBE stock_selected"))
            for row in result:
                print(f"  {row}")
            
            print("\n=== stock_selected 表数据条数 ===")
            result = conn.execute(text("SELECT COUNT(*) FROM stock_selected"))
            count = result.scalar()
            print(f"  {count} 条")
            
            if count > 0:
                print("\n=== 前3条数据 ===")
                result = conn.execute(text("SELECT * FROM stock_selected LIMIT 3"))
                for row in result:
                    print(f"  {row}")
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_tidb_tables()
