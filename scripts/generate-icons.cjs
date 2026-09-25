const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-node PNG generator
function createPNG(width, height, pixelShader) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // deflate compression
  ihdrData.writeUInt8(0, 11); // filter standard
  ihdrData.writeUInt8(0, 12); // no interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter type 0 (None)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, body, crcBuf]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

function renderHelicopterIcon(x, y, width, height, isMaskable = false) {
  const nx = x / width;
  const ny = y / height;
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background
  let r = 15, g = 23, b = 42, a = 255; // #0f172a
  
  if (!isMaskable) {
    // Rounded corner check
    const rCorner = 0.2;
    const qx = Math.max(0, Math.abs(dx) - (0.5 - rCorner));
    const qy = Math.max(0, Math.abs(dy) - (0.5 - rCorner));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > rCorner) {
      return [0, 0, 0, 0];
    }
  }

  // Radar circular rings
  if (Math.abs(dist - 0.42) < 0.008 || Math.abs(dist - 0.28) < 0.006 || Math.abs(dist - 0.14) < 0.006) {
    r = 2; g = 132; b = 199;
  }
  // Crosshairs
  if ((Math.abs(dx) < 0.004 || Math.abs(dy) < 0.004) && dist < 0.46) {
    r = 56; g = 189; b = 248;
  }

  // Rotor wash disc
  if (Math.abs(dist - 0.35) < 0.015) {
    r = 56; g = 189; b = 248;
  }

  // Rotor blades (horizontal & vertical)
  if ((Math.abs(dy) < 0.012 && Math.abs(dx) < 0.38) || (Math.abs(dx) < 0.012 && Math.abs(dy) < 0.38)) {
    r = 248; g = 250; b = 252;
  }

  // Tail boom
  if (Math.abs(dx) < 0.016 && dy > 0 && dy < 0.32) {
    r = 203; g = 213; b = 225;
  }
  // Tail rotor
  if (Math.abs(dy - 0.32) < 0.01 && Math.abs(dx) < 0.06) {
    r = 239; g = 68; b = 68;
  }

  // Skids
  if ((Math.abs(dx - 0.1) < 0.01 || Math.abs(dx + 0.1) < 0.01) && Math.abs(dy) < 0.12) {
    r = 100; g = 116; b = 139;
  }
  if ((Math.abs(dy - 0.05) < 0.008 || Math.abs(dy + 0.05) < 0.008) && Math.abs(dx) < 0.1) {
    r = 100; g = 116; b = 139;
  }

  // Fuselage (ellipse)
  const fdx = dx / 0.08;
  const fdy = (dy + 0.02) / 0.13;
  if (fdx * fdx + fdy * fdy <= 1.0) {
    // Orange-gold helicopter body
    r = 245; g = 158; b = 11;
    // Cockpit windshield
    if (dy < -0.01 && fdx * fdx + fdy * fdy < 0.7) {
      r = 2; g = 132; b = 199;
    }
  }

  // Center hub
  if (dist < 0.032) {
    r = 15; g = 23; b = 42;
  }
  if (dist < 0.012) {
    r = 245; g = 158; b = 11;
  }

  // Emergency Cross badge in lower right
  const badgeDx = nx - 0.78;
  const badgeDy = ny - 0.78;
  const badgeDist = Math.sqrt(badgeDx * badgeDx + badgeDy * badgeDy);
  if (badgeDist < 0.12) {
    r = 239; g = 68; b = 68;
    if ((Math.abs(badgeDx) < 0.03 && Math.abs(badgeDy) < 0.08) || (Math.abs(badgeDy) < 0.03 && Math.abs(badgeDx) < 0.08)) {
      r = 255; g = 255; b = 255;
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Generate 192x192
const pwa192 = createPNG(192, 192, (x, y, w, h) => renderHelicopterIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// Generate 512x512
const pwa512 = createPNG(512, 512, (x, y, w, h) => renderHelicopterIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// Generate Maskable 512x512
const pwaMaskable512 = createPNG(512, 512, (x, y, w, h) => renderHelicopterIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable512);

// Generate apple-touch-icon 180x180
const appleIcon = createPNG(180, 180, (x, y, w, h) => renderHelicopterIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Copy 192 as favicon.ico
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pwa192);

console.log('Successfully generated all PWA icons!');
