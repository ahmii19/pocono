const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEDIA_ROOT = path.resolve(__dirname, '../../../client/public/wp-content/uploads');

async function getPropertyMedia(propertyId) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, title: true, slug: true }
  });
  if (!property) throw new Error('Property not found');

  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { displayOrder: 'asc' }
  });

  return {
    property,
    imageCount: images.length,
    images
  };
}

async function getAllMedia(params = {}) {
  const { search, propertyId, page = 1, limit = 50 } = params;
  const where = {};

  if (propertyId) {
    where.propertyId = propertyId;
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { imageUrl: { contains: searchTerm, mode: 'insensitive' } },
      { property: { title: { contains: searchTerm, mode: 'insensitive' } } }
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const take = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * take;

  const [total, images] = await Promise.all([
    prisma.propertyImage.count({ where }),
    prisma.propertyImage.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        property: { select: { id: true, title: true, slug: true } }
      }
    })
  ]);

  return {
    total,
    page: pageNum,
    limit: take,
    totalPages: Math.ceil(total / take),
    data: images
  };
}

async function uploadPropertyImage(propertyId, filePayload, user) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error('Property not found');

  if (property.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const { filename, mimeType, base64Data } = filePayload;
  if (!filename || !mimeType || !base64Data) {
    throw new Error('Missing file data (filename, mimeType, and base64Data are required)');
  }

  // 1. Extension & MIME Validation
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedExts.includes(ext) || !allowedMimes.includes(mimeType.toLowerCase())) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
  }

  // 2. Buffer & Size Validation (Max 10MB)
  const buffer = Buffer.from(base64Data, 'base64');
  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (buffer.length > maxBytes) {
    throw new Error('File size exceeds maximum allowed limit of 10MB.');
  }

  // 3. Binary Magic Bytes Validation
  let isValidBinary = false;
  if (ext === '.jpg' || ext === '.jpeg') {
    isValidBinary = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  } else if (ext === '.png') {
    isValidBinary = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  } else if (ext === '.webp') {
    const headerStr = buffer.toString('utf8', 0, 12);
    isValidBinary = headerStr.startsWith('RIFF') && headerStr.endsWith('WEBP');
  }

  if (!isValidBinary) {
    throw new Error('Corrupt image binary or mismatched file header.');
  }

  // 4. Duplicate Check via SHA-256 Hash
  const uploadHash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Check existing images for target property
  const existingImages = await prisma.propertyImage.findMany({ where: { propertyId } });
  for (const img of existingImages) {
    if (img.imageUrl) {
      try {
        let relativePath = img.imageUrl.replace(/^https?:\/\/[^\/]+/, '');
        const physPath = path.join(MEDIA_ROOT, '..', '..', relativePath);
        if (fs.existsSync(physPath)) {
          const physBuf = fs.readFileSync(physPath);
          const physHash = crypto.createHash('sha256').update(physBuf).digest('hex');
          if (physHash === uploadHash) {
            throw new Error('This image already exists for this property.');
          }
        }
      } catch (err) {
        if (err.message === 'This image already exists for this property.') throw err;
      }
    }
  }

  // 5. Save Physical File to Disk
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const targetDir = path.join(MEDIA_ROOT, String(year), month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const safeBase = path.basename(filename, ext).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const uniqueName = `${safeBase}-${Date.now()}${ext}`;
  const targetFilePath = path.join(targetDir, uniqueName);

  // Path Traversal Security Verification
  const resolvedPath = path.resolve(targetFilePath);
  if (!resolvedPath.startsWith(path.resolve(MEDIA_ROOT))) {
    throw new Error('Security Violation: Invalid file path traversal.');
  }

  fs.writeFileSync(targetFilePath, buffer);

  // 6. Create PropertyImage Database Record (Transactional Cleanup on Failure)
  const relativeUrl = `/wp-content/uploads/${year}/${month}/${uniqueName}`;
  const fullUrl = `http://localhost:5000${relativeUrl}`;

  // Check if first image for property (if first, auto-set primary)
  const isFirstImage = existingImages.length === 0;
  const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.displayOrder || 0), 0);

  try {
    const newRecord = await prisma.propertyImage.create({
      data: {
        propertyId,
        imageUrl: fullUrl,
        displayOrder: maxOrder + 1,
        isFeatured: isFirstImage
      }
    });

    return newRecord;
  } catch (dbErr) {
    // Transactional safety cleanup: remove physical file if DB fails
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
    }
    throw dbErr;
  }
}

async function setPrimaryImage(propertyId, imageId, user) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error('Property not found');

  if (property.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const targetId = Number(imageId);
  const targetImage = await prisma.propertyImage.findFirst({
    where: { id: targetId, propertyId }
  });

  if (!targetImage) throw new Error('Image not found for this property');

  // Unset all images for property
  await prisma.propertyImage.updateMany({
    where: { propertyId },
    data: { isFeatured: false }
  });

  // Set target image as primary
  const updated = await prisma.propertyImage.update({
    where: { id: targetId },
    data: { isFeatured: true }
  });

  return updated;
}

async function reorderPropertyImages(propertyId, orders, user) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error('Property not found');

  if (property.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  if (!Array.isArray(orders)) throw new Error('Invalid orders payload');

  const updates = orders.map((item) =>
    prisma.propertyImage.update({
      where: { id: Number(item.id) },
      data: { displayOrder: Number(item.displayOrder) }
    })
  );

  await prisma.$transaction(updates);
  return { success: true, message: 'Image order updated successfully' };
}

async function deletePropertyImage(propertyId, imageId, user) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error('Property not found');

  if (property.hostId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const targetId = Number(imageId);
  const targetImage = await prisma.propertyImage.findFirst({
    where: { id: targetId, propertyId }
  });

  if (!targetImage) throw new Error('Property image not found');

  const wasPrimary = targetImage.isFeatured;
  const imageUrl = targetImage.imageUrl;

  // 1. Delete PropertyImage DB record
  await prisma.propertyImage.delete({
    where: { id: targetId }
  });

  // 2. Shared File Protection: check if another record uses the same URL
  if (imageUrl) {
    const otherUsageCount = await prisma.propertyImage.count({
      where: { imageUrl }
    });

    if (otherUsageCount === 0) {
      // Safe physical file deletion with path traversal protection
      try {
        const relativePath = imageUrl.replace(/^https?:\/\/[^\/]+/, '');
        const physPath = path.resolve(MEDIA_ROOT, '..', '..', relativePath.replace(/^\//, ''));

        if (physPath.startsWith(path.resolve(MEDIA_ROOT)) && fs.existsSync(physPath)) {
          fs.unlinkSync(physPath);
        }
      } catch (err) {
        console.error('Physical file deletion error:', err);
      }
    }
  }

  // 3. Primary Auto-Assignment: if deleted image was primary, assign next image as primary
  if (wasPrimary) {
    const nextImage = await prisma.propertyImage.findFirst({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' }
    });

    if (nextImage) {
      await prisma.propertyImage.update({
        where: { id: nextImage.id },
        data: { isFeatured: true }
      });
    }
  }

  return { success: true, message: 'Image deleted successfully' };
}

module.exports = {
  getPropertyMedia,
  getAllMedia,
  uploadPropertyImage,
  setPrimaryImage,
  reorderPropertyImages,
  deletePropertyImage
};
