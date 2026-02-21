# -*- coding: utf-8 -*-
"""
Tushare 月度数据校验工具
功能说明：
1. 获取按月统计的 Tushare API 数据条目数（作为校验数）
2. 与数据库中实际存储的数据条目数进行对比
3. 计算差异并标记异常
4. 处理接口频率限制，自动等待
"""

import tushare as ts
import pandas as pd
from datetime import datetime, timedelta
import time
import os
import sys
import json
import argparse
from dotenv import load_dotenv

# 添加当前目录到系统路径，以便导入 db_utils
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from db_utils import get_db_engine
    from sqlalchemy import text
except ImportError:
    # 如果作为模块导入时可能需要这样
    sys.path.append(os.path.join(os.path.dirname(current_dir)))
    from utils.db_utils import get_db_engine
    from sqlalchemy import text

# 加载环境变量
load_dotenv()
load_dotenv('.env.local')

# Tushare Pro接口初始化（优先从环境变量读取）
tushare_token = os.getenv('TUSHARE_TOKEN', '1f18885fdd078e681cf087e23c1d6f28226103f470ccf8f30fc38809')
pro = ts.pro_api(tushare_token)


def get_single_day_count(trade_date):
    """
    获取单日Tushare数据条目数（带无限重试机制）
    逻辑说明：
        1. 调用Tushare pro.daily接口拉取指定日期数据
        2. 接口调用失败时，等待65秒后无限重试（直到成功或无数据）
        3. 区分交易日（有数据）和非交易日（无数据）

    参数：
        trade_date: 交易日，格式为'YYYYMMDD'
    返回：
        int: 成功返回数据条目数，失败持续重试直到成功
    """
    retry_count = 0  # 重试次数计数器

    while True:
        try:
            # 调用Tushare接口拉取数据
            df = pro.daily(
                trade_date=trade_date,
                fields=["ts_code", "trade_date"]
            )

            # 数据返回处理
            if not df.empty:
                # 格式化日期输出，提升可读性
                print(f"{trade_date[:4]}-{trade_date[4:6]}-{trade_date[6:]} 成功，共 {len(df)} 条记录", flush=True)
                return len(df)
            else:
                print(f"没有数据（可能是非交易日） {trade_date[:4]}-{trade_date[4:6]}-{trade_date[6:]}", flush=True)
                return 0

        except Exception as e:
            # 接口调用失败，重试逻辑
            retry_count += 1
            print(f"获取 {trade_date} 数据时出错 (第{retry_count}次重试): {e}", flush=True)
            print(f"等待 15 秒后重试...", flush=True)
            time.sleep(15)  # 重试间隔15秒


def get_monthly_tushare_counts(start_date, end_date):
    """
    获取指定日期范围内的月度Tushare数据条目数
    参照 tushare-Update_CN_stock_daily-final.py 的方式
    """
    # 日期格式转换：字符串→datetime对象（便于日期遍历）
    start = datetime.strptime(start_date, '%Y%m%d')
    end = datetime.strptime(end_date, '%Y%m%d')

    # 统计变量初始化（仅保留统计值，不存储原始数据）
    monthly_counts = {}

    # 计算需要处理的总天数
    total_days = (end - start).days + 1
    print(f"共需要处理 {total_days} 天", flush=True)

    # 按日期循环拉取数据
    for day_count in range(total_days):
        current_date = start + timedelta(days=day_count)  # 计算当前循环日期
        trade_date = current_date.strftime('%Y%m%d')  # 转换为YYYYMMDD格式
        current_year = trade_date[:4]  # 提取当前日期的年份
        year_month = f"{trade_date[:4]}-{trade_date[4:6]}"

        # 拉取单日数据
        count = get_single_day_count(trade_date)

        # 仅处理有数据的日期
        if count > 0:
            if year_month not in monthly_counts:
                monthly_counts[year_month] = 0
            monthly_counts[year_month] += count

        # 每次调用后等待0.5秒，避免触发Tushare频率限制
        if day_count < total_days - 1:
            time.sleep(0.5)

    return monthly_counts


