import { Stats } from "fs";
import { spawn, spawnSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";

export function getFFmpegPath(): string | undefined {
    return findCommand("ffmpeg");
}

export function getFFprobePath(): string | undefined {
    return findCommand("ffprobe");
}

/**
 * Probes the file specified by inputFilePath using ffprobe, and return the data in JSON format.
 * @param ffprobe The path to the ffprobe executable.
 * @param inputFilePath The path of the file to probe.
 */
export function probe(ffprobe: string, inputFilePath: string): string {
    // eslint-disable-next-line prettier/prettier
    const probe = spawnSync(ffprobe, ["-v", "quiet", "-print_format", "json", "-show_format", inputFilePath]);

    return probe.stdout.toString();
}

/**
 * Like probe, but async.
 * @param ffprobe
 * @param inputFilePath
 */
export async function probeAsync(ffprobe: string, inputFilePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const probe = spawn(ffprobe, ["-v", "quiet", "-print_format", "json", "-show_format", inputFilePath]);

        let data = "";

        probe.stdout.on("data", (chunk) => {
            data += chunk;
        });

        probe.on("close", () => {
            resolve(data);
        });

        probe.on("error", (err) => {
            reject(err);
        });
    });
}

/**
 * Finds the path of the executable for the command.
 * @param command The first match for the command specified, or null if it could not be found.
 */
export function findCommand(command: string): string | undefined {
    const p = spawnSync(process.platform === "win32" ? "where" : "which", [command]);
    const result = p.stdout.toString().trim(); // Trim removes the \r\n at the end.

    if (result === "") {
        return undefined;
    }

    return result;
}

/**
 * Given a file path, returns a list of all files in the directory and subdirectories.
 * If it's a file, just returns itself in a list.
 * An empty list is returned if the path does not exist.
 * File paths that are absolute will return an absolute path.
 * Relative paths will return a relative path.
 * @returns
 * @param filePath
 */
export async function getFilesRecursive(filePath: string): Promise<string[]> {
    const files: string[] = [];
    let stats: Stats;
    try {
        stats = await stat(filePath);
    } catch (e) {
        return [];
    }

    if (stats.isDirectory()) {
        const dirContents = await readdir(filePath);
        for (const dir of dirContents) {
            files.push(...(await getFilesRecursive(`${filePath}/${dir}`)));
        }
    }

    if (stats.isFile()) {
        files.push(filePath);
    }

    return files;
}
