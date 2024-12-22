import { shell } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { tempDir } from "./EnvironmentVariables";

export async function openLog(log: string): Promise<void> {
    if (log) {
        const tempFilePath = join(tempDir, `${uuidv4()}.log`);
        await mkdir(tempDir, { recursive: true });

        await writeFile(tempFilePath, log);
        await shell.openPath(tempFilePath);
    }
}
