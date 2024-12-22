import { describe, expect, test } from "vitest";
import { GenericVideoEncoder } from "../src/main/encoders/encoders/GenericVideoEncoder";
import { join } from "node:path";
import { tempDir } from "../src/main/encoders/misc/EnvironmentVariables";

describe("Test generic video encoder", async () => {
    test("Test that the generic video encoder can encode a sample video.", { timeout: 10000 }, async () => {
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");
        await encoder.start("-c:v libx264 -c:a aac", join(tempDir, "peepoheadpat.mp4"));

        expect(encoder.encoderId).toBeDefined();
        expect(encoder.state).toBe("Success");

        // This tests that the duration isn't broken and stuck at 0.
        expect(encoder.currentDuration).toBeGreaterThan(0);
        expect(encoder.duration).toBeGreaterThan(0);
    });

    test("Test that the generic video encoder can gracefully exit from an invalid video.", async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm");

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // And attempting to start an invalid video should throw an error.
            await encoder.start("-c:v libx264 -c:a aac", join(tempDir, "butitsnotvalid.mp4"));
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the generic video encoder can gracefully exit from invalid ffmpeg arguments.", async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");

        expect(encoder.state).toBe("Pending");

        await encoder.start("-c:v libx264butitsnotvalid -c:a aacbutitsnotvalid --someinvalidparam helloworld", join(tempDir, "butitsnotvalid.mp4"));

        expect(encoder.state).toBe("Error");
    });
});
