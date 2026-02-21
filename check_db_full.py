import pymysql
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", 3306))
user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "showlang")
database = os.getenv("DB_NAME", "cn_stock")

print(f"Connecting to {user}@{host}:{port}...")

try:
    # 1. Test basic connection
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password
    )
    print("✅ MySQL Connection successful!")
    
    # 2. Check if database exists
    with conn.cursor() as cursor:
        cursor.execute("SHOW DATABASES;")
        dbs = [row[0] for row in cursor.fetchall()]
        if database in dbs:
            print(f"✅ Database '{database}' exists.")
        else:
            print(f"❌ Database '{database}' NOT found. Available: {dbs}")
            # Try to create it
            try:
                cursor.execute(f"CREATE DATABASE {database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                print(f"✅ Created database '{database}'.")
            except Exception as e:
                print(f"❌ Failed to create database: {e}")

    conn.close()

    # 3. Test SQLAlchemy connection (used by app)
    db_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("✅ SQLAlchemy Connection successful!")
        
        # 4. Check tables
        result = conn.execute(text("SHOW TABLES;"))
        tables = [row[0] for row in result.fetchall()]
        print(f"Tables in '{database}': {tables}")
        
        expected_tables = ['stock_selected', 'stock_name', 'task_logs', 'stock_daily']
        missing = [t for t in expected_tables if t not in tables]
        if missing:
             print(f"⚠️ Missing tables: {missing}")
        else:
             print("✅ All expected tables found.")

except Exception as e:
    print(f"❌ Error: {e}")
