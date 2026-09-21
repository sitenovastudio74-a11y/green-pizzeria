import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

// Uploads an in-memory image buffer to Cloudinary and returns its permanent https URL.
// folder groups images in Cloudinary (e.g. 'products', 'categories', 'combos').
export function uploadImageToCloudinary(fileBuffer: Buffer, folder: string): Promise<string> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'green-pizzeria/' + folder },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
}