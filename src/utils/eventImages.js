export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
];

export const ACCEPT_ATTRIBUTE = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.heic',
  '.heif'
].join(',');

export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_BATCH_FILES = 30;
export const MAX_EVENT_IMAGES = 60;

const EXTENSION_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif'
};

export const guessImageMime = (file) => {
  const declared = String(file?.type || '').toLowerCase().split(';')[0].trim();
  if (ACCEPTED_IMAGE_MIME_TYPES.includes(declared)) return declared;
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MIME[extension] || declared || 'application/octet-stream';
};

export const isAcceptedImage = (file) => ACCEPTED_IMAGE_MIME_TYPES.includes(guessImageMime(file));

export const isPreviewableImage = (contentType) =>
  !/heic|heif/i.test(String(contentType || ''));

export const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('The file could not be read.'));
  reader.readAsDataURL(file);
});

const base64ByteLength = (base64) => Math.floor((base64.length * 3) / 4);

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    image.src = objectUrl;
  });
};

export const prepareImageForUpload = async (file, { maxEdge = 2000, quality = 0.86 } = {}) => {
  const contentType = guessImageMime(file);
  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(contentType)) {
    throw new Error(`${file.name}: unsupported format. Use JPEG, PNG, WEBP, GIF, AVIF, or HEIC photos.`);
  }
  if (file.size > MAX_FILE_BYTES * 2) {
    throw new Error(`${file.name}: file is too large (limit ${formatBytes(MAX_FILE_BYTES)} after scaling).`);
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const rawBytes = base64ByteLength(rawDataUrl.split(',')[1] || '');
  const keepRaw = file.size <= 400 * 1024 || !isPreviewableImage(contentType) || file.type === 'image/gif';

  let data = rawDataUrl;
  let size = rawBytes;
  let optimized = false;

  if (!keepRaw) {
    const bitmap = await loadBitmap(file);
    const sourceWidth = bitmap?.width || 0;
    const sourceHeight = bitmap?.height || 0;

    if (bitmap && sourceWidth > 0 && sourceHeight > 0) {
      const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0, width, height);
      if (typeof bitmap.close === 'function') bitmap.close();
      const scaledDataUrl = canvas.toDataURL('image/jpeg', quality);
      const scaledBytes = base64ByteLength(scaledDataUrl.split(',')[1] || '');
      if (scaledBytes > 0 && scaledBytes < rawBytes) {
        data = scaledDataUrl;
        size = scaledBytes;
        optimized = true;
      }
    }
  }

  if (size > MAX_FILE_BYTES) {
    throw new Error(`${file.name}: ${formatBytes(size)} exceeds the ${formatBytes(MAX_FILE_BYTES)} upload limit.`);
  }

  return {
    fileName: file.name,
    contentType: optimized ? 'image/jpeg' : contentType,
    data,
    size,
    optimized
  };
};
