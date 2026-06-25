ALTER TABLE "Product"
ADD COLUMN "imageUrlsJson" JSONB;

UPDATE "Product"
SET "imageUrlsJson" = CASE
  WHEN "imageUrl" IS NOT NULL AND LENGTH(TRIM("imageUrl")) > 0
    THEN jsonb_build_array("imageUrl")
  ELSE '[]'::jsonb
END
WHERE "imageUrlsJson" IS NULL;
