import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }  from '@aws-sdk/s3-request-presigner';
import { env }           from '@src/env';
import { log }           from '@setup/log';

const make_client = (): S3Client => {
  try {
    return new S3Client({
      region:   env.MINIO_REGION,
      endpoint: env.MINIO_ENDPOINT,
      credentials: {
        accessKeyId:     env.MINIO_ACCESS_KEY ?? '',
        secretAccessKey: env.MINIO_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });
  } catch (error) {
    log.error('storage.make_client.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

export const storage = make_client();

export const delete_object = async (bucket: string, storage_key: string): Promise<void> => {
  try {
    await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: storage_key }));
  } catch (error) {
    log.error('storage.delete_object.failed', { bucket, storage_key, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

export const get_presigned_url = async (bucket: string, storage_key: string, expires_in_seconds = 3600): Promise<string> => {
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: storage_key });
    return await getSignedUrl(storage, command, { expiresIn: expires_in_seconds });
  } catch (error) {
    log.error('storage.get_presigned_url.failed', { bucket, storage_key, error: String((error as any)?.message ?? error) });
    throw error;
  }
};
