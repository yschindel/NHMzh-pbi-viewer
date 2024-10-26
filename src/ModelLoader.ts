import { inflate } from "pako";
import * as OBC from "@thatopen/components";

/**
 * Class for loading compressed IFC fragments file from the server
 */
export class ModelLoader {
  fileName: string; // The name of the file to be loaded from the server
  baseUrl: string;
  file: Uint8Array;
  components: OBC.Components;
  ifcLoader: OBC.IfcLoader;

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
    this.baseUrl = baseUrl || "http://localhost:3000/file";
    this.components = new OBC.Components();
    this.ifcLoader = this.components.get(OBC.IfcLoader);
  }

  /**
   * Load the compressed IFC fragments file from the server and decompress it
   * @param maxRetries The maximum number of retries. Default is 3.
   * @returns The decompressed file as a Uint8Array, or null if all retries fail.
   */
  async loadFragments(maxRetries: number = 3): Promise<Uint8Array | null> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const file = await this.fetchFile();
        return this.decompress(file);
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries >= maxRetries) {
          // Log the final error
          console.error("Max retries reached. Unable to load file.");
          return null;
        }
        // Wait for a short time before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return null; // This line is technically unreachable, but TypeScript might expect it
  }

  async loadIfc() {
    const file = await this.fetchFile("ifc");
    const buffer = this.decompress(file);
    return await this.parseIfc(buffer);
  }

  /**
   * Fetches the compressed IFC fragments file from the server
   * @param type The type of file to load. Default is "frag"
   * @returns The compressed file as an ArrayBuffer
   */
  async fetchFile(type: string = "frag"): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}?name=${this.fileName}`, {
      method: "GET",
      mode: "cors",
    });
    // check if the response is ok
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch file: ${res.statusText}, ${text}`);
    }
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

  async parseIfc(buffer: Uint8Array) {
    const ifc = await this.ifcLoader.load(buffer);
    return ifc;
  }
}
