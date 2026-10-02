ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_transaction_type_check;
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_source_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_source_check CHECK (
    (
        transaction_type IN ('JOIN_BONUS', 'SEMESTER_ALLOCATION')
        AND amount > 0
        AND source_organization_id IS NOT NULL
        AND booking_id IS NULL
    )
    OR
    (
        transaction_type = 'BOOKING'
        AND amount < 0
        AND source_organization_id IS NULL
        AND booking_id IS NOT NULL
    )
    OR
    (
        transaction_type = 'BOOKING_REFUND'
        AND amount > 0
        AND source_organization_id IS NULL
        AND booking_id IS NOT NULL
    )
);
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_transaction_type_check CHECK (transaction_type IN ('JOIN_BONUS', 'BOOKING', 'BOOKING_REFUND', 'SEMESTER_ALLOCATION'));

-- CreateTable
CREATE TABLE "resource_ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_ratings_resource_idx" ON "resource_ratings"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_ratings_resource_user_unique" ON "resource_ratings"("resource_id", "user_id");

-- AddForeignKey
ALTER TABLE "resource_ratings" ADD CONSTRAINT "resource_ratings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_ratings" ADD CONSTRAINT "resource_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
