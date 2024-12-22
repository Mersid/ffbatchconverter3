import { afterEach, describe, test } from "vitest";
import { GenericVideoEncoderController } from "../src/main/encoders/controllers/GenericVideoEncoderController";
import { cwd } from "node:process";
import { rm } from "node:fs/promises";
import { tempDir } from "../src/main/encoders/misc/EnvironmentVariables";

describe("Test generic video encoder controller", { timeout: 0 }, async () => {
    test("Test that the encoder can encode videos correctly.", { timeout: 10000 }, async () => {
        const controller = await GenericVideoEncoderController.createNew("ffprobe", "ffmpeg");
        await controller.addEncoders([`${cwd()}/tests/resources/peepoheadpat.webm`, `${cwd()}/tests/resources/distorted peepoheadpat.mp4`]);
        controller.extension = "mkv";
        controller.outputSubdirectory = tempDir;
        controller.ffmpegArguments = "-c:v libx264 -c:a aac";

        await controller.startEncoding();
    });

    test("Test that the encoder can handle files that don't exist.", async () => {
        const controller = await GenericVideoEncoderController.createNew("ffprobe", "ffmpeg");
        await controller.addEncoders([`${cwd()}/tests/resources/peepoheadpatbutitsnotvalid.webm`]);
        controller.extension = "mkv";
        controller.outputSubdirectory = tempDir;
        controller.ffmpegArguments = "-c:v libx264 -c:a aac";

        await controller.startEncoding();
    });
});
