import sqlite3
import json

# Connect to the database
conn = sqlite3.connect('catch.db')
cursor = conn.cursor()

print("=" * 100)
print("DATABASE STRUCTURE")
print("=" * 100)

# Show table schema
cursor.execute('PRAGMA table_info(jobs)')
columns = cursor.fetchall()

print("\n[JOBS TABLE SCHEMA]")
print(f"{'ID':<5} {'Column Name':<25} {'Type':<15} {'NotNull':<10} {'DefaultVal':<15} {'PK':<5}")
print("-" * 100)
for col in columns:
    print(f"{col[0]:<5} {col[1]:<25} {col[2]:<15} {col[3]:<10} {str(col[4]):<15} {col[5]:<5}")

# Show all data
cursor.execute('SELECT * FROM jobs')
rows = cursor.fetchall()

print(f"\n[JOBS TABLE DATA] - Total: {len(rows)} records")
print("=" * 100)

if rows:
    col_names = [desc[1] for desc in columns]

    for i, row in enumerate(rows, 1):
        print(f"\n--- Record {i} ---")
        for j, col_name in enumerate(col_names):
            value = row[j]
            # Pretty print JSON fields
            if col_name in ['job_info', 'conditions', 'registration_info'] and value:
                try:
                    parsed = json.loads(value)
                    value = json.dumps(parsed, ensure_ascii=False, indent=2)
                except:
                    pass
            print(f"{col_name:.<25}: {value}")
        print("-" * 100)
else:
    print("No data found in jobs table")

# Show summary statistics
print("\n[SUMMARY STATISTICS]")
cursor.execute('SELECT category, COUNT(*) as count FROM jobs GROUP BY category')
category_counts = cursor.fetchall()
print("\nJobs by Category:")
for cat, count in category_counts:
    print(f"  {cat}: {count} records")

cursor.execute('SELECT COUNT(DISTINCT company) FROM jobs')
company_count = cursor.fetchone()[0]
print(f"\nUnique Companies: {company_count}")

cursor.execute('SELECT company, COUNT(*) as count FROM jobs GROUP BY company ORDER BY count DESC LIMIT 10')
top_companies = cursor.fetchall()
print("\nTop 10 Companies by Job Count:")
for company, count in top_companies:
    print(f"  {company}: {count} jobs")

conn.close()
