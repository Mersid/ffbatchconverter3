import { spawnSync } from "node:child_process";

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
 * Finds the path of the executable for the command.
 * @param command The first match for the command specified, or null if it could not be found.
 */
export function findCommand(command: string): string | undefined {
    const p = spawnSync(process.platform === "win32" ? "where" : "which", [command]);
    const result = p.stdout.toString();

    if (result === "") {
        return undefined;
    }

    return result;
}