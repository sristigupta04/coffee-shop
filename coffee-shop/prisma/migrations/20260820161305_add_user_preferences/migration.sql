-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promoEmails" BOOLEAN NOT NULL DEFAULT true;
