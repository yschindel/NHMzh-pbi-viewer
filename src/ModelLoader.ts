import { inflate } from "pako";
import * as OBC from "@thatopen/components";

/**
 * Class for loading compressed IFC fragments file from the server
 */
export class ModelLoader {
	fileId: string; // The id of the file to be loaded from the server
	apiKey: string;
	serverUrl: string;
	file: Uint8Array;
	components: OBC.Components;
	ifcLoader: OBC.IfcLoader;

	/**
	 * Initialize the ModelLoader
	 * @param fileId The id of the file to be loaded from the server
	 * @param apiKey The API key to be used to authenticate the request
	 * @param serverUrl The server URL including the endpoint to be used to load the file
	 */
	constructor(fileId: string, apiKey: string, serverUrl: string) {
		if (!fileId) {
			throw new Error("fileId is required");
		}

		if (!apiKey) {
			throw new Error("apiKey is required");
		}
		if (!serverUrl) {
			throw new Error("serverUrl is required");
		}
		this.fileId = fileId;
		this.apiKey = apiKey;
		this.serverUrl = serverUrl;
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

	/**
	 * Fetches the compressed IFC fragments file from the server
	 * @returns The compressed file as an ArrayBuffer
	 */
	async fetchFile(): Promise<ArrayBuffer> {
		this.serverUrl = "http://localhost:3000/fragments";
		this.fileId = "project1/file1";
		const res = await fetch(`${this.serverUrl}?id=${this.fileId}`, {
			method: "GET",
			mode: "cors",
			headers: {
				"X-API-Key": this.apiKey,
			},
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
