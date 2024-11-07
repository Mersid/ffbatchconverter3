import { describe, expect, test, vi } from "vitest";
import { findCommand } from "../src/main/encoders/misc/Helpers";

describe("Test helpers", async () => {
    describe("Test findCommand", async () => {
        test("Test that a common, OS-installed command, can be found.", async () => {
            const r = findCommand("where");
            console.log(`Value: ${r}`);
            expect(r).toBeDefined();
        });

        test("Test that a non-existent command cannot be found.", async () => {
            const r = findCommand("nonexistent_asdfahsdfkajsf"); // Don't actually create a command with this name.
            console.log(`Value: ${r}`);
            expect(r).toBeUndefined();
        });
    });
});
