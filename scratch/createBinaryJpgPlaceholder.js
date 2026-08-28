const fs = require('fs');
const path = require('path');

// 1x1 or 800x600 minimal valid JPEG binary buffer or base64 decoded JPEG image
// Valid baseline JPEG image binary
const base64Jpeg = 
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAHgA8ABARIAAxEB/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const buffer = Buffer.from(base64Jpeg, 'base64');

// Write valid JPEG binary to client/public/placeholder.jpg
const jpgPath = path.join(__dirname, '../client/public/placeholder.jpg');
fs.writeFileSync(jpgPath, buffer);

console.log('Successfully wrote valid binary JPEG placeholder to:', jpgPath);
