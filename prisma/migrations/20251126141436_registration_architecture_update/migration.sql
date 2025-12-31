/*
  Warnings:

  - You are about to drop the column `candidateEmail` on the `candidate_links` table. All the data in the column will be lost.
  - You are about to drop the column `otpCode` on the `candidate_links` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiry` on the `candidate_links` table. All the data in the column will be lost.
  - Added the required column `profileId` to the `candidate_links` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "candidate_links" DROP CONSTRAINT "candidate_links_parentUserId_fkey";

-- DropIndex
DROP INDEX "candidate_links_parentUserId_key";

-- AlterTable
ALTER TABLE "candidate_links" DROP COLUMN "candidateEmail",
DROP COLUMN "otpCode",
DROP COLUMN "otpExpiry",
ADD COLUMN     "childUserId" TEXT,
ADD COLUMN     "profileId" TEXT NOT NULL,
ADD COLUMN     "relationship" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'parent';

-- CreateIndex
CREATE INDEX "candidate_links_profileId_idx" ON "candidate_links"("profileId");

-- CreateIndex
CREATE INDEX "candidate_links_parentUserId_idx" ON "candidate_links"("parentUserId");

-- CreateIndex
CREATE INDEX "candidate_links_childUserId_idx" ON "candidate_links"("childUserId");

-- CreateIndex
CREATE INDEX "candidate_links_status_idx" ON "candidate_links"("status");

-- AddForeignKey
ALTER TABLE "candidate_links" ADD CONSTRAINT "candidate_links_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_links" ADD CONSTRAINT "candidate_links_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_links" ADD CONSTRAINT "candidate_links_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
