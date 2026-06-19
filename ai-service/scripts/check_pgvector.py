from pathlib import Path
import sys

import psycopg

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.db.pgvector_store import ensure_pgvector_ready


def main() -> None:
    try:
        result = ensure_pgvector_ready()
    except psycopg.Error as exc:
        print("pgvector check failed")
        print(f"reason: {exc}")
        print("hint: start PostgreSQL with Docker Desktop and `docker compose up -d postgres`.")
        raise SystemExit(1) from exc

    print("pgvector check ok")
    print(f"database: {result.database}")
    print(f"pgvector extension: {result.pgvector_extension}")
    print(f"sample id: {result.sample_id}")
    print(f"nearest label: {result.nearest_label}")
    print(f"distance: {result.distance:.6f}")


if __name__ == "__main__":
    main()
