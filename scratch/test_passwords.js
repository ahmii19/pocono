const nodemailer = require('nodemailer');

async function test(pass) {
  console.log('Testing password string...');
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: 'ahmedkhanghaleja4@gmail.com', pass }
  });
  try {
    await t.verify();
    console.log('✅ SUCCESS for this password!');
    return true;
  } catch (e) {
    console.log('❌ FAIL:', e.message);
    return false;
  }
}

async function run() {
  console.log('--- Testing Password 1 ---');
  await test('trxvossqlremidwi');
  console.log('\n--- Testing Password 2 ---');
  await test('qaqtebczbrmikuja');
}

run();
