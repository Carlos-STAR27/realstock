#!/usr/bin/env python3
import sys
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

def fix_stock_selected_table():
    try:
        engine = get_tidb_engine()
        print("✅ TiDB连接成功\n")
        
        with engine.begin() as conn:
            # 先查看当前表结构
            print("📋 当前表结构:")
            result = conn.execute(text("DESCRIBE stock_selected"))
            current_columns = [row[0] for row in result]
            for row in result:
                print(f"  {row}")
            
            print("\n🔧 开始修复表结构...")
            
            # 检查并添加缺失的字段
            def add_column_if_not_exists(column_name, column_def):
                if column_name not in current_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE stock_selected ADD COLUMN {column_name} {column_def}"))
                        print(f"  ✅ 添加字段 {column_name} 成功")
                        return True
                    except Exception as e:
                        if "Duplicate column name" in str(e):
                            print(f"  ℹ️  字段 {column_name} 已存在")
                        else:
                            print(f"  ❌ 添加字段 {column_name} 失败: {e}")
                else:
                    print(f"  ℹ️  字段 {column_name} 已存在")
                return False
            
            # 添加execute_id字段（先尝试删除旧的主键）
            print("\n📝 处理主键和execute_id字段...")
            try:
                # 先尝试删除旧主键
                conn.execute(text("ALTER TABLE stock_selected DROP PRIMARY KEY"))
                print("  ✅ 删除旧主键成功")
            except Exception as e:
                print(f"  ℹ️  删除主键失败（可能不存在）: {e}")
            
            # 添加execute_id字段
            add_column_if_not_exists("execute_id", "VARCHAR(100) NOT NULL FIRST")
            
            # 添加其他字段
            add_column_if_not_exists("is_favorite", "TINYINT DEFAULT 0")
            add_column_if_not_exists("favorite_added_at", "DATETIME")
            add_column_if_not_exists("is_observation", "TINYINT DEFAULT 0")
            add_column_if_not_exists("observation_added_at", "DATETIME")
            
            # 添加新主键
            print("\n🔑 设置新主键...")
            try:
                conn.execute(text("ALTER TABLE stock_selected ADD PRIMARY KEY (execute_id, ts_code)"))
                print("  ✅ 设置新主键成功")
            except Exception as e:
                print(f"  ❌ 设置主键失败: {e}")
            
            # 查看修改后的表结构
            print("\n📋 修改后的表结构:")
            result = conn.execute(text("DESCRIBE stock_selected"))
            for row in result:
                print(f"  {row}")
            
            print("\n🎉 表结构修复完成！")
            return True
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_stock_selected_table()
    sys.exit(0 if success else 1)
