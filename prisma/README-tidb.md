# TiDB migration constraints

This project runs on **TiDB Cloud Serverless**, which is MySQL-compatible but not
MySQL. Three migrations had to be written differently. If you generate a
migration with `prisma migrate dev` and it fails on TiDB, check this list first.

## 1. Cannot retype or drop a PRIMARY KEY column

TiDB builds primary keys as a **CLUSTERED** index. `ALTER TABLE ... MODIFY` on a
PK column fails with:

```
8200: Unsupported modify column: this column has primary key flag
8200: Unsupported drop primary key when the table is using clustered index
```

Dropping AUTO_INCREMENT separately also fails without `@@tidb_allow_remove_auto_inc`.

**Workaround** — rebuild the table (`20260701090000_customer_id_string`):

```sql
CREATE TABLE `X_new` (... desired types ...);
INSERT INTO `X_new` SELECT CAST(`id` AS CHAR), ... FROM `X`;
DROP TABLE `X`;
RENAME TABLE `X_new` TO `X`;
```

Drop dependent foreign keys first and restore them afterwards.

## 2. No multi-column FULLTEXT index

```
8200: FULLTEXT index must specify one column name
```

## 3. FULLTEXT needs a TiFlash columnar replica

Even a single-column FULLTEXT index fails on Serverless:

```
8200: Unsupported add columnar index: columnar replica must exist to create
      fulltext index
```

**Resolution** — no FULLTEXT indexes exist in this database, by design.
TiDB parses but cannot *execute* `MATCH ... AGAINST`
(`UnknownType: *ast.MatchAgainst`), so the indexes would be dead weight.
`src/server/products/search.ts` searches with `LIKE` plus a synthesised
relevance score, which also sidesteps the FULLTEXT minimum-token-length floor
so short terms and Bangla substrings match.

Do not re-add `@@fulltext(...)` to `schema.prisma` unless the cluster gains a
TiFlash replica *and* the search code moves back to `MATCH ... AGAINST`.

## Harmless drift

`prisma migrate diff` reports added indexes on FK columns (`OrderItem.productId`,
`ProductReview.customerId`, etc.). TiDB creates these implicitly for foreign
keys. This is cosmetic — no action needed.
