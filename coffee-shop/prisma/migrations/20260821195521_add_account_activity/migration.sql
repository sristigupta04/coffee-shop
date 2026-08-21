/*
  Warnings:

  - You are about to drop the column `activityType` on the `AccountActivity` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `AccountActivity` table. All the data in the column will be lost.
  - You are about to drop the column `cardHolder` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `cvv` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `PaymentMethod` table. All the data in the column will be lost.
  - Added the required column `action` to the `AccountActivity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `AccountActivity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AccountActivity" DROP COLUMN "activityType",
DROP COLUMN "description",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "details" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "cardHolder",
DROP COLUMN "cvv",
DROP COLUMN "expiryDate",
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
