import sqlite3
import os
from pathlib import Path
from flask import current_app

def get_db_connection():
    conn = sqlite3.connect(current_app.config['DATABASE'], detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if os.path.exists(current_app.config['DATABASE']):
        print("Database already exists, skipping initialization")
        return
    
    schema_path = Path('config/init.schema')
    if schema_path.exists():
        with open(schema_path, 'r') as f:
            schema = f.read()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.executescript(schema)
            conn.commit()
            print("Database initialized successfully")
        except sqlite3.Error as e:
            print(f"Error initializing database: {e}")
        finally:
            conn.close()