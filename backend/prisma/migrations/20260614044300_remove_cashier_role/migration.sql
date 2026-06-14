-- Migrate any existing CASHIER users to EMPLOYEE before the enum value is dropped
UPDATE "User" SET "role" = 'EMPLOYEE' WHERE "role" = 'CASHIER';

-- Recreate UserRole enum without CASHIER
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
DROP TYPE "UserRole_old";
