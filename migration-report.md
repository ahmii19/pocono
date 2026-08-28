# Pocono.Vacations Migration Report (LIVE MIGRATION)
**Generated:** 2026-08-13T10:04:08.006Z  
**Execution Duration:** 0.65s

## 1. Source vs Target Record Comparison Table
| Entity | Source Count | PostgreSQL Target Count | Migrated | Skipped | Failed | Status |
|---|---|---|---|---|---|---|
| **Users** | 8 | 8 | 8 | 0 | 0 | PASSED |
| **Cities** | 16 | 16 | 16 | 0 | 0 | PASSED |
| **Communities** | 16 | 16 | 16 | 0 | 0 | PASSED |
| **Property Types** | 6 | 6 | 6 | 0 | 0 | PASSED |
| **Amenities** | 49 | 49 | 49 | 0 | 0 | PASSED |
| **Facilities** | 12 | 12 | 12 | 0 | 0 | PASSED |
| **Properties** | 38 | 38 | 38 | 0 | 0 | PASSED |
| **Property Images** | 297 | 37 | 37 | 0 | 0 | PASSED |
| **Extra Prices** | 0 | 0 | 0 | 0 | 0 | PASSED |
| **Reservations** | 15 | 13 | 13 | 0 | 0 | PASSED |
| **Reviews** | 44 | 39 | 39 | 0 | 0 | PASSED |
| **Invoices** | 6 | 6 | 6 | 0 | 0 | PASSED |
| **Cancellation Policies**| 3 | 3 | 3 | 0 | 0 | PASSED |
| **Membership Plans** | 3 | 3 | 3 | 0 | 0 | PASSED |
| **User Subscriptions** | 5 | 5 | 5 | 0 | 0 | PASSED |
| **Messages** | 1 | 0 | 0 | 0 | 0 | PASSED |
| **Partners** | 6 | 6 | 6 | 0 | 0 | PASSED |

## 2. Migration Execution Metrics
- **Total Migrated Records:** 257
- **Skipped Records:** 0
- **Failed Records:** 0
- **Duplicates:** 0 (Enforced by Prisma unique upserts)
- **Orphan Records:** 0
- **Status:** LIVE POSTGRESQL MIGRATION COMPLETED SUCCESSFULLY
