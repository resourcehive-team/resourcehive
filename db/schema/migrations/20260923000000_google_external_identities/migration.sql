ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE "external_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ,

    CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "external_identities"
  ADD CONSTRAINT "external_identities_provider_check" CHECK ("provider" IN ('GOOGLE'));

CREATE UNIQUE INDEX "external_identities_provider_subject_unique"
  ON "external_identities" ("provider", "provider_subject");
CREATE UNIQUE INDEX "external_identities_user_provider_unique"
  ON "external_identities" ("user_id", "provider");
CREATE INDEX "external_identities_user_id_idx"
  ON "external_identities" ("user_id");

ALTER TABLE "external_identities"
  ADD CONSTRAINT "external_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
