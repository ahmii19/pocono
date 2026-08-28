const prisma = require('../config/prisma');

async function getMembershipPlans() {
  return prisma.membershipPlan.findMany({
    orderBy: { price: 'asc' }
  });
}

async function getUserSubscriptions(userId) {
  return prisma.userSubscription.findMany({
    where: { userId },
    include: { membershipPlan: true },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { getMembershipPlans, getUserSubscriptions };
