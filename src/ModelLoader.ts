import { inflate } from "pako";

/**
 * Class for loading compressed IFC fragments file from the server
 */
export class ModelLoader {
  fileName: string; // The name of the file to be loaded from the server
  baseUrl: string;
  file: Uint8Array;

  /**
   * Initialize the ModelLoader
   * @param fileName The name of the file to be loaded from the server
   * @param baseUrl The base URL of the server. Default is "http://localhost:3000"
   */
  constructor(fileName: string, baseUrl: string) {
    if (!fileName) {
      throw new Error("fileName is required");
    }
    this.fileName = fileName;
    this.baseUrl = baseUrl || "http://localhost:3000";
  }

  /**
   * Load the compressed IFC fragments file from the server and decompress it
   * @returns The decompressed file as a Uint8Array
   */
  async load(): Promise<Uint8Array> {
    const file = await this.fetchFile();
    return this.decompress(file);
  }

  /**
   * Fetches the compressed IFC fragments file from the server
   * @param type The type of file to load. Default is "frag"
   * @returns The compressed file as an ArrayBuffer
   */
  async fetchFile(type: string = "frag"): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/download/${this.fileName}${type}.gz`, {
      method: "GET",
      mode: "cors",
    });
    return await res.arrayBuffer();
  }

  /**
   * Decompress the compressed file
   * @param file The compressed file as an ArrayBuffer
   * @returns The decompressed file as a Uint8Array
   */
  decompress(file: ArrayBuffer): Uint8Array {
    return new Uint8Array(inflate(file));
  }
}
