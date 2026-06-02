-- AlterTable: Thêm cột accessLevel vào bảng Follower
ALTER TABLE "Follower" ADD COLUMN "accessLevel" TEXT NOT NULL DEFAULT 'basic';
