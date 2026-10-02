-- AlterTable
ALTER TABLE "notification_deliveries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT;

-- AlterTable
ALTER TABLE "web_push_subscriptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "resources_owner_organization_id_idx" ON "resources"("owner_organization_id");

-- RenameForeignKey
ALTER TABLE "organizations" RENAME CONSTRAINT "organizations_parent_same_root_fk" TO "organizations_parent_id_root_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "organizations" RENAME CONSTRAINT "organizations_root_fk" TO "organizations_root_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "point_transactions" RENAME CONSTRAINT "point_transactions_booking_user_fk" TO "point_transactions_booking_id_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "resource_allowed_organizations" RENAME CONSTRAINT "resource_allowed_organizations_org_same_root_fk" TO "resource_allowed_organizations_organization_id_root_organi_fkey";

-- RenameForeignKey
ALTER TABLE "resource_allowed_organizations" RENAME CONSTRAINT "resource_allowed_organizations_resource_same_root_fk" TO "resource_allowed_organizations_resource_id_root_organizati_fkey";

-- RenameForeignKey
ALTER TABLE "resources" RENAME CONSTRAINT "resources_owner_same_root_fk" TO "resources_owner_organization_id_root_organization_id_fkey";
