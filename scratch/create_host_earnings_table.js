const prisma = require('../server/src/config/prisma');

async function createHostEarningsTable() {
  console.log('Creating host_earnings table in PostgreSQL...');

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "HostEarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS host_earnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID UNIQUE NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      gross_amount DECIMAL(10, 2) NOT NULL,
      commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
      commission_amount DECIMAL(10, 2) NOT NULL,
      net_amount DECIMAL(10, 2) NOT NULL,
      status "HostEarningStatus" NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      available_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS host_earnings_reservation_id_idx ON host_earnings(reservation_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS host_earnings_host_id_idx ON host_earnings(host_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS host_earnings_property_id_idx ON host_earnings(property_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS host_earnings_status_idx ON host_earnings(status);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS host_earnings_created_at_idx ON host_earnings(created_at);`);

  console.log('host_earnings table and indexes successfully created in PostgreSQL!');
}

createHostEarningsTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error creating host_earnings table:', err);
    process.exit(1);
  });
