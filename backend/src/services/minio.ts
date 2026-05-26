import { Client } from 'minio';
import fs from 'fs';
import path from 'path';

let _client: Client | null = null;
const BUCKET = process.env.MINIO_BUCKET || 'quicksilver';

function getClient(): Client {
  if (_client) return _client;
  _client = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin_dev',
  });
  return _client;
}

export async function ensureBucketAndSeedFiles(): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, 'us-east-1');
    console.log(`MinIO bucket '${BUCKET}' created`);
  }

  // Seed Gate 3 CSV if not already uploaded
  const key = 'gate3/gate3_intercept.csv';
  try {
    await client.statObject(BUCKET, key);
    console.log('Gate 3 intercept CSV already in MinIO');
  } catch {
    const missionsPath = process.env.MISSIONS_PATH || path.join(__dirname, '..', '..', '..', 'missions');
    const csvPath = path.join(missionsPath, 'materials', 'gate3_intercept.csv');
    if (fs.existsSync(csvPath)) {
      await client.fPutObject(BUCKET, key, csvPath, { 'Content-Type': 'text/csv' });
      console.log('Gate 3 intercept CSV uploaded to MinIO');
    } else {
      console.warn(`Gate 3 CSV not found at ${csvPath} — skipping upload`);
    }
  }

  // Seed Gate 2 materials if not already uploaded
  const gate2Materials: Array<{ key: string; filename: string; contentType: string }> = [
    { key: 'gate2/gate2_renoux_profile.txt',     filename: 'gate2_renoux_profile.txt',     contentType: 'text/plain' },
    { key: 'gate2/gate2_auction_programme.txt',  filename: 'gate2_auction_programme.txt',  contentType: 'text/plain' },
    { key: 'gate2/gate2_hermitage_schematic.svg', filename: 'gate2_hermitage_schematic.svg', contentType: 'image/svg+xml' },
    { key: 'gate2/gate2_intercept_fragment.txt', filename: 'gate2_intercept_fragment.txt', contentType: 'text/plain' },
  ];

  const missionsPath = process.env.MISSIONS_PATH || path.join(__dirname, '..', '..', '..', 'missions');

  for (const material of gate2Materials) {
    try {
      await client.statObject(BUCKET, material.key);
      console.log(`Gate 2 material already in MinIO: ${material.key}`);
    } catch {
      const filePath = path.join(missionsPath, 'materials', material.filename);
      if (fs.existsSync(filePath)) {
        await client.fPutObject(BUCKET, material.key, filePath, { 'Content-Type': material.contentType });
        console.log(`Gate 2 material uploaded to MinIO: ${material.key}`);
      } else {
        console.warn(`Gate 2 material not found at ${filePath} — skipping upload`);
      }
    }
  }
}

export async function getPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
  const client = getClient();
  return client.presignedGetObject(BUCKET, objectKey, expirySeconds);
}

export async function getMinioStream(objectKey: string): Promise<NodeJS.ReadableStream> {
  const client = getClient();
  return client.getObject(BUCKET, objectKey);
}
