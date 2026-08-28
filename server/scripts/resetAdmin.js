const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  const newPassword = process.argv[2] || 'AdminPass123!';
  
  // Find admin user or highest privileged user
  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    // If no admin user exists, pick the first user and elevate to ADMIN
    admin = await prisma.user.findFirst({
      orderBy: { id: 'asc' }
    });
    if (admin) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: 'ADMIN' }
      });
      console.log(`Elevated user ${admin.email} to ADMIN role.`);
    }
  }

  if (!admin) {
    console.error('No user accounts found in PostgreSQL database!');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log(`\n==================================================`);
  console.log(`ADMIN PASSWORD RESET SUCCESSFUL`);
  console.log(`==================================================`);
  console.log(`Admin User Email: ${admin.email}`);
  console.log(`Admin Name:       ${admin.firstName} ${admin.lastName}`);
  console.log(`Admin User Role:   ADMIN (Preserved)`);
  console.log(`New Password:     ${newPassword}`);
  console.log(`==================================================\n`);
}

main()
  .catch(err => {
    console.error('Error resetting admin password:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