def get_monthly_db_counts(start_date=None, end_date=None):
    """
    从数据库获取月度数据条目数
    """
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            # 构建查询条件
            where_conditions = []
            params = {}
            
            if start_date:
                where_conditions.append("trade_date >= :start_date")
                params["start_date"] = start_date
            
            if end_date:
                where_conditions.append("trade_date <= :end_date")
                params["end_date"] = end_date
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # 查询按天统计的数据，然后在Python中聚合
            query = text(f"""
                SELECT 
                    trade_date,
                    COUNT(*) as total_count
                FROM cn_stock_daily
                {where_clause}
                GROUP BY trade_date
                ORDER BY trade_date DESC
            """)
            result = conn.execute(query, params).mappings()
            
            # 在Python中处理年月分组
            monthly_data = {}
            for row in result:
                trade_date = str(row["trade_date"])
                if len(trade_date) >= 6:
                    year_month = f"{trade_date[:4]}-{trade_date[4:6]}"
                    if year_month not in monthly_data:
                        monthly_data[year_month] = 0
                    monthly_data[year_month] += row["total_count"]
            
            return monthly_data
    finally:
        engine.dispose()


def get_verify_stats(start_date=None, end_date=None):
    """
    获取校验统计数据
    """
    # 日期格式转换：yyyy-mm-dd -> yyyymmdd
    def convert_date(date_str):
        if not date_str:
            return None
        if '-' in date_str:
            # 格式：2026-01-01
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%Y%m%d')
        else:
            # 已经是 yyyymmdd 格式
            return date_str
    
    # 默认日期范围：最近6个月
    if not end_date:
        end_date = datetime.now().strftime('%Y%m%d')
    else:
        end_date = convert_date(end_date)
    
    if not start_date:
        start = datetime.now() - timedelta(days=180)
        start_date = start.strftime('%Y%m%d')
    else:
        start_date = convert_date(start_date)
    
    # 获取数据库月度数据
    db_counts = get_monthly_db_counts(start_date, end_date)
    
    # 获取Tushare月度数据
    tushare_counts = get_monthly_tushare_counts(start_date, end_date)
    
    # 合并数据
    all_months = set(tushare_counts.keys()) | set(db_counts.keys())
    stats = []
    
    for month in sorted(all_months, reverse=True):
        tushare_count = tushare_counts.get(month, 0)
        db_count = db_counts.get(month, 0)
        diff = tushare_count - db_count
        
        stats.append({
            "year_month": month,
            "tushare_count": tushare_count,
            "db_count": db_count,
            "diff": diff
        })
    
    return stats


if __name__ == "__main__":
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='Tushare月度数据校验工具')
    parser.add_argument('--start_date', type=str, help='开始日期 (yyyy-mm-dd 或 yyyymmdd)')
    parser.add_argument('--end_date', type=str, help='结束日期 (yyyy-mm-dd 或 yyyymmdd)')
    args = parser.parse_args()
    
    # 执行校验
    print("=" * 60, flush=True)
    print("开始Tushare数据校验...", flush=True)
    print("=" * 60, flush=True)
    
    stats = get_verify_stats(args.start_date, args.end_date)
    
    print("\n" + "=" * 60, flush=True)
    print("月度数据校验统计:", flush=True)
    print("-" * 60, flush=True)
    print(f"{'年月':<10} {'Tushare校验数':>15} {'数据库条目':>12} {'差异':>10}", flush=True)
    print("-" * 60, flush=True)
    
    for item in stats:
        month = item["year_month"]
        tushare = item["tushare_count"]
        db = item["db_count"]
        diff = item["diff"]
        
        print(f"{month:<10} {tushare:>15,} {db:>12,} {diff:>10,}", flush=True)
    
    print("-" * 60, flush=True)
    
    # 输出JSON格式的结果（供前端解析）
    print("\n[RESULT_JSON_START]", flush=True)
    print(json.dumps({"items": stats}, ensure_ascii=False), flush=True)
    print("[RESULT_JSON_END]", flush=True)
