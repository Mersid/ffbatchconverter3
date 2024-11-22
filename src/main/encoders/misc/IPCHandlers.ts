import { registerFetch, registerReceive } from "../../../preload/registerMain";
import { getFFmpegPath, getFFprobePath } from "./Helpers";

export function registerIPCHandlers(): void {
    registerReceive("ping", (_event, _args) => {
        console.log("Pong!");
    });

    registerReceive("log", (_event, args) => {
        console.log(args);
    });

    registerFetch("getExternalLibraryPaths", async (_event, _args) => {
        return {
            ffmpeg: getFFmpegPath() ?? "",
            ffprobe: getFFprobePath() ?? ""
        };
    });
}
