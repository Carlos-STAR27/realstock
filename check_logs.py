#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from utils.db_utils import get_db_engine
from sqlalchemy import text

def main():
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            print("=== 查询 '选股' 任务的最近10条记录 ===")
            select_query = text("""
                SELECT execute_time, status, message
                FROM task_logs
                WHERE task_name = '选股'
                ORDER BY execute_time DESC
                LIMIT 10
            """)
            rows = conn.execute(select_query).mappings().all()
            for row in rows:
                print(f"时间: {row['execute_time']}, 状态: {row['status']}, 消息: {row['message']}")
            
            print("\n=== 查询 '删除' 任务的最近10条记录 ===")
            delete_query = text("""
                SELECT execute_time, status, message
                FROM task_logs
                WHERE task_name = '删除'
                ORDER BY execute_time DESC
                LIMIT 10
            """)
            rows = conn.execute(delete_query).mappings().all()
            for row in rows:
                print(f"时间: {row['execute_time']}, 状态: {row['status']}, 消息: {row['message']}")
                
    except Exception as e:
        print(f"查询出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
