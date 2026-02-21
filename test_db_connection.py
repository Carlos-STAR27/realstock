import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

host = "localhost"
port = 3306 # Trying 3306 since 4000 is closed
user = "root"
password = "showlang"
database = "cn_stock"

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database
    )
    print("Successfully connected to MySQL on port 3306")
    conn.close()
except Exception as e:
    print(f"Failed to connect: {e}")
