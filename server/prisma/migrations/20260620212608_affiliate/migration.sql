-- Programa de afiliados (Rewardful)
ALTER TABLE "User" ADD COLUMN "affiliateId" TEXT;
ALTER TABLE "User" ADD COLUMN "affiliateToken" TEXT;
ALTER TABLE "User" ADD COLUMN "affiliateLink" TEXT;
CREATE UNIQUE INDEX "User_affiliateId_key" ON "User"("affiliateId");
CREATE UNIQUE INDEX "User_affiliateToken_key" ON "User"("affiliateToken");
