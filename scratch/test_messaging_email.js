require('dotenv').config();
const emailService = require('../server/src/services/emailService');

async function testMessagingNotification() {
  console.log('Testing Guest <-> Host Messaging Notification Email...');
  const res = await emailService.sendNewMessageNotificationEmail({
    recipient: { firstName: 'Ahmed', email: 'revoluxemindset@gmail.com' },
    sender: { firstName: 'Host', lastName: 'Owner' },
    property: { title: 'Pocono Lake Chalet' },
    messageSnippet: 'Hi Ahmed, looking forward to your stay! Let me know if you need early check-in.',
    threadId: 'thread-1234-test'
  });

  if (res) {
    console.log('✅ Messaging Email Notification PASS!');
  } else {
    console.log('❌ Messaging Email Notification FAIL!');
  }
}

testMessagingNotification();
