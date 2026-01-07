-- AlterTable
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "isProfilePicture" BOOLEAN NOT NULL DEFAULT false;
