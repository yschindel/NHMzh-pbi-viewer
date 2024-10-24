import { inflate } from "pako";
import { Client as MinioClient } from "minio";

/**
 * Class for loading compressed IFC fragments file from the server
 */
export class ModelLoader {
  fileName: string; // The name of the file to be loaded from the server
  baseUrl: string;
  minioClient = new MinioClient({
    endPoint: "minio",
    port: 9000,
    useSSL: true,
    accessKey: "ROOTUSER",
    secretKey: "CHANGEME123",
  });
  ifcFragmentsBucketName = "ifc-fragment-files";

  /**
   * Initialize the ModelLoader
   * @param fileName The name of the file to be loaded from the server
   * @param baseUrl The base URL of the server. Default is "http://localhost:3000"
   */
  constructor(fileName: string) {
    if (!fileName) {
      throw new Error("fileName is required");
    }
    this.fileName = fileName;
  }

  /**
   * Load the compressed IFC fragments file from the server and decompress it
   * @param maxRetries The maximum number of retries. Default is 3.
   * @returns The decompressed file as a Uint8Array, or null if all retries fail.
   */
  async loadFragments(): Promise<Uint8Array | null> {
    const arrayBuffer = await this.getFile(this.fileName, this.ifcFragmentsBucketName, this.minioClient);
    return this.decompress(arrayBuffer);
  }

  /**
   * Decompress the compressed file
   * @param file The compressed file as an ArrayBuffer
   * @returns The decompressed file as a Uint8Array
   */
  decompress(file: ArrayBuffer): Uint8Array {
    return new Uint8Array(inflate(file));
  }

  /**
   * Get a file from MinIO
   * @param location - The location of the file in the bucket
   * @param bucketName - The bucket name
   * @param client - MinioClient
   * @returns The file as a Buffer
   * @throws Error if the file cannot be retrieved
   */
  async getFile(location: string, bucketName: string, client: MinioClient): Promise<ArrayBuffer> {
    const stream = await client.getObject(bucketName, location);
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(new Uint8Array(chunk)));
      stream.on("end", () => {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result.buffer);
      });
      stream.on("error", reject);
    });
  }
}
