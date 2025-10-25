-- Add company_logo_url column to catch_companies table
-- This migration adds a column to store company logo image URLs scraped from Catch.co.kr

ALTER TABLE catch_companies
ADD COLUMN IF NOT EXISTS company_logo_url VARCHAR(1024) AFTER company_url;
