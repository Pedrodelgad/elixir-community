-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discordId" TEXT,
    "discordToken" TEXT,
    "affiliateId" TEXT,
    "affiliateToken" TEXT,
    "affiliateLink" TEXT,
    "refCode" TEXT,
    "refClicks" INTEGER NOT NULL DEFAULT 0,
    "referredById" INTEGER,
    "commissionRate" REAL,
    "payoutMethod" TEXT,
    "payoutDest" TEXT,
    "withdrawKeyEnc" TEXT,
    "withdrawKeyHash" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("affiliateId", "affiliateLink", "affiliateToken", "commissionRate", "createdAt", "discordId", "discordToken", "email", "handle", "id", "name", "password", "payoutDest", "payoutMethod", "refCode", "referredById", "role", "twoFactorEnabled", "twoFactorSecret", "withdrawKeyEnc", "withdrawKeyHash") SELECT "affiliateId", "affiliateLink", "affiliateToken", "commissionRate", "createdAt", "discordId", "discordToken", "email", "handle", "id", "name", "password", "payoutDest", "payoutMethod", "refCode", "referredById", "role", "twoFactorEnabled", "twoFactorSecret", "withdrawKeyEnc", "withdrawKeyHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_affiliateId_key" ON "User"("affiliateId");
CREATE UNIQUE INDEX "User_affiliateToken_key" ON "User"("affiliateToken");
CREATE UNIQUE INDEX "User_refCode_key" ON "User"("refCode");
CREATE UNIQUE INDEX "User_withdrawKeyHash_key" ON "User"("withdrawKeyHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
