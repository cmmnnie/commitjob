import requests
import json
import time

BASE_URL = "http://127.0.0.1:3000"

def scrape_jobs():
    print("Starting scraping process...")

    # Check current DB status
    print("\n1. Checking current DB status...")
    response = requests.get(f"{BASE_URL}/api/db/homepage")
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            results = data.get('results', {})
            total = results.get('total_unique_jobs', 0)
            print(f"   Current DB has {total} jobs")

    # Try to scrape new jobs
    print("\n2. Attempting to scrape jobs (max_pages=2 to get ~40 jobs)...")
    response = requests.get(f"{BASE_URL}/api/extract-all-jobs?max_pages=2", timeout=300)

    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            results = data.get('results', {})
            it_count = results.get('total_it_jobs', 0)
            bd_count = results.get('total_bigdata_ai_jobs', 0)
            unique_count = results.get('total_unique_jobs', 0)

            print(f"\n[SUCCESS] Scraping completed successfully!")
            print(f"   - IT Jobs: {it_count}")
            print(f"   - BigData/AI Jobs: {bd_count}")
            print(f"   - Total Jobs: {it_count + bd_count}")
            print(f"   - Unique Jobs (after deduplication): {unique_count}")

            return True
        else:
            print(f"\n[FAILED] Scraping failed: {data.get('message')}")
            return False
    else:
        print(f"\n[FAILED] Request failed with status code: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

if __name__ == "__main__":
    try:
        success = scrape_jobs()
        if success:
            print("\n[SUCCESS] Job scraping process completed successfully!")
        else:
            print("\n[FAILED] Job scraping process failed. Please check if the Flask server is running and initialized.")
    except Exception as e:
        print(f"\n[ERROR] Error occurred: {str(e)}")
