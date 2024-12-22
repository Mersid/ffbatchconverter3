import { describe, expect, test } from "vitest";
import { EncodeAndScoreEncoder } from "../src/main/encoders/encoders/EncodeAndScoreEncoder";
import { join } from "node:path";
import { tempDir } from "../src/main/encoders/misc/EnvironmentVariables";

describe("Test encode and score encoder", async () => {
    test("Test that the encode and score encoder can encode and score a sample video.", { timeout: 10000 }, async () => {
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");
        await encoder.start("-c:v libx264 -c:a aac", join(tempDir, "peepoheadpat_encodeandscore.mp4"));

        expect(encoder.state).toBe("Success");

        // This tests that the duration isn't broken and stuck at 0.
        expect(encoder.currentDuration).toBeGreaterThan(0);
        expect(encoder.duration).toBeGreaterThan(0);

        // This tests that the VMAF score is a valid number.
        expect(encoder.vmafScore).toBeGreaterThan(5);
    });

    test("Test that the encode and score encoder can gracefully exit from an invalid video.", async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm");

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // And attempting to start an invalid video should throw an error.
            await encoder.start("-c:v libx264 -c:a aac", join(tempDir, "butitsnotvalid_encodeandscore.mp4"));
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the encode and score encoder can gracefully exit from invalid ffmpeg arguments.", { timeout: 0 }, async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");

        expect(encoder.state).toBe("Pending");

        await encoder.start("-c:v libx264butitsnotvalid -c:a aacbutitsnotvalid --someinvalidparam helloworld", join(tempDir, "butitsnotvalid_encodeandscore.mp4"));

        expect(encoder.state).toBe("Error");
    });
});
