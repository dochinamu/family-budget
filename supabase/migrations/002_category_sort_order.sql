-- categories 테이블에 sort_order 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 기존 카테고리에 순서 부여 (생성일 기준)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY household_id ORDER BY created_at) - 1 AS rn
  FROM categories
)
UPDATE categories SET sort_order = ordered.rn
FROM ordered WHERE categories.id = ordered.id;
