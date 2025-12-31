/*
  Warnings:

  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "ancestralHome" TEXT,
ADD COLUMN     "childrenCount" INTEGER,
ADD COLUMN     "childrenStatus" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dietPreference" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "drinkingHabit" TEXT,
ADD COLUMN     "exerciseRoutine" TEXT,
ADD COLUMN     "fatherOccupation" TEXT,
ADD COLUMN     "fieldOfStudy" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "highestEducation" TEXT,
ADD COLUMN     "hobbies" TEXT[],
ADD COLUMN     "languagesKnown" TEXT[],
ADD COLUMN     "livingSituation" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "motherOccupation" TEXT,
ADD COLUMN     "petPreference" TEXT,
ADD COLUMN     "prefAgeRangeFrom" INTEGER,
ADD COLUMN     "prefAgeRangeTo" INTEGER,
ADD COLUMN     "prefChildrenCount" INTEGER,
ADD COLUMN     "prefChildrenStatus" TEXT,
ADD COLUMN     "prefDietPreference" TEXT,
ADD COLUMN     "prefDrinkingHabit" TEXT,
ADD COLUMN     "prefEducation" TEXT,
ADD COLUMN     "prefHeightFrom" INTEGER,
ADD COLUMN     "prefHeightTo" INTEGER,
ADD COLUMN     "prefLocation" JSONB,
ADD COLUMN     "prefMaritalStatus" TEXT,
ADD COLUMN     "prefProfession" TEXT,
ADD COLUMN     "prefReligion" TEXT,
ADD COLUMN     "prefSmokingHabit" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "siblingsCount" INTEGER,
ADD COLUMN     "smokingHabit" TEXT,
ADD COLUMN     "weight" INTEGER;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "fullName",
ADD COLUMN     "candidateEmail" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "creatingFor" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "lookingFor" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'self',
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "candidate_links" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "otpCode" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "participants" TEXT[],
    "lastMsgAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_links_parentUserId_key" ON "candidate_links"("parentUserId");

-- CreateIndex
CREATE INDEX "threads_lastMsgAt_idx" ON "threads"("lastMsgAt");

-- CreateIndex
CREATE INDEX "messages_threadId_createdAt_idx" ON "messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_fromUserId_idx" ON "messages"("fromUserId");

-- CreateIndex
CREATE INDEX "messages_toUserId_idx" ON "messages"("toUserId");

-- AddForeignKey
ALTER TABLE "candidate_links" ADD CONSTRAINT "candidate_links_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
