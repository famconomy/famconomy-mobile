import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const CONTENT_TYPE_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

const ensureUploadsDirectory = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

const pickExtension = (contentType: string | undefined, fallback = 'jpg') => {
  if (!contentType) return fallback;
  const normalized = contentType.toLowerCase().split(';')[0].trim();
  return CONTENT_TYPE_EXTENSION_MAP[normalized] ?? fallback;
};

const fetchBuffer = (urlString: string): Promise<{ buffer: Buffer; contentType?: string }> => {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlString);
    } catch (error) {
      return reject(error);
    }

    const client = parsedUrl.protocol === 'http:' ? http : https;
    client.get(parsedUrl, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // handle simple redirects
        return resolve(fetchBuffer(res.headers.location));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Unexpected status code ${res.statusCode}`));
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] });
      });
    }).on('error', reject);
  });
};

export const downloadRemoteProfilePhoto = async (
  url: string | undefined,
  provider: string,
  providerUserId: string | number
): Promise<string | undefined> => {
  if (!url) return undefined;

  try {
    const { buffer, contentType } = await fetchBuffer(url);
    if (!buffer.length) {
      console.warn(`Empty profile photo response for ${provider} user ${providerUserId}`);
      return undefined;
    }

    await ensureUploadsDirectory();

    const extension = pickExtension(contentType ?? undefined);
    const fileName = `${provider}-${providerUserId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    await fs.writeFile(filePath, buffer);

    return `/uploads/${fileName}`;
  } catch (error) {
    console.warn(`Error downloading profile photo for ${provider} user ${providerUserId}:`, error);
    return undefined;
  }
};
