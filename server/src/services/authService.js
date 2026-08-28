const prisma = require('../config/prisma');
const { checkPhpassPassword, hashPassword } = require('../utils/phpass');
const { signToken } = require('../utils/jwt');

async function login(email, password, intent) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === 'DELETED' || user.deletedAt) {
    throw new Error('This user account has been disabled or deleted.');
  }

  const isValidPassword = checkPhpassPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  let finalRole = user.role;

  // EXPLICIT BECOME A HOST INTENT SECURITY HANDLER:
  // If intent === 'host' and existing user role is 'GUEST', upgrade role to 'HOST'
  if (intent === 'host' && user.role === 'GUEST') {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'HOST' }
    });
    finalRole = updatedUser.role;

    try {
      const emailService = require('./emailService');
      emailService.sendWelcomeEmail(updatedUser, 'HOST').catch(err => {
        console.error('[EMAIL SERVICE] Host upgrade email error:', err.message);
      });
    } catch (e) {
      console.error('[EMAIL SERVICE] Failed to send host upgrade email:', e.message);
    }
  }

  const token = signToken({ userId: user.id, role: finalRole });

  const { passwordHash, ...userWithoutPassword } = user;
  userWithoutPassword.role = finalRole;
  return { user: userWithoutPassword, token };
}

async function register(data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error('User email already registered');
  }

  const hashedPassword = hashPassword(data.password);

  // STRICT INTENT SECURITY REQUIREMENT:
  // Normal registration (intent != 'host') ALWAYS assigns 'GUEST' role.
  // Explicit Become a Host registration (intent === 'host') assigns 'HOST' role.
  const assignedRole = data.intent === 'host' ? 'HOST' : 'GUEST';

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || null,
      role: assignedRole
    }
  });

  try {
    const emailService = require('./emailService');
    emailService.sendWelcomeEmail(user, assignedRole).catch(err => {
      console.error('[EMAIL SERVICE] Registration welcome email error:', err.message);
    });
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger welcome email:', e.message);
  }

  const token = signToken({ userId: user.id, role: user.role });
  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      wpUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      bio: true,
      emailNewPropertyNotifications: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

async function updateProfile(userId, data) {
  const { firstName, lastName, phone, emailNewPropertyNotifications } = data;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(emailNewPropertyNotifications !== undefined && { emailNewPropertyNotifications: Boolean(emailNewPropertyNotifications) })
    },
    select: {
      id: true,
      wpUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      emailNewPropertyNotifications: true,
      createdAt: true
    }
  });
  return user;
}

module.exports = { login, register, getCurrentUser, updateProfile };
