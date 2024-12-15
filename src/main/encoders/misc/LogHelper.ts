import { shell } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

export async function openLog(log: string): Promise<void> {
    if (log) {
        const tempFileDir = join(tmpdir(), "FFBatchConverter3");
        const tempFilePath = join(tempFileDir, `${uuidv4()}.log`);
        await mkdir(tempFileDir, { recursive: true });

        await writeFile(tempFilePath, log);
        await shell.openPath(tempFilePath);
    }
}
