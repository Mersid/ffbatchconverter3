export function formatFFmpegTimeToSeconds(time: string): number {
    const parts = time.split(":").map(Number);
    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    return seconds;
}
