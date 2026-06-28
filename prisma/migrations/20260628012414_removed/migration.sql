/*
  Warnings:

  - You are about to drop the column `endedAt` on the `InterviewSession` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `InterviewSession` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `InterviewSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewSession" DROP COLUMN "endedAt",
DROP COLUMN "startedAt",
DROP COLUMN "updatedAt";
