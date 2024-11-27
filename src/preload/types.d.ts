import {api} from "./index";
import { ElectronAPI } from "@electron-toolkit/preload";

// Note: Naming this after another file will break it! So don't name this index.d.ts... took me way too long to figure this one out.
// https://stackoverflow.com/questions/59728371/typescript-d-ts-file-not-recognized

declare global {
    // https://www.youtube.com/watch?v=2gNc_3YyYqk
    interface Window {
        electron: ElectronAPI;
        api: typeof api;
    }

    // https://github.com/microsoft/TypeScript/issues/49453
    interface Array<T> {
        findLast(
            predicate: (value: T, index: number, obj: T[]) => unknown,
            thisArg?: unknown
        ): T | undefined;
    }
}
