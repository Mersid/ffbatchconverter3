export function formatFFmpegTimeToSeconds(time: string): number {
    const parts = time.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
