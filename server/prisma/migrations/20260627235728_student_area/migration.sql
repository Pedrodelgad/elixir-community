-- Área do Aluno
CREATE TABLE "Category" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "parentId" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Content" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "categoryId" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'video',
  "title" TEXT NOT NULL,
  "url" TEXT,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Content_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Content_categoryId_idx" ON "Content"("categoryId");
