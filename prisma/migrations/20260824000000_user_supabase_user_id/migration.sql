-- AlterTable
ALTER TABLE `User` ADD COLUMN `supabaseUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_supabaseUserId_key` ON `User`(`supabaseUserId`);
