from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
import os
import subprocess
import sys
import json
import queue
import threading
import asyncio
import signal
import psutil
from typing import Optional, Dict
from pydantic import BaseModel
from datetime import datetime

# 复用现有 DB 与配置工具
from utils.db_utils import get_db_engine, get_config

app = FastAPI(title="Quantum Stock API", version="1.0.0")

# 进程管理器：跟踪所有运行的子进程
class ProcessManager:
    def __init__(self):
        self.processes: Dict[str, dict] = {}
        self.lock = threading.Lock()
    
    def register(self, task_id: str, process: asyncio.subprocess.Process, task_type: str = "tushare"):
        """注册一个新进程"""
        with self.lock:
            self.processes[task_id] = {
                "process": process,
                "task_type": task_type,
                "start_time": datetime.now(),
                "pid": process.pid
            }
    
    def unregister(self, task_id: str):
        """注销一个进程"""
        with self.lock:
            if task_id in self.processes:
                del self.processes[task_id]
    
    def get_process(self, task_id: str) -> Optional[dict]:
        """获取进程信息"""
        with self.lock:
            return self.processes.get(task_id)
    
    def terminate_process(self, task_id: str) -> bool:
        """终止指定进程及其所有子进程"""
        with self.lock:
            if task_id not in self.processes:
                return False
            
            proc_info = self.processes[task_id]
            process = proc_info["process"]
            pid = proc_info["pid"]
            
            try:
                # 尝试终止进程树
                self._kill_process_tree(pid)
                # 同时尝试直接终止 asyncio 进程对象
                try:
                    process.kill()
                except:
                    pass
                
                del self.processes[task_id]
                return True
            except Exception as e:
                print(f"终止进程 {task_id} (PID: {pid}) 失败: {e}")
                return False
    
    def _kill_process_tree(self, pid: int):
        """递归终止进程及其所有子进程"""
        try:
            parent = psutil.Process(pid)
            # 获取所有子进程
            children = parent.children(recursive=True)
            # 先终止子进程
            for child in children:
                try:
                    child.terminate()
                except:
                    pass
            # 等待子进程终止
            gone, alive = psutil.wait_procs(children, timeout=3)
            # 强制杀死未终止的子进程
            for child in alive:
                try:
                    child.kill()
                except:
                    pass
            # 终止父进程
            parent.terminate()
            parent.wait(timeout=3)
        except psutil.NoSuchProcess:
            pass
        except Exception as e:
            print(f"终止进程树失败: {e}")
            try:
                # 备用方案：使用 os.kill
                os.kill(pid, signal.SIGTERM)
            except:
                try:
                    os.kill(pid, signal.SIGKILL)
                except:
                    pass
    
    def terminate_all_by_type(self, task_type: str) -> int:
        """终止指定类型的所有进程"""
        with self.lock:
            to_terminate = [
                task_id for task_id, info in self.processes.items()
                if info["task_type"] == task_type
            ]
        
        count = 0
        for task_id in to_terminate:
            if self.terminate_process(task_id):
                count += 1
        return count
    
    def list_processes(self) -> list:
        """列出所有正在运行的进程"""
        with self.lock:
            result = []
            for task_id, info in self.processes.items():
                process = info["process"]
                # 检查进程是否还在运行
                if process.returncode is None:
                    result.append({
                        "task_id": task_id,
                        "task_type": info["task_type"],
                        "pid": info["pid"],
                        "start_time": info["start_time"].isoformat()
                    })
            return result

# 全局进程管理器实例
process_manager = ProcessManager()

# CORS配置 - 允许前端直接请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 会话与密钥
SECRET_KEY = get_config("APP_SECRET", "dev-secret-change-me")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# 静态资源 - 只有存在时才挂载
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/static", StaticFiles(directory=static_path), name="static")

# 根路由 -> 返回API信息
@app.get("/")
def root():
    return {"message": "Quantum Stock API", "version": "1.0.0"}


# 认证依赖
def require_auth(request: Request):
    if not request.session.get("authenticated", False):
        raise HTTPException(status_code=401, detail="未登录")


