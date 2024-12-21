import { tmpdir } from "node:os";
import { join } from "node:path";

export const tempDir = process.env.TEMPDIR ?? join(tmpdir(), "FFBatchConverter3");
