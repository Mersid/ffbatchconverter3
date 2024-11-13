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
        const child = vi.spyOn(VMAFTargetVideoEncoder.prototype, "encoder", "get");
        const x = 8;
    });

    test("Test that the target encoder fails appropriately when a CRF of 51 still produces a VMAF score above the target threshold.", async () => {
        // TODO: Write this test case.
        expect(true).toBe(false);
    });
});

describe("VMAFTargetVideoEncoder", async () => {
    let encoderMock: VMAFTargetVideoEncoder;
    const tempDir = `${tmpdir()}/ffbatchconverter3_test`;

    beforeEach(async () => {
        // Create an instance of the VMAFTargetVideoEncoder class
        encoderMock = await VMAFTargetVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm", "tempDir");
    });

    test("fails when a CRF of 0 produces a VMAF score below the target threshold", async () => {
        // Set up the mock behavior for the getVMAFScore() method
        const crfToVmafMap = new Map([
            [0, 85], // CRF 0 returns a VMAF score of 85
            [10, 92], // CRF 10 returns a VMAF score of 92
            // Add more CRF-VMAF mappings as needed
        ]);

        // Create a spy on the getVMAFScore() method of the VMAFScoringEncoder class
        const getVMAFScoreSpy = vi.spyOn(VMAFTargetVideoEncoder.prototype, "encodeVideoWithCRF");

        // Define the mock implementation for the getVMAFScore() method
        getVMAFScoreSpy.mockImplementation((ffmpegArguments: string, crf: number) => {
            // return Promise.resolve(crfToVmafMap.get(crf) || 2);
            return 90;
        });

        // Call the encode() method with a CRF of 0 and a target threshold of 90
        const result = await encoderMock.start("-c:a aac", false, 60, `${tempDir}/peepoheadpat_targeted.mp4`);


        // Assert the expected behavior
        expect(result).toBe(false);
        expect(getVMAFScoreSpy).toHaveBeenCalledWith(0);

        // Restore the original implementation of the getVMAFScore() method
        getVMAFScoreSpy.mockRestore();
    });

    // Add more test cases as needed
});
