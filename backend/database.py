import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "")
PROMPTS_DIR = Path(__file__).parent / "prompts"

# Prompt definitions with display names
PROMPT_DEFINITIONS = [
    {"key": "step1_analyze", "name": "Step 1: Diagram Analysis", "file": "step1_analyze.txt"},
    {"key": "step2_app_desc", "name": "Step 2A: Application Description", "file": "step2_A_application_description.txt"},
    {"key": "step2_features", "name": "Step 2B: Key Features", "file": "step2_B_key_features.txt"},
    {"key": "step2_components", "name": "Step 2C: In-Scope Components", "file": "step2_C_in_scope_components.txt"},
    {"key": "step3_baseline", "name": "Step 3: STRIDE Baseline", "file": "step3_baseline.txt"},
    {"key": "step3_network", "name": "Step 3: Network Security", "file": "step3_network.txt"},
    {"key": "step3_aws", "name": "Step 3: AWS Cloud Security", "file": "step3_aws.txt"},
]


def get_connection():
    """Get database connection."""
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def init_database():
    """Initialize database schema and seed default prompts."""
    conn = get_connection()
    if not conn:
        print("[DB] No DATABASE_URL configured, using file-based prompts")
        return False

    try:
        with conn.cursor() as cur:
            # Create prompts table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS prompts (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    content TEXT NOT NULL,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Seed default prompts if table is empty
            cur.execute("SELECT COUNT(*) as count FROM prompts")
            count = cur.fetchone()["count"]

            if count == 0:
                print("[DB] Seeding default prompts...")
                for prompt_def in PROMPT_DEFINITIONS:
                    file_path = PROMPTS_DIR / prompt_def["file"]
                    if file_path.exists():
                        content = file_path.read_text()
                        cur.execute(
                            """INSERT INTO prompts (key, name, content, is_default)
                               VALUES (%s, %s, %s, TRUE)""",
                            (prompt_def["key"], prompt_def["name"], content)
                        )
                print(f"[DB] Seeded {len(PROMPT_DEFINITIONS)} prompts")

            conn.commit()
            print("[DB] Database initialized successfully")
            return True
    except Exception as e:
        print(f"[DB] Error initializing database: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def get_all_prompts():
    """Get all prompts from database or files."""
    conn = get_connection()

    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT key, name, content, is_default, updated_at FROM prompts ORDER BY id")
                prompts = cur.fetchall()
                return [dict(p) for p in prompts]
        except Exception as e:
            print(f"[DB] Error fetching prompts: {e}")
        finally:
            conn.close()

    # Fallback to file-based prompts
    prompts = []
    for prompt_def in PROMPT_DEFINITIONS:
        file_path = PROMPTS_DIR / prompt_def["file"]
        content = file_path.read_text() if file_path.exists() else ""
        prompts.append({
            "key": prompt_def["key"],
            "name": prompt_def["name"],
            "content": content,
            "is_default": True,
            "updated_at": None
        })
    return prompts


def get_prompt(key: str) -> str:
    """Get a single prompt by key."""
    conn = get_connection()

    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT content FROM prompts WHERE key = %s", (key,))
                result = cur.fetchone()
                if result:
                    return result["content"]
        except Exception as e:
            print(f"[DB] Error fetching prompt {key}: {e}")
        finally:
            conn.close()

    # Fallback to file
    for prompt_def in PROMPT_DEFINITIONS:
        if prompt_def["key"] == key:
            file_path = PROMPTS_DIR / prompt_def["file"]
            if file_path.exists():
                return file_path.read_text()
    return ""


def update_prompt(key: str, content: str) -> bool:
    """Update a prompt in the database."""
    conn = get_connection()
    if not conn:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE prompts
                   SET content = %s, is_default = FALSE, updated_at = CURRENT_TIMESTAMP
                   WHERE key = %s""",
                (content, key)
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"[DB] Error updating prompt {key}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def reset_prompt(key: str) -> bool:
    """Reset a prompt to its default value."""
    conn = get_connection()
    if not conn:
        return False

    # Find the default content from file
    default_content = ""
    for prompt_def in PROMPT_DEFINITIONS:
        if prompt_def["key"] == key:
            file_path = PROMPTS_DIR / prompt_def["file"]
            if file_path.exists():
                default_content = file_path.read_text()
            break

    if not default_content:
        return False

    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE prompts
                   SET content = %s, is_default = TRUE, updated_at = CURRENT_TIMESTAMP
                   WHERE key = %s""",
                (default_content, key)
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"[DB] Error resetting prompt {key}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
