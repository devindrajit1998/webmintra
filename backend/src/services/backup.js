/**
 * Automated MongoDB Database Backup Service
 * Streams all critical collections to Cloudflare R2 Object Storage
 * Compatible with AWS S3 SDK (Cloudflare R2 is S3-compatible)
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import { createGzip } from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// Collections to backup
const BACKUP_COLLECTIONS = [
  "users",
  "websites",
  "subscriptions",
  "payments",
  "leads",
  "domains",
  "formsubmissions",
  "emailtemplates",
  "settings",
  "plans",
  "inboxmessages",
  "activitylogs",
  "emailtemplates",
  "announcements",
  "notifications",
];

// Retention: keep last N backups
const MAX_BACKUPS = 30;

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getR2Bucket() {
  return process.env.R2_BUCKET_NAME || "webmintra-backups";
}

/**
 * Dumps all selected MongoDB collections into a single JSON object,
 * gzip-compresses it, and streams it to R2.
 */
export async function runDatabaseBackup() {
  const startTime = Date.now();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19); // e.g. 2026-08-24T02-00-00
  const dateLabel = now.toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
  const key = `backups/${dateLabel}/webmintra_backup_${timestamp}.json.gz`;

  console.log(`[BACKUP] Starting database backup: ${key}`);

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection not established.");

  // Dump all collections into memory as JSON
  const backup = {
    exportedAt: now.toISOString(),
    platform: "WebMintra",
    version: "1.0",
    collections: {},
  };

  let totalDocuments = 0;

  for (const collectionName of BACKUP_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      backup.collections[collectionName] = documents;
      totalDocuments += documents.length;
      console.log(`[BACKUP] Dumped "${collectionName}" (${documents.length} documents)`);
    } catch (err) {
      console.warn(`[BACKUP] Could not dump collection "${collectionName}": ${err.message}`);
      backup.collections[collectionName] = [];
    }
  }

  backup.summary = {
    totalCollections: Object.keys(backup.collections).length,
    totalDocuments,
    durationMs: Date.now() - startTime,
  };

  // Convert to JSON Buffer and gzip-compress
  const jsonBuffer = Buffer.from(JSON.stringify(backup, null, 2), "utf-8");
  const compressedChunks = [];

  await new Promise((resolve, reject) => {
    const gzip = createGzip({ level: 9 });
    const input = Readable.from(jsonBuffer);

    gzip.on("data", (chunk) => compressedChunks.push(chunk));
    gzip.on("end", resolve);
    gzip.on("error", reject);
    input.pipe(gzip);
  });

  const compressedBuffer = Buffer.concat(compressedChunks);
  const compressedSizeKb = (compressedBuffer.length / 1024).toFixed(1);
  const originalSizeKb = (jsonBuffer.length / 1024).toFixed(1);

  console.log(`[BACKUP] Compressed ${originalSizeKb} KB → ${compressedSizeKb} KB (gzip level 9)`);

  // Upload to Cloudflare R2
  const client = getR2Client();
  const bucket = getR2Bucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: compressedBuffer,
      ContentType: "application/gzip",
      ContentEncoding: "gzip",
      Metadata: {
        "exported-at": now.toISOString(),
        "total-documents": String(totalDocuments),
        "original-size-kb": originalSizeKb,
        "compressed-size-kb": compressedSizeKb,
      },
    })
  );

  const durationMs = Date.now() - startTime;
  console.log(`[BACKUP] Upload complete → r2://${bucket}/${key} (${durationMs}ms)`);

  // Prune old backups (keep last MAX_BACKUPS)
  await pruneOldBackups(client, bucket);

  return {
    success: true,
    key,
    bucket,
    totalDocuments,
    compressedSizeKb: parseFloat(compressedSizeKb),
    originalSizeKb: parseFloat(originalSizeKb),
    durationMs,
    timestamp: now.toISOString(),
  };
}

/**
 * List all backups stored in Cloudflare R2 bucket
 */
export async function listDatabaseBackups() {
  const client = getR2Client();
  const bucket = getR2Bucket();

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "backups/",
    })
  );

  const objects = response.Contents || [];

  // Sort by LastModified descending (newest first)
  objects.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));

  return objects.map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    sizeKb: (obj.Size / 1024).toFixed(1),
    sizeMb: (obj.Size / (1024 * 1024)).toFixed(2),
    lastModified: obj.LastModified,
    filename: obj.Key.split("/").pop(),
  }));
}

/**
 * Generate a time-limited signed download URL for a specific backup file
 */
export async function getBackupDownloadUrl(key) {
  const client = getR2Client();
  const bucket = getR2Bucket();

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
  return url;
}

/**
 * Delete a specific backup from R2
 */
export async function deleteBackup(key) {
  const client = getR2Client();
  const bucket = getR2Bucket();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Automatically prune backups older than MAX_BACKUPS to stay within free tier
 */
async function pruneOldBackups(client, bucket) {
  try {
    const response = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: "backups/" })
    );

    const objects = (response.Contents || []).sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );

    if (objects.length > MAX_BACKUPS) {
      const toDelete = objects.slice(MAX_BACKUPS);
      for (const obj of toDelete) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
        console.log(`[BACKUP] Pruned old backup: ${obj.Key}`);
      }
      console.log(`[BACKUP] Pruned ${toDelete.length} old backups. Kept ${MAX_BACKUPS}.`);
    }
  } catch (err) {
    console.warn("[BACKUP] Failed to prune old backups:", err.message);
  }
}

/**
 * Check if R2 is properly configured
 */
export function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
