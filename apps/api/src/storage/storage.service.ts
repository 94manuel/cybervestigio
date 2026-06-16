import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type StoredFile = {
  key: string;
  name: string;
  size: number;
  updatedAt: Date | null;
};

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly publicBaseUrl: string;
  private bucketReady: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT')?.trim() || 'http://localhost:9000';
    const region = this.configService.get<string>('MINIO_REGION')?.trim() || 'us-east-1';
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY')?.trim() || 'minioadmin';
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY')?.trim() || 'minioadmin';

    this.bucket = this.configService.get<string>('MINIO_BUCKET')?.trim() || 'cybervestigio-drive';
    this.publicBaseUrl = this.configService.get<string>('MINIO_PUBLIC_URL')?.trim() || endpoint;

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private normalizePrefix(prefix: string): string {
    const clean = prefix.trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/');
    return clean.endsWith('/') ? clean : `${clean}/`;
  }

  private async ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        try {
          await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        }
      })();
    }

    try {
      await this.bucketReady;
    } catch (error) {
      this.bucketReady = null;
      throw new InternalServerErrorException(
        `No fue posible inicializar el bucket de almacenamiento. ${(error as Error).message}`,
      );
    }
  }

  async ensureFolder(prefix: string): Promise<void> {
    await this.ensureBucket();
    const folderKey = `${this.normalizePrefix(prefix)}.keep`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: folderKey,
        Body: 'folder',
        ContentType: 'text/plain',
      }),
    );
  }

  async listFiles(prefix: string): Promise<StoredFile[]> {
    await this.ensureBucket();
    const normalized = this.normalizePrefix(prefix);

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: normalized,
      }),
    );

    const files = (response.Contents ?? [])
      .filter((item) => item.Key && !item.Key.endsWith('.keep'))
      .map((item) => {
        const key = item.Key ?? '';
        return {
          key,
          name: key.replace(normalized, ''),
          size: item.Size ?? 0,
          updatedAt: item.LastModified ?? null,
        };
      });

    files.sort((a, b) => {
      const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
      return bTime - aTime;
    });

    return files;
  }

  async getUploadUrl(prefix: string, fileName: string, contentType?: string): Promise<{ key: string; uploadUrl: string }> {
    await this.ensureBucket();

    const normalizedFileName = fileName.trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/');
    const key = `${this.normalizePrefix(prefix)}${normalizedFileName}`;

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType?.trim() || 'application/octet-stream',
      }),
      { expiresIn: 900 },
    );

    return { key, uploadUrl };
  }

  async getDownloadUrl(key: string): Promise<string> {
    await this.ensureBucket();
    const normalizedKey = key.trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      }),
      { expiresIn: 900 },
    );
  }

  getPublicObjectUrl(key: string): string {
    const normalizedKey = key.trim().replace(/^\/+/, '');
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${this.bucket}/${normalizedKey}`;
  }
}
