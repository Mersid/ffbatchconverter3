import { describe, expect, test, vi } from "vitest";
import { tmpdir } from "os";
import { VMAFScoringEncoder } from "../src/main/encoders/encoders/VMAFScoringEncoder";

describe("Test VMAF scoring encoder", async () => {
    test("Test that the VMAF scoring encoder can score a sample video.", { timeout: 10000 }, async () => {
        const tempDir = tmpdir();
        const encoder = await VMAFScoringEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");
        await encoder.start("./tests/resources/distorted peepoheadpat.mp4");

        expect(encoder.state).toBe("Success");

        // This tests that the current duration isn't broken and stuck at 0.
        expect(encoder.currentDuration).toBeGreaterThan(0);

        // This tests that the VMAF score is a valid number.
        expect(encoder.vmafScore).toBeGreaterThan(5);
    });

    test("Test that the VMAF scoring encoder can gracefully exit from an invalid video.", async () => {
        const tempDir = tmpdir();

        // Notice that the requested file doesn't actually exist.
        const encoder = await VMAFScoringEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm");

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // Recall that the reference video path does not exist.
            await encoder.start("./tests/resources/distorted peepoheadpat.mp4");
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the VMAF scoring encoder successfully produces a valid VMAF score.", async () => {
        // TODO: Write this test case.
    });
});
