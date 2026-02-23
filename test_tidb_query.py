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

def test_query():
    try:
        engine = get_tidb_engine()
        print("✅ TiDB连接成功\n")
        
        with engine.connect() as conn:
            print("=== 测试简单查询 ===")
            result = conn.execute(text("SELECT execute_id, ts_code FROM stock_selected LIMIT 3"))
            for row in result:
                print(f"  {row}")
            
            print("\n=== 测试完整查询 ===")
            q = text("""
                SELECT 
                    t1.buy_date, t1.gold_date, t1.execute_id, 
                    t1.ts_code, t2.ts_code_name as stock_name,
                    t1.trade_date, t1.price_open, t1.price_close, t1.price_high, t1.price_low,
                    t1.vol, t1.amount,
                    t1.is_favorite, t1.favorite_added_at,
                    t1.is_observation, t1.observation_added_at
                FROM stock_selected t1
                LEFT JOIN stock_name t2 ON t1.ts_code = t2.ts_code
                WHERE 1=1
                ORDER BY t1.trade_date DESC
                LIMIT :limit OFFSET :offset
            """)
            result = conn.execute(q, {"limit": 3, "offset": 0})
            for row in result:
                print(f"  {row}")
            
            print("\n✅ 查询成功！")
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_query()
