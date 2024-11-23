import { describe, expect, test } from "vitest";
import { findCommand, getFilesRecursive } from "../src/main/encoders/misc/Helpers";

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

    describe("Test recursive file finder", async () => {
        test("Test that a file can be found recursively.", async () => {
            const r = await getFilesRecursive("tests/dirs");
            expect(r.length).toBe(4);
            expect(r).toContain("tests/dirs/file.txt");
            expect(r).toContain("tests/dirs/1/file2.txt");
            expect(r).toContain("tests/dirs/1/2/file3.txt");
            expect(r).toContain("tests/dirs/1/2/file4.txt");
        });
    });
});
