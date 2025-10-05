import sqlite3
import json

# Connect to the database
conn = sqlite3.connect('catch.db')
cursor = conn.cursor()

print("=" * 100)
print("DATABASE SUMMARY")
print("=" * 100)

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print(f"\n[TOTAL TABLES]: {len(tables)}")
for table in tables:
    print(f"  - {table[0]}")

# For each table, show count and sample data
for table in tables:
    table_name = table[0]

    print(f"\n{'=' * 100}")
    print(f"TABLE: {table_name}")
    print(f"{'=' * 100}")

    # Get count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"\n[DATA COUNT]: {count} records")

    # Get table schema
    cursor.execute(f'PRAGMA table_info({table_name})')
    columns = cursor.fetchall()
    col_names = [col[1] for col in columns]

    print(f"\n[TABLE SCHEMA]:")
    print(f"{'ID':<5} {'Column Name':<25} {'Type':<15} {'NotNull':<10} {'DefaultVal':<15} {'PK':<5}")
    print("-" * 100)
    for col in columns:
        print(f"{col[0]:<5} {col[1]:<25} {col[2]:<15} {col[3]:<10} {str(col[4]):<15} {col[5]:<5}")

    # Get sample data (first 5 records)
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
    rows = cursor.fetchall()

    print(f"\n[SAMPLE DATA] (First 5 records):")
    print("-" * 100)

    for i, row in enumerate(rows, 1):
        print(f"\nRecord {i}:")
        for j, col_name in enumerate(col_names):
            value = row[j]
            # Pretty print JSON fields
            if col_name in ['job_info', 'conditions', 'registration_info'] and value:
                try:
                    parsed = json.loads(value)
                    value = json.dumps(parsed, ensure_ascii=False)
                except:
                    pass
            # Truncate long values
            if isinstance(value, str) and len(value) > 100:
                value = value[:97] + "..."
            print(f"  {col_name:<25}: {value}")
        print("-" * 100)

    # Show category distribution if category column exists
    if 'category' in col_names:
        cursor.execute(f"SELECT category, COUNT(*) as count FROM {table_name} GROUP BY category")
        category_counts = cursor.fetchall()
        print(f"\n[CATEGORY DISTRIBUTION]:")
        for cat, cnt in category_counts:
            print(f"  {cat}: {cnt} records")

    # Show company distribution if company column exists
    if 'company' in col_names:
        cursor.execute(f"SELECT COUNT(DISTINCT company) FROM {table_name}")
        unique_companies = cursor.fetchone()[0]
        print(f"\n[UNIQUE COMPANIES]: {unique_companies}")

        cursor.execute(f"SELECT company, COUNT(*) as count FROM {table_name} GROUP BY company ORDER BY count DESC LIMIT 10")
        top_companies = cursor.fetchall()
        print(f"\n[TOP 10 COMPANIES BY JOB COUNT]:")
        for company, cnt in top_companies:
            print(f"  {company}: {cnt} jobs")

conn.close()

print(f"\n{'=' * 100}")
print("END OF REPORT")
print(f"{'=' * 100}")
