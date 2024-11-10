import { describe, expect, test, vi } from "vitest";
import { GenericVideoEncoder } from "../src/main/encoders/encoders/GenericVideoEncoder";
import { tmpdir } from "os";
import { EncodeAndScoreEncoder } from "../src/main/encoders/encoders/EncodeAndScoreEncoder";

describe("Test encode and score encoder", async () => {
    test("Test that the encode and score encoder can encode and score a sample video.", { timeout: 10000 }, async () => {
        const tempDir = tmpdir();
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", () => {});
        await encoder.start("-c:v libx264 -c:a aac", `${tempDir}/peepoheadpat_encodeandscore.mp4`);

        expect(encoder.state).toBe("Success");

        // This tests that the current duration isn't broken and stuck at 0.
        expect(encoder.currentDuration).toBeGreaterThan(0);
    });

    test("Test that the encode and score encoder can gracefully exit from an invalid video.", async () => {
        const tempDir = tmpdir();

        // Notice that the requested file doesn't actually exist.
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm", () => {});

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // And attempting to start an invalid video should throw an error.
            await encoder.start("-c:v libx264 -c:a aac", `${tempDir}/butitsnotvalid_encodeandscore.mp4`);
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the encode and score encoder can gracefully exit from invalid ffmpeg arguments.", { timeout: 0 }, async () => {
        const tempDir = tmpdir();

        // Notice that the requested file doesn't actually exist.
        const encoder = await EncodeAndScoreEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", () => {});

        await encoder.start("-c:v libx264butitsnotvalid -c:a aacbutitsnotvalid --someinvalidparam helloworld", `${tempDir}/butitsnotvalid_encodeandscore.mp4`);

        expect(encoder.state).toBe("Error");
    });
});
