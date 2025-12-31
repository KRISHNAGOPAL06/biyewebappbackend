/*
  Warnings:

  - You are about to drop the column `durationDays` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `isInviteOnly` on the `plans` table. All the data in the column will be lost.
  - Added the required column `duration_days` to the `plans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plans" DROP COLUMN "durationDays",
DROP COLUMN "isInviteOnly",
ADD COLUMN     "duration_days" INTEGER NOT NULL,
ADD COLUMN     "is_invite_only" BOOLEAN NOT NULL DEFAULT false;
