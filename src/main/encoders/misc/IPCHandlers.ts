import { registerFetch, registerReceive } from "../../../preload/registerMain";
import { getFFmpegPath, getFFprobePath } from "./Helpers";
import { lord } from "./Lord";

export function registerIPCHandlers(): void {
    registerReceive("ping", (_event, _args) => {
        console.log("Pong!");
    });

    registerReceive("log", (_event, args) => {
        console.log(args);
    });

    registerFetch("getExternalLibraryPaths", async (_event, _args) => {
        return {
            ffmpegPath: getFFmpegPath() ?? "",
            ffprobePath: getFFprobePath() ?? ""
        };
    });

    registerFetch("createGenericVideoEncoder", async (_event, args) => {
        return await lord.createNewGenericVideoEncoderController(args);
    });

    registerReceive("genericVideoEncoderAddPaths", async (_event, args) => {
        return await lord.addPathsToGenericVideoEncoder(args);
    });

    registerFetch("setEncoderActive", async (_event, args) => {
        return await lord.setEncoderActive(args);
    });

    registerReceive("genericVideoEncoderUpdateSettings", async (_event, args) => {
        return await lord.setEncoderSettings(args);
    });

    registerReceive("genericVideoEncoderCopyLogsToClipboard", async (_event, args) => {
        await lord.copyLogsToClipboard(args);
    });

    registerReceive("genericVideoEncoderOpenLogs", async (_event, args) => {
        await lord.openLogs(args);
    });

    registerReceive("genericVideoEncoderResetEncoders", async (_event, args) => {
        await lord.resetEncoders(args);
    });

    registerReceive("genericVideoEncoderDeleteEncoders", async (_event, args) => {
        await lord.deleteEncoders(args);
    });
}
