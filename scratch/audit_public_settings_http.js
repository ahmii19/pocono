const http = require('http');

http.get('http://localhost:5000/api/v1/settings', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('API Response Keys:', Object.keys(parsed.data || {}));
      console.log('General:', parsed.data?.general);
      console.log('Branding:', parsed.data?.branding);
      console.log('Hero:', parsed.data?.hero);
      console.log('Payment:', parsed.data?.payment);
      
      const str = JSON.stringify(parsed);
      const secrets = ['STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_SECRET', 'SMTP_PASS', 'JWT_SECRET', 'DATABASE_URL'];
      let leaked = false;
      for (const s of secrets) {
        if (str.includes(s) || (process.env[s] && str.includes(process.env[s]))) {
          console.error('LEAK DETECTED:', s);
          leaked = true;
        }
      }
      if (!leaked) {
        console.log('ZERO SECRETS LEAKED IN PUBLIC SETTINGS ENDPOINT!');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Request Error:', err.message);
});