# ========== Auth ==========
@app.post("/api/auth/login")
async def login(request: Request, body: dict):
    username = body.get("username", "")
    password = body.get("password", "")
    
    engine = get_db_engine()
    try:
        # 先确保表存在
        with engine.connect() as conn:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_users (
                username VARCHAR(50) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """))
            conn.commit()
        
        # 查询用户
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT username, password, name, role FROM app_users WHERE username = :username"),
                {"username": username}
            ).fetchone()
            
            expected_username = get_config("APP_USERNAME", "admin")
            expected_password = get_config("APP_PASSWORD", "admin")
            
            if row:
                # 数据库中有用户
                if row[0] == expected_username and password == expected_password:
                    # 如果是admin用户，且密码和配置文件一致，直接登录，确保数据库密码是最新的
                    with engine.begin() as conn_update:
                        conn_update.execute(
                            text("UPDATE app_users SET password = :password WHERE username = :username"),
                            {"password": expected_password, "username": expected_username}
                        )
                    request.session["authenticated"] = True
                    request.session["username"] = row[0]
                    request.session["name"] = row[2]
                    request.session["role"] = row[3] or "user"
                    return {"ok": True, "username": row[0], "name": row[2], "role": row[3] or "user"}
                elif row[1] == password:
                    # 普通用户验证密码
                    request.session["authenticated"] = True
                    request.session["username"] = row[0]
                    request.session["name"] = row[2]
                    request.session["role"] = row[3] or "user"
                    return {"ok": True, "username": row[0], "name": row[2], "role": row[3] or "user"}
            else:
                # 数据库中没有用户，检查是否是默认admin
                if username == expected_username and password == expected_password:
                    # 默认admin用户登录时，自动创建到数据库
                    with engine.begin() as conn:
                        conn.execute(text("""
                        INSERT INTO app_users (username, password, name, role)
                        VALUES (:username, :password, :name, 'admin')
                        """), {
                            "username": username,
                            "password": password,
                            "name": "Admin"
                        })
                    request.session["authenticated"] = True
                    request.session["username"] = username
                    request.session["name"] = "Admin"
                    request.session["role"] = "admin"
                    return {"ok": True, "username": username, "name": "Admin", "role": "admin"}
            
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    except HTTPException:
        raise
    except Exception as e:
        print(f"登录错误: {e}")
        raise HTTPException(status_code=500, detail="登录失败")


@app.post("/api/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/me")
async def me(request: Request):
    return {
        "authenticated": bool(request.session.get("authenticated", False)),
        "username": request.session.get("username"),
        "name": request.session.get("name"),
        "role": request.session.get("role", "user")
    }


# ========== 状态 ==========
@app.get("/api/status/db")
def status_db(dep=Depends(require_auth)):
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        host = get_config("DB_HOST", "Unknown")
        masked = f"{host[:15]}..." if host else "Unknown"
        return {"ok": True, "host": masked}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


def format_date_str(date_str):
    """将 yyyymmdd 格式转换为 yyyy-mm-dd 格式"""
    if date_str and len(str(date_str)) == 8:
        s = str(date_str)
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return str(date_str) if date_str else ""

def convert_to_yyyymmdd(date_str):
    """将 yyyy-mm-dd 格式转换为 yyyymmdd 格式"""
    if date_str and len(date_str) == 10:
        return date_str.replace("-", "")
    return date_str

# ========== 查询 ==========
@app.get("/api/query/stock_selected")
def query_stock_selected(
    request: Request,
    ts_code: Optional[str] = None,
    buy_date_start: Optional[str] = None,
    buy_date_end: Optional[str] = None,
    gold_date_start: Optional[str] = None,
    gold_date_end: Optional[str] = None,
    execute_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
):
    engine = get_db_engine()
    base_where = " WHERE 1=1"
    params = {}

    if ts_code:
        base_where += " AND t1.ts_code LIKE :ts_code"
        params["ts_code"] = f"%{ts_code}%"
    if buy_date_start:
        base_where += " AND t1.buy_date >= :buy_start"
        params["buy_start"] = convert_to_yyyymmdd(buy_date_start)
    if buy_date_end:
        base_where += " AND t1.buy_date <= :buy_end"
        params["buy_end"] = convert_to_yyyymmdd(buy_date_end)
    if gold_date_start:
        base_where += " AND t1.gold_date >= :gold_start"
        params["gold_start"] = convert_to_yyyymmdd(gold_date_start)
    if gold_date_end:
        base_where += " AND t1.gold_date <= :gold_end"
        params["gold_end"] = convert_to_yyyymmdd(gold_date_end)
    if execute_id:
        base_where += " AND t1.execute_id = :exec_id"
        params["exec_id"] = execute_id

    offset = (max(page, 1) - 1) * max(page_size, 1)

    try:
        with engine.connect() as conn:
            total = conn.execute(text(f"SELECT COUNT(*) FROM stock_selected t1 {base_where}"), params).scalar()
            q = text(f"""
                SELECT 
                    t1.buy_date, t1.gold_date, t1.execute_id, 
                    t1.ts_code, t2.ts_code_name as stock_name,
                    t1.trade_date, t1.price_open, t1.price_close, t1.price_high, t1.price_low,
                    t1.vol, t1.amount,
                    t1.is_favorite, t1.favorite_added_at,
                    t1.is_observation, t1.observation_added_at
                FROM stock_selected t1
                LEFT JOIN stock_name t2 ON t1.ts_code = t2.ts_code
                {base_where}
                ORDER BY t1.trade_date DESC
                LIMIT :limit OFFSET :offset
            """)
            rows = conn.execute(q, {**params, "limit": page_size, "offset": offset}).mappings().all()
            items = []
            for row in rows:
                item = dict(row)
                item["buy_date"] = format_date_str(item["buy_date"])
                item["gold_date"] = format_date_str(item["gold_date"])
                item["execute_id"] = str(item["execute_id"]) if item["execute_id"] else ""
                items.append(item)
        return {"total": total, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 统计 ==========
@app.get("/api/stats/overview")
def get_stats_overview():
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            stock_count_result = conn.execute(text("SELECT COUNT(*) as cnt FROM stock_selected"))
            stock_count = stock_count_result.fetchone()[0]
            
            sql = text("""
                SELECT 
                    SUM(t2.price_close - t1.price_close) / NULLIF(SUM(t1.price_close), 0) * 100 as yield_rate
                FROM stock_selected t1
                INNER JOIN (
                    SELECT ts_code, price_close 
                    FROM cn_stock_daily 
                    WHERE trade_date = (SELECT MAX(trade_date) FROM cn_stock_daily)
                ) t2 ON CAST(t1.ts_code AS CHAR CHARACTER SET utf8mb4) = CAST(t2.ts_code AS CHAR CHARACTER SET utf8mb4)
            """)
            yield_result = conn.execute(sql)
            yield_row = yield_result.fetchone()
            
            yield_rate = yield_row[0] if yield_row and yield_row[0] is not None else None
            
            if yield_rate is not None:
                yield_value = f"{yield_rate:+.2f}%"
                yield_positive = yield_rate >= 0
            else:
                yield_value = "N/A"
                yield_positive = True
                
        return {
            "stockCount": str(stock_count),
            "yield": yield_value,
            "yieldPositive": yield_positive
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "stockCount": "0",
            "yield": "N/A",
            "yieldPositive": True
        }


# ========== 日志 ==========
@app.get("/api/logs")
def get_logs(task_name: str, limit: int = 20):
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            # 先查询所有任务名称（用于调试）
            all_tasks = conn.execute(text("SELECT DISTINCT task_name FROM task_logs")).fetchall()
            print(f"[DEBUG] 所有任务名称: {[r[0] for r in all_tasks]}")
            print(f"[DEBUG] 查询任务: {task_name}, limit: {limit}")
            
            q = text("""
                SELECT execute_time, status, message
                FROM task_logs
                WHERE task_name = :task_name
                AND status != 'RUNNING'
                ORDER BY execute_time DESC
                LIMIT :limit
            """)
            rows = conn.execute(q, {"task_name": task_name, "limit": limit}).mappings().all()
            print(f"[DEBUG] 查询到 {len(rows)} 条记录")
            
            items = []
            for row in rows:
                item = dict(row)
                print(f"[DEBUG] 记录: {item}")
                # 将 datetime 对象转换为 ISO 格式字符串
                if item.get("execute_time"):
                    item["execute_time"] = item["execute_time"].isoformat()
                items.append(item)
            return {"items": items}
    except Exception as e:
        print(f"[DEBUG] 查询日志出错: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 数据统计 ==========
@app.get("/api/stats/monthly_counts")
def get_monthly_counts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """获取按月统计数据条目（仅数据库）"""
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            # 构建查询条件
            where_conditions = []
            params = {}
            
            if start_date:
                start_ymd = start_date.replace("-", "")
                where_conditions.append("trade_date >= :start_date")
                params["start_date"] = start_ymd
            
            if end_date:
                end_ymd = end_date.replace("-", "")
                where_conditions.append("trade_date <= :end_date")
                params["end_date"] = end_ymd
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # 查询数据库数据
            q = text(f"""
                SELECT 
                    trade_date,
                    COUNT(*) AS total_count
                FROM cn_stock_daily
                {where_clause}
                GROUP BY trade_date
                ORDER BY trade_date DESC
            """)
            rows = conn.execute(q, params).mappings().all()
            
            # 在Python中处理年月分组
            monthly_data = {}
            for row in rows:
                trade_date = str(row["trade_date"])
                if len(trade_date) >= 6:
                    year_month = f"{trade_date[:4]}-{trade_date[4:6]}"
                    if year_month not in monthly_data:
                        monthly_data[year_month] = 0
                    monthly_data[year_month] += row["total_count"]
            
            # 转换为列表格式
            items = []
            for ym, cnt in sorted(monthly_data.items(), reverse=True):
                items.append({
                    "year_month": ym,
                    "count": cnt
                })
            
            return {"items": items}
    except Exception as e:
        print(f"[ERROR] 月度统计查询失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def run_tushare_verify_script(task_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """流式执行Tushare校验脚本"""
    import asyncio
    
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "utils", "tushare_verify_counts.py")
    if not os.path.exists(script_path):
        yield "错误: 脚本不存在\n"
        return
    
    # 构建命令行参数
    cmd = [sys.executable, "-u", script_path]
    if start_date:
        cmd.extend(["--start_date", start_date])
    if end_date:
        cmd.extend(["--end_date", end_date])
    
    # 使用 asyncio 创建子进程
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    
    # 注册进程到管理器
    process_manager.register(task_id, process, task_type="tushare_verify")
    
    try:
        # 实时读取输出
        while True:
            # 检查进程是否被终止
            if process.returncode is not None:
                yield "\n[进程已被终止]\n"
                break
            
            try:
                # 使用 wait_for 来允许检查进程状态
                line = await asyncio.wait_for(process.stdout.readline(), timeout=0.1)
                if not line:
                    if process.returncode is not None:
                        break
                    continue
                yield line.decode('utf-8', errors='replace')
            except asyncio.TimeoutError:
                # 超时继续循环，允许检查进程状态
                continue
        
        # 等待进程结束
        if process.returncode is None:
            await process.wait()
        
        # 返回最终结果标记
        yield f"\n[执行完成，返回码: {process.returncode}]\n"
    finally:
        # 从管理器中注销进程
        process_manager.unregister(task_id)


@app.get("/api/stats/tushare_verify")
async def get_tushare_verify(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """获取Tushare校验数据，流式输出"""
    # 生成唯一任务ID
    import uuid
    task_id = f"tushare_verify_{uuid.uuid4().hex[:8]}"
    
    return StreamingResponse(
        run_tushare_verify_script(task_id, start_date, end_date),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Task-ID": task_id,  # 返回任务ID，前端可用于终止
        }
    )


# ========== 进程管理 API ==========
@app.post("/api/process/terminate")
async def terminate_process(request: Request, body: dict):
    """终止指定任务的所有相关进程"""
    task_type = body.get("task_type", "tushare_verify")
    
    # 终止所有指定类型的进程
    count = process_manager.terminate_all_by_type(task_type)
    
    return {
        "ok": True,
        "message": f"已终止 {count} 个进程",
        "terminated_count": count
    }


@app.get("/api/process/list")
async def list_processes():
    """列出所有正在运行的进程"""
    processes = process_manager.list_processes()
    return {
        "ok": True,
        "processes": processes,
        "count": len(processes)
    }


# ========== 任务触发（异步执行） ==========
def run_script_async(script_rel_path: str, inputs: list[str]):
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), script_rel_path)
    if not os.path.exists(script_path):
        return {"ok": False, "error": f"脚本不存在: {script_path}"}

    cmd = [sys.executable, script_path]
    input_str = "\n".join(inputs) + "\n"
    try:
        subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return {"ok": True, "message": "任务已启动"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def run_script(script_rel_path: str, inputs: list[str]) -> dict:
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), script_rel_path)
    if not os.path.exists(script_path):
        return {"ok": False, "error": f"脚本不存在: {script_path}"}

    cmd = [sys.executable, script_path]
    input_str = "\n".join(inputs) + "\n"
    try:
        res = subprocess.run(
            cmd,
            input=input_str,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=None
        )
        ok = res.returncode == 0
        return {"ok": ok, "code": res.returncode, "stdout": res.stdout, "stderr": res.stderr}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def run_script_streaming(task_id: str, script_rel_path: str, inputs: list[str], task_type: str = "script"):
    """流式执行脚本，实时输出日志"""
    import asyncio
    
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), script_rel_path)
    if not os.path.exists(script_path):
        yield f"错误: 脚本不存在: {script_path}\n"
        return

    cmd = [sys.executable, "-u", script_path]  # -u 参数禁用Python输出缓冲
    input_str = "\n".join(inputs) + "\n"
    
    # 使用 asyncio 创建子进程
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    
    # 注册进程到管理器
    process_manager.register(task_id, process, task_type=task_type)
    
    try:
        # 发送输入
        process.stdin.write(input_str.encode())
        await process.stdin.drain()
        process.stdin.close()
        
        # 实时读取输出
        while True:
            # 检查进程是否被终止
            if process.returncode is not None:
                yield "\n[进程已被终止]\n"
                break
            
            try:
                # 使用 wait_for 来允许检查进程状态
                line = await asyncio.wait_for(process.stdout.readline(), timeout=0.1)
                if not line:
                    if process.returncode is not None:
                        break
                    continue
                yield line.decode('utf-8', errors='replace')
            except asyncio.TimeoutError:
                # 超时继续循环，允许检查进程状态
                continue
        
        # 等待进程结束
        if process.returncode is None:
            await process.wait()
        
        # 返回最终结果标记
        yield f"\n[执行完成，返回码: {process.returncode}]\n"
    finally:
        # 从管理器中注销进程
        process_manager.unregister(task_id)


class RangePayload(BaseModel):
    start_date: str
    end_date: str
    select_text: str = ""


@app.post("/api/tasks/select_stock")
def task_select_stock(payload: RangePayload):
    start_date = convert_to_yyyymmdd(payload.start_date)
    end_date = convert_to_yyyymmdd(payload.end_date)
    select_text = payload.select_text or ""
    
    print("="*50)
    print("执行选股请求")
    print(f"原始开始日期: {payload.start_date}")
    print(f"原始结束日期: {payload.end_date}")
    print(f"选股说明: {select_text}")
    print(f"转换后开始日期: {start_date}")
    print(f"转换后结束日期: {end_date}")
    print("="*50)
    
    out = run_script(os.path.join("utils", "tushare_select_stock.py"), [start_date, end_date, select_text])
    
    print("="*50)
    print("执行选股结果")
    print(f"执行成功: {out.get('ok', False)}")
    print(f"返回码: {out.get('code', 'N/A')}")
    print(f"标准输出:")
    print(out.get("stdout", ""))
    print(f"标准错误:")
    print(out.get("stderr", ""))
    print("="*50)
    
    if out["ok"]:
        stocks_selected = 0
        stdout = out.get("stdout", "")
        import re
        match = re.search(r"共筛选出\s+(\d+)\s+条符合条件的股票记录", stdout)
        if match:
            stocks_selected = int(match.group(1))
        return {
            "ok": True, 
            "stocks_selected": stocks_selected, 
            "stdout": stdout, 
            "stderr": out.get("stderr", ""),
            "code": out.get("code", 0)
        }
    return out


@app.post("/api/tasks/update_daily")
async def task_update_daily(request: Request, payload: RangePayload, dep=Depends(require_auth)):
    start_date = convert_to_yyyymmdd(payload.start_date)
    end_date = convert_to_yyyymmdd(payload.end_date)
    
    print("="*50)
    print("执行日K线抽取请求(流式)")
    print(f"原始开始日期: {payload.start_date}")
    print(f"原始结束日期: {payload.end_date}")
    print(f"转换后开始日期: {start_date}")
    print(f"转换后结束日期: {end_date}")
    print("="*50)
    
    # 生成唯一任务ID
    import uuid
    task_id = f"daily_update_{uuid.uuid4().hex[:8]}"
    
    # 使用流式输出
    return StreamingResponse(
        run_script_streaming(task_id, os.path.join("utils", "tushare_update_daily.py"), [start_date, end_date], task_type="daily_update"),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Task-ID": task_id,
        }
    )


@app.post("/api/tasks/update_names")
async def task_update_names(request: Request, dep=Depends(require_auth)):
    print("="*50)
    print("执行股票名称抽取请求(流式)")
    print("="*50)
    
    # 生成唯一任务ID
    import uuid
    task_id = f"names_update_{uuid.uuid4().hex[:8]}"
    
    # 使用流式输出
    return StreamingResponse(
        run_script_streaming(task_id, os.path.join("utils", "baostock_update_names.py"), [], task_type="names_update"),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Task-ID": task_id,
        }
    )


# ========== 选股池管理 ==========
@app.get("/api/manage/execute_dates")
def manage_execute_dates():
    engine = get_db_engine()
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT DISTINCT execute_id FROM stock_selected ORDER BY execute_id DESC")).fetchall()
        data = [str(r[0]) for r in rows]
    return {"items": data}


@app.get("/api/manage/execute_times")
def manage_execute_times(execute_date: str):
    engine = get_db_engine()
    return {"items": []}


@app.delete("/api/manage/stock_selected")
def manage_delete(execute_id: Optional[str] = None, execute_date: Optional[str] = None, execute_time: Optional[str] = None, dep=Depends(require_auth)):
    from utils.db_utils import log_task_execution
    engine = get_db_engine()
    with engine.begin() as conn:
        if execute_id:
            result = conn.execute(text("DELETE FROM stock_selected WHERE execute_id = :id"), {"id": execute_id})
            count = result.rowcount
            log_task_execution("删除", "SUCCESS", f"删除 {execute_id} 的选股数据，共 {count} 条")
        elif execute_date and execute_time:
            result = conn.execute(text("DELETE FROM stock_selected WHERE execute_date = :d AND execute_time = :t"), {"d": execute_date, "t": execute_time})
            count = result.rowcount
            log_task_execution("删除", "SUCCESS", f"删除 {execute_date} {execute_time} 的选股数据，共 {count} 条")
        else:
            return {"deleted": 0, "error": "缺少参数"}
    return {"deleted": count}


# ========== 用户管理 ==========
class UserCreatePayload(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    role: Optional[str] = "user"


class UserUpdatePayload(BaseModel):
    username: str
    name: Optional[str] = None
    role: Optional[str] = None


class UserPasswordPayload(BaseModel):
    username: str
    password: str


@app.get("/api/users")
def get_users(dep=Depends(require_auth)):
    """获取用户列表"""
    engine = get_db_engine()
    try:
        # 先确保表存在
        with engine.connect() as conn:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_users (
                username VARCHAR(50) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """))
            conn.commit()
        
        # 查询用户
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT username, name, role, created_at FROM app_users ORDER BY created_at DESC")).fetchall()
            items = []
            for row in rows:
                items.append({
                    "username": row[0],
                    "name": row[1],
                    "role": row[2] or "user",
                    "created_at": str(row[3]) if row[3] else None
                })
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users")
def create_user(payload: UserCreatePayload, dep=Depends(require_auth)):
    """创建用户"""
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            conn.execute(text("""
            INSERT INTO app_users (username, password, name, role)
            VALUES (:username, :password, :name, :role)
            """), {
                "username": payload.username,
                "password": payload.password,
                "name": payload.name or payload.username,
                "role": payload.role or "user"
            })
        return {"success": True, "username": payload.username}
    except Exception as e:
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="用户名已存在")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users")
def update_user(payload: UserUpdatePayload, dep=Depends(require_auth)):
    """更新用户信息"""
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            # 构建更新语句
            set_clauses = []
            params = {"username": payload.username}
            
            if payload.name is not None:
                set_clauses.append("name = :name")
                params["name"] = payload.name
            
            if payload.role is not None:
                set_clauses.append("role = :role")
                params["role"] = payload.role
            
            if not set_clauses:
                raise HTTPException(status_code=400, detail="没有需要更新的字段")
            
            query = text(f"UPDATE app_users SET {', '.join(set_clauses)} WHERE username = :username")
            result = conn.execute(query, params)
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="用户不存在")
        return {"success": True, "username": payload.username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users/password")
def update_user_password(payload: UserPasswordPayload, dep=Depends(require_auth)):
    """更新用户密码"""
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
            UPDATE app_users 
            SET password = :password
            WHERE username = :username
            """), {
                "username": payload.username,
                "password": payload.password
            })
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="用户不存在")
        return {"success": True, "username": payload.username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/users/{username}")
def delete_user(username: str, dep=Depends(require_auth)):
    """删除用户"""
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            result = conn.execute(text("DELETE FROM app_users WHERE username = :username"), {"username": username})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="用户不存在")
        return {"success": True, "username": username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 日志管理 ==========
@app.get("/api/logs/filters")
def get_log_filters(dep=Depends(require_auth)):
    """获取日志筛选条件的选项"""
    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            # 获取任务类别
            task_names = conn.execute(text("SELECT DISTINCT task_name FROM task_logs ORDER BY task_name")).fetchall()
            
            # 获取日期范围
            dates = conn.execute(text("SELECT DISTINCT DATE(execute_time) as dt FROM task_logs ORDER BY dt DESC")).fetchall()
            
            # 获取状态
            statuses = conn.execute(text("SELECT DISTINCT status FROM task_logs ORDER BY status")).fetchall()
            
        return {
            "task_names": [row[0] for row in task_names],
            "dates": [str(row[0]) for row in dates],
            "statuses": [row[0] for row in statuses]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/logs/list")
def get_logs_list(
    task_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    dep=Depends(require_auth)
):
    """获取日志列表，支持筛选"""
    engine = get_db_engine()
    try:
        where_conditions = []
        params = {}
        
        if task_name:
            where_conditions.append("task_name = :task_name")
            params["task_name"] = task_name
        
        if start_date:
            where_conditions.append("DATE(execute_time) >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_conditions.append("DATE(execute_time) <= :end_date")
            params["end_date"] = end_date
        
        if status:
            where_conditions.append("status = :status")
            params["status"] = status
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = text(f"""
            SELECT task_name, execute_time, status, message
            FROM task_logs
            {where_clause}
            ORDER BY execute_time DESC
            LIMIT :limit
        """)
        params["limit"] = limit
        
        with engine.connect() as conn:
            rows = conn.execute(query, params).fetchall()
            items = []
            for row in rows:
                items.append({
                    "task_name": row[0],
                    "execute_time": str(row[1]) if row[1] else None,
                    "status": row[2],
                    "message": row[3]
                })
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/logs")
def delete_logs(
    task_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    dep=Depends(require_auth)
):
    """删除日志，支持按条件筛选"""
    engine = get_db_engine()
    try:
        where_conditions = []
        params = {}
        
        if task_name:
            where_conditions.append("task_name = :task_name")
            params["task_name"] = task_name
        
        if start_date:
            where_conditions.append("DATE(execute_time) >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_conditions.append("DATE(execute_time) <= :end_date")
            params["end_date"] = end_date
        
        if status:
            where_conditions.append("status = :status")
            params["status"] = status
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        with engine.begin() as conn:
            count_query = text(f"SELECT COUNT(*) FROM task_logs {where_clause}")
            total_count = conn.execute(count_query, params).scalar()
            
            delete_query = text(f"DELETE FROM task_logs {where_clause}")
            result = conn.execute(delete_query, params)
            
        return {"success": True, "deleted_count": result.rowcount, "total_count": total_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 自选/观察股管理 ==========
class ToggleStockPayload(BaseModel):
    ts_code: str
    execute_id: str


@app.post("/api/stock/toggle_favorite")
def toggle_favorite(payload: ToggleStockPayload, dep=Depends(require_auth)):
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            # 先查询当前状态
            result = conn.execute(
                text("SELECT is_favorite FROM stock_selected WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
            ).fetchone()
            
            if result:
                current_is_favorite = result[0] or 0
                new_is_favorite = 1 if current_is_favorite == 0 else 0
                
                if new_is_favorite == 1:
                    # 添加自选
                    conn.execute(
                        text("UPDATE stock_selected SET is_favorite = 1, favorite_added_at = NOW() WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                        {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
                    )
                else:
                    # 删除自选
                    conn.execute(
                        text("UPDATE stock_selected SET is_favorite = 0, favorite_added_at = NULL WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                        {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
                    )
                
                return {"success": True, "is_favorite": new_is_favorite}
            else:
                raise HTTPException(status_code=404, detail="未找到该股票记录")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stock/toggle_observation")
def toggle_observation(payload: ToggleStockPayload, dep=Depends(require_auth)):
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            # 先查询当前状态
            result = conn.execute(
                text("SELECT is_observation FROM stock_selected WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
            ).fetchone()
            
            if result:
                current_is_observation = result[0] or 0
                new_is_observation = 1 if current_is_observation == 0 else 0
                
                if new_is_observation == 1:
                    # 添加观察
                    conn.execute(
                        text("UPDATE stock_selected SET is_observation = 1, observation_added_at = NOW() WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                        {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
                    )
                else:
                    # 删除观察
                    conn.execute(
                        text("UPDATE stock_selected SET is_observation = 0, observation_added_at = NULL WHERE ts_code = :ts_code AND execute_id = :execute_id"),
                        {"ts_code": payload.ts_code, "execute_id": payload.execute_id}
                    )
                
                return {"success": True, "is_observation": new_is_observation}
            else:
                raise HTTPException(status_code=404, detail="未找到该股票记录")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stock/favorite_list")
def list_favorites(page: int = 1, page_size: int = 50, dep=Depends(require_auth)):
    engine = get_db_engine()
    try:
        offset = (max(page, 1) - 1) * max(page_size, 1)
        with engine.connect() as conn:
            total = conn.execute(text("SELECT COUNT(*) FROM stock_selected WHERE is_favorite = 1")).scalar()
            rows = conn.execute(
                text("""
                    SELECT 
                        t1.buy_date, t1.gold_date, t1.execute_id, 
                        t1.ts_code, t2.ts_code_name as stock_name,
                        t1.trade_date, t1.price_open, t1.price_close, t1.price_high, t1.price_low,
                        t1.vol, t1.amount,
                        t1.is_favorite, t1.favorite_added_at,
                        t1.is_observation, t1.observation_added_at
                    FROM stock_selected t1
                    LEFT JOIN stock_name t2 ON t1.ts_code = t2.ts_code
                    WHERE t1.is_favorite = 1
                    ORDER BY t1.favorite_added_at DESC
                    LIMIT :limit OFFSET :offset
                """),
                {"limit": page_size, "offset": offset}
            ).mappings().all()
            items = []
            for row in rows:
                item = dict(row)
                item["buy_date"] = format_date_str(item["buy_date"])
                item["gold_date"] = format_date_str(item["gold_date"])
                item["execute_id"] = str(item["execute_id"]) if item["execute_id"] else ""
                items.append(item)
        return {"total": total, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stock/observation_list")
def list_observations(page: int = 1, page_size: int = 50, dep=Depends(require_auth)):
    engine = get_db_engine()
    try:
        offset = (max(page, 1) - 1) * max(page_size, 1)
        with engine.connect() as conn:
            total = conn.execute(text("SELECT COUNT(*) FROM stock_selected WHERE is_observation = 1")).scalar()
            rows = conn.execute(
                text("""
                    SELECT 
                        t1.buy_date, t1.gold_date, t1.execute_id, 
                        t1.ts_code, t2.ts_code_name as stock_name,
                        t1.trade_date, t1.price_open, t1.price_close, t1.price_high, t1.price_low,
                        t1.vol, t1.amount,
                        t1.is_favorite, t1.favorite_added_at,
                        t1.is_observation, t1.observation_added_at
                    FROM stock_selected t1
                    LEFT JOIN stock_name t2 ON t1.ts_code = t2.ts_code
                    WHERE t1.is_observation = 1
                    ORDER BY t1.observation_added_at DESC
                    LIMIT :limit OFFSET :offset
                """),
                {"limit": page_size, "offset": offset}
            ).mappings().all()
            items = []
            for row in rows:
                item = dict(row)
                item["buy_date"] = format_date_str(item["buy_date"])
                item["gold_date"] = format_date_str(item["gold_date"])
                item["execute_id"] = str(item["execute_id"]) if item["execute_id"] else ""
                items.append(item)
        return {"total": total, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
