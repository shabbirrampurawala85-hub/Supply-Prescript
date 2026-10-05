import os
import snowflake.connector
from typing import Generator
# Environment Configuration
SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "xy12345.us-east-1")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER", "FASTAPI_SERVICE_ACCT")
SNOWFLAKE_PASSWORD = os.getenv("SNOWFLAKE_PASSWORD", "UseSecurePasswordOrKeypair")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "LOGISTICS_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "LOGISTICS_DW")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "WRITEBACK")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE", "LOGISTICS_WRITEBACK_ROLE")
def get_snowflake_conn() -> Generator:
 """FastAPI Context Dependency providing managed Snowflake connection."""
 conn = snowflake.connector.connect(
 user=SNOWFLAKE_USER,
 password=SNOWFLAKE_PASSWORD,
 account=SNOWFLAKE_ACCOUNT,
 warehouse=SNOWFLAKE_WAREHOUSE,
 database=SNOWFLAKE_DATABASE,
 schema=SNOWFLAKE_SCHEMA,
 role=SNOWFLAKE_ROLE
 )
 try:
 yield conn
 finally:
 conn.close()