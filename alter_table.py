#!/usr/bin/env python3
import sys
from utils.db_utils import get_db_engine
from sqlalchemy import text

def alter_table():
    try:
        engine = get_db_engine()
        print("✅ 数据库连接成功\n")
        
        with engine.begin() as conn:
            # 添加字段到 stock_selected 表
            print("📋 修改 stock_selected 表，添加新字段...")
            
            # 检查字段是否存在，如果不存在则添加
            def add_column_if_not_exists(table_name, column_name, column_def):
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"))
                    print(f"  ✅ 添加字段 {column_name} 成功")
                except Exception as e:
                    if "Duplicate column name" in str(e):
                        print(f"  ℹ️  字段 {column_name} 已存在，跳过")
                    else:
                        raise e
            
            add_column_if_not_exists("stock_selected", "is_favorite", "TINYINT DEFAULT 0")
            add_column_if_not_exists("stock_selected", "favorite_added_at", "DATETIME")
            add_column_if_not_exists("stock_selected", "is_observation", "TINYINT DEFAULT 0")
            add_column_if_not_exists("stock_selected", "observation_added_at", "DATETIME")
            
            print("\n🎉 表结构修改完成！")
            
            # 查看修改后的表结构
            print("\n📋 查看修改后的表结构：")
            result = conn.execute(text("DESCRIBE stock_selected"))
            for row in result:
                print(f"  {row}")
                
        return True
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = alter_table()
    sys.exit(0 if success else 1)
