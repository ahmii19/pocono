const prisma = require('../config/prisma');

/**
 * Get threads for the current user based on their role
 */
async function getUserThreads(user) {
  const userId = typeof user === 'object' ? user.id : user;
  const userRole = typeof user === 'object' ? user.role : 'GUEST';

  let whereClause = {};

  if (userRole === 'ADMIN') {
    // Admin sees ALL threads across all properties
    whereClause = {};
  } else if (userRole === 'HOST') {
    // Host sees threads for properties currently assigned to them OR where they are receiver/sender
    whereClause = {
      OR: [
        { property: { hostId: userId } },
        { receiverId: userId },
        { senderId: userId }
      ]
    };
  } else {
    // Guest sees threads they created
    whereClause = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };
  }

  const threads = await prisma.messageThread.findMany({
    where: whereClause,
    orderBy: { lastMessageAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          hostId: true,
          address: true,
          host: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          }
        }
      },
      sender: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
      },
      receiver: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  // Calculate unread count for each thread
  const enrichedThreads = await Promise.all(
    threads.map(async (t) => {
      const unreadCount = await prisma.message.count({
        where: {
          threadId: t.id,
          senderId: { not: userId },
          readAt: null
        }
      });
      return {
        ...t,
        unreadCount
      };
    })
  );

  return enrichedThreads;
}

/**
 * Get a single thread with authorization checks and auto-mark-as-read
 */
async function getThreadById(threadId, user) {
  const userId = typeof user === 'object' ? user.id : user;
  const userRole = typeof user === 'object' ? user.role : 'GUEST';

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          hostId: true,
          address: true,
          host: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          }
        }
      },
      sender: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
      },
      receiver: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true }
          }
        }
      }
    }
  });

  if (!thread) {
    const error = new Error('Message thread not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization Check
  if (userRole === 'HOST') {
    const isAssignedHost = thread.property && thread.property.hostId === userId;
    const isParticipant = thread.senderId === userId || thread.receiverId === userId;

    if (!isAssignedHost && !isParticipant) {
      const error = new Error('Forbidden: You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }
  } else if (userRole === 'GUEST') {
    const isParticipant = thread.senderId === userId || thread.receiverId === userId;
    if (!isParticipant) {
      const error = new Error('Forbidden: You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }
  }
  // ADMIN has global access to all threads

  // Mark unread messages sent by others as read
  await prisma.message.updateMany({
    where: {
      threadId,
      senderId: { not: userId },
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return thread;
}

/**
 * Send a message for a property (find or create thread based on propertyId + senderId)
 */
async function sendMessage(data, senderUser) {
  const senderId = typeof senderUser === 'object' ? senderUser.id : senderUser;
  const { propertyId } = data;
  const messageText = data.messageText || data.message || data.content;

  if (!propertyId) {
    const error = new Error('propertyId is required to send a property message');
    error.statusCode = 400;
    throw error;
  }

  if (!messageText || !String(messageText).trim()) {
    const error = new Error('messageText is required');
    error.statusCode = 400;
    throw error;
  }

  // Verify property exists
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { host: true }
  });

  if (!property) {
    const error = new Error('Property not found');
    error.statusCode = 404;
    throw error;
  }

  // Determine Primary Recipient based strictly on CURRENT property host assignment from PostgreSQL.
  // SECURITY: Any client-supplied data.receiverId is EXPLICITLY IGNORED to prevent forgery.
  let recipientId = property.hostId;

  // Check if assigned host is missing or is an ADMIN
  if (!recipientId) {
    const primaryAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (primaryAdmin) {
      recipientId = primaryAdmin.id;
    }
  } else {
    // If assigned user is an ADMIN, keep recipientId as admin ID
    const hostUser = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    if (!hostUser || hostUser.role === 'ADMIN') {
      const primaryAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (primaryAdmin) {
        recipientId = primaryAdmin.id;
      }
    }
  }

  // Duplicate Thread Prevention: Find existing thread for (propertyId + senderId)
  let thread = await prisma.messageThread.findFirst({
    where: {
      propertyId,
      senderId
    }
  });

  const now = new Date();

  if (thread) {
    // Reuse existing thread and update recipient to current property host if reassigned
    thread = await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        receiverId: recipientId,
        lastMessageAt: now,
        updatedAt: now
      }
    });
  } else {
    // Create ONE new thread for guest + property
    thread = await prisma.messageThread.create({
      data: {
        propertyId,
        senderId,
        receiverId: recipientId,
        lastMessageAt: now,
        updatedAt: now
      }
    });
  }

  // Create message inside thread
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId,
      messageText: String(messageText).trim()
    },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true }
      }
    }
  });

  try {
    const emailService = require('./emailService');
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, firstName: true, lastName: true, email: true } });
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { title: true } });
    if (recipient) {
      emailService.sendNewMessageNotificationEmail({
        recipient,
        sender: message.sender,
        property,
        messageSnippet: message.messageText,
        threadId: thread.id
      }).catch(err => console.error('[EMAIL SERVICE] sendNewMessageNotificationEmail error:', err.message));
    }
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger message email:', e.message);
  }

  return {
    threadId: thread.id,
    message
  };
}

/**
 * Reply in an existing conversation thread
 */
async function replyToThread(threadId, messageText, senderUser) {
  if (!messageText || !String(messageText).trim()) {
    const error = new Error('messageText is required');
    error.statusCode = 400;
    throw error;
  }

  // Validate thread access
  const thread = await getThreadById(threadId, senderUser);

  const now = new Date();

  // Create message in thread
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: senderUser.id,
      messageText: String(messageText).trim()
    },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true }
      }
    }
  });

  // Update thread lastMessageAt
  await prisma.messageThread.update({
    where: { id: threadId },
    data: {
      lastMessageAt: now,
      updatedAt: now
    }
  });

  try {
    const emailService = require('./emailService');
    const recipientId = senderUser.id === thread.senderId ? thread.receiverId : thread.senderId;
    const recipient = recipientId ? await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, firstName: true, lastName: true, email: true } }) : null;
    if (recipient) {
      emailService.sendNewMessageNotificationEmail({
        recipient,
        sender: message.sender,
        property: thread.property,
        messageSnippet: message.messageText,
        threadId: thread.id
      }).catch(err => console.error('[EMAIL SERVICE] sendNewMessageNotificationEmail reply error:', err.message));
    }
  } catch (e) {
    console.error('[EMAIL SERVICE] Failed to trigger reply message email:', e.message);
  }

  return message;
}

/**
 * Mark thread messages as read
 */
async function markThreadAsRead(threadId, user) {
  await getThreadById(threadId, user); // Validates authorization

  await prisma.message.updateMany({
    where: {
      threadId,
      senderId: { not: user.id },
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return { success: true };
}

module.exports = {
  getUserThreads,
  getThreadById,
  sendMessage,
  replyToThread,
  markThreadAsRead
};
