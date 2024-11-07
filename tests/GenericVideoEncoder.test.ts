import { describe, expect, test, vi } from "vitest";
import { GenericVideoEncoder } from "../src/main/encoders/encoders/GenericVideoEncoder";
import { tmpdir } from "os";

describe("Test generic video encoder", async () => {
    test("Test that the generic video encoder can encode a sample video.", async () => {
        const tempDir = tmpdir();
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");
        await encoder.start("-c:v libx264 -c:a aac", `${tempDir}/peepoheadpat.mp4`);
    });

    test("Test that the generic video encoder can gracefully exit from an invalid video.", async () => {
        const tempDir = tmpdir();

        // Notice that the requested file doesn't actually exist.
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpatbutitsnotvalid.webm");

        // Since the above video is not valid, it should be in an error state.
        expect(encoder.state).toBe("Error");

        await expect(async () => {
            // And attempting to start an invalid video should throw an error.
            await encoder.start("-c:v libx264 -c:a aac", `${tempDir}/butitsnotvalid.mp4`);
        }).rejects.toThrowError();

        expect(encoder.state).toBe("Error");
    });

    test("Test that the generic video encoder can gracefully exit from invalid ffmpeg arguments.", async () => {
        const tempDir = tmpdir();

        // Notice that the requested file doesn't actually exist.
        const encoder = await GenericVideoEncoder.createNew("ffprobe", "ffmpeg", "./tests/resources/peepoheadpat.webm");

        await encoder.start("-c:v libx264butitsnotvalid -c:a aacbutitsnotvalid --someinvalidparam helloworld", `${tempDir}/butitsnotvalid.mp4`);

        expect(encoder.state).toBe("Error");
    });
});
