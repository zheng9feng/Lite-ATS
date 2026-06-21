import { Client } from 'minio'
import { type ResumeObjectStorage } from './resume-service'

type MinioStorageOptions = {
  accessKey: string
  endPoint: string
  port: number
  secretKey: string
  useSSL: boolean
}

export function createMinioStorage(
  options: MinioStorageOptions
): ResumeObjectStorage {
  const client = new Client(options)

  return {
    ensureBucket: async (bucketName) => {
      const exists = await client.bucketExists(bucketName)

      if (!exists) {
        await client.makeBucket(bucketName)
      }
    },
    getObject: ({ bucketName, objectName }) =>
      client.getObject(bucketName, objectName),
    putObject: async ({ body, bucketName, contentType, objectName, size }) => {
      await client.putObject(bucketName, objectName, body, size, {
        'Content-Type': contentType,
      })
    },
  }
}
