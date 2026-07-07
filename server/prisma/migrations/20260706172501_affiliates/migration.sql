-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "planId" TEXT NOT NULL,
    "amountBrl" INTEGER NOT NULL DEFAULT 0,
    "amountSol" REAL NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'first',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "affiliateUserId" INTEGER NOT NULL,
    "referredUserId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "saleAmountBrl" INTEGER NOT NULL,
    "rate" REAL NOT NULL,
    "amountBrl" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "payoutId" INTEGER,
    CONSTRAINT "Commission_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Commission_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Commission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "affiliateUserId" INTEGER NOT NULL,
    "amountBrl" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "externalRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "Payout_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
INSERT INTO "new_User" ("affiliateId", "affiliateLink", "affiliateToken", "createdAt", "discordId", "discordToken", "email", "handle", "id", "name", "password", "role", "twoFactorEnabled", "twoFactorSecret") SELECT "affiliateId", "affiliateLink", "affiliateToken", "createdAt", "discordId", "discordToken", "email", "handle", "id", "name", "password", "role", "twoFactorEnabled", "twoFactorSecret" FROM "User";
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

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_paymentId_key" ON "Commission"("paymentId");

-- CreateIndex
CREATE INDEX "Commission_affiliateUserId_idx" ON "Commission"("affiliateUserId");

-- CreateIndex
CREATE INDEX "Payout_affiliateUserId_idx" ON "Payout"("affiliateUserId");
