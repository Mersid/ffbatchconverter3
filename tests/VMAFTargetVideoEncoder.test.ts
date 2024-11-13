import { beforeEach, describe, expect, test, vi } from "vitest";
import { GenericVideoEncoder } from "../src/main/encoders/encoders/GenericVideoEncoder";
import { tmpdir } from "os";
import { VMAFTargetVideoEncoder } from "../src/main/encoders/encoders/VMAFTargetVideoEncoder";
import { VMAFScoringEncoder } from "../src/main/encoders/encoders/VMAFScoringEncoder";

describe("Test encode and score encoder", async () => {
    const tempDir = `${tmpdir()}/ffbatchconverter3_test`;

    test("Test that the encode and score encoder can encode and score a sample video.", { timeout: 30000 }, async () => {
        const encoder = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", tempDir);
        await encoder.start("-c:a aac", false, 60, `${tempDir}/peepoheadpat_targeted.mp4`);

        expect(encoder.state).toBe("Success");

        // This tests that the duration isn't broken and stuck at 0.
        expect(encoder.currentDuration).toBeGreaterThan(0);
        expect(encoder.duration).toBeGreaterThan(0);
    });

    test("Test that the encode and score encoder can gracefully exit from an invalid video.", async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm", tempDir);

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // And attempting to start an invalid video should throw an error.
            await encoder.start("-c:a aac", false, 60, `${tempDir}/butitsnotvalid_encodeandscore.mp4`);
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the encode and score encoder can gracefully exit from invalid ffmpeg arguments.", { timeout: 0 }, async () => {
        // Notice that the requested file doesn't actually exist.
        const encoder = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", tempDir);

        expect(encoder.state).toBe("Pending");

        await encoder.start("-c:a aacbutitsnotvalid --someinvalidparam helloworld", false, 60, `${tempDir}/butitsnotvalid_encodeandscore.mp4`);

        expect(encoder.state).toBe("Error");
    });

    test("Test that the target encoder fails appropriately when a CRF of 0 still produces a VMAF score below the target threshold.", async () => {
        const encoder = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", tempDir);
        await encoder.start("-c:a aac", false, 99, `${tempDir}/peepoheadpat_targeted_0.mp4`);

        expect(encoder.state).toBe("Error");
    });

    test("Test that the target encoder fails appropriately when a CRF of 51 still produces a VMAF score above the target threshold.", async () => {
        const encoder = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", tempDir);
        await encoder.start("-c:a aac", false, 1, `${tempDir}/peepoheadpat_targeted_51.mp4`);

        expect(encoder.state).toBe("Error");
    });
});
