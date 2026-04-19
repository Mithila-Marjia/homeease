-- Run in Supabase SQL Editor to confirm tables exist in schema "public".
SELECT
  table_name
FROM
  information_schema.tables
WHERE
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
  table_name;
