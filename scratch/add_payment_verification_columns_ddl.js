const prisma = require('../server/src/config/prisma');

async function addPaymentVerificationColumns() {
  console.log('Adding payment verification enum and columns to PostgreSQL...');

  // 1. Create Enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "PaymentVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'VERIFIED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Add columns to reservations table if not exist
  await prisma.$executeRawUnsafe(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS payment_verification_status "PaymentVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
    ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_note TEXT,
    ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_rejected_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;
  `);

  // 3. Add index on payment_verification_status
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS reservations_payment_verification_status_idx ON reservations(payment_verification_status);
  `);

  // 4. Backfill existing historical reservations carefully:
  // - CONFIRMED or COMPLETED reservations -> VERIFIED
  // - PENDING reservations -> NOT_SUBMITTED (unless payment_proof_url is present, then SUBMITTED)
  await prisma.$executeRawUnsafe(`
    UPDATE reservations
    SET payment_verification_status = 'VERIFIED'
    WHERE status IN ('CONFIRMED', 'COMPLETED', 'PAID') AND payment_verification_status = 'NOT_SUBMITTED';
  `);

  console.log('Payment verification columns, indexes, and backfill completed successfully!');
}

addPaymentVerificationColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error adding payment verification columns:', err);
    process.exit(1);
  });
