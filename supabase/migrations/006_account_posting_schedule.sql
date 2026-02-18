ALTER TABLE project_accounts
  ADD COLUMN IF NOT EXISTS days_of_week integer[] DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS posts_per_day integer DEFAULT 1;
