import { describe, expect, test } from "vitest";
import { formatFFmpegTimeToSeconds } from "../src/main/encoders/misc/TimeFormatter";

describe("Test ffmpeg -> seconds time formatter", () => {
    test("Test that a random time string can be formatted to seconds.", () => {
        const time = "00:00:09.95";
        const seconds = formatFFmpegTimeToSeconds(time);
        expect(seconds).toBe(9.95);
    });

    test("Test that another time string can be formatted properly.", () => {
        const time = "12:34:56.78";
        const seconds = formatFFmpegTimeToSeconds(time);
        expect(seconds).toBe(45_296.78);
    });

    test("Test that the time formatter works for durations over 100 hours.", () => {
        const time = "123:45:67.89";
        const seconds = formatFFmpegTimeToSeconds(time);
        expect(seconds).toBe(445_567.89);
    });
});
