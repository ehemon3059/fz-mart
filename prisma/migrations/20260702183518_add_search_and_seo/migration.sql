-- AlterTable
ALTER TABLE `category` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `page` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- CreateIndex (intentionally omitted)
--
-- The original migration created FULLTEXT index(es) on Product(name, description).
-- TiDB cannot build them on this cluster:
--   1. a multi-column FULLTEXT index is rejected outright, and
--   2. single-column FULLTEXT indexes require a TiFlash columnar replica
--      ("columnar replica must exist to create fulltext index"), which is not
--      provisioned on TiDB Serverless here.
--
-- Nothing in the application reads these indexes: TiDB parses but cannot
-- execute MATCH ... AGAINST, so src/server/products/search.ts deliberately
-- searches with LIKE plus a synthesised relevance score. Creating them would
-- therefore add cost and a hard dependency on TiFlash for no query benefit.
--
-- schema.prisma still declares @@fulltext([name]) / @@fulltext([description]).
-- Those are not reflected in the database; `prisma migrate diff` will report
-- them as drift. See prisma/README-tidb.md.
