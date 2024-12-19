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

    registerReceive("genericVideoEncoderAddPaths", async (_event, args) => {
        return await lord.genericVideoEncoderAddPaths(args);
    });
    registerReceive("genericVideoEncoderDeleteEncoders", async (_event, args) => {
        await lord.genericVideoEncoderDeleteEncoders(args);
    });
    registerReceive("genericVideoEncoderUpdateSettings", async (_event, args) => {
        return await lord.genericVideoEncoderUpdateSettings(args);
    });
    registerReceive("genericVideoEncoderResetEncoders", async (_event, args) => {
        await lord.genericVideoEncoderResetEncoders(args);
    });
    registerReceive("genericVideoEncoderCopyLogsToClipboard", async (_event, args) => {
        await lord.genericVideoEncoderCopyLogsToClipboard(args);
    });
    registerReceive("genericVideoEncoderOpenLogs", async (_event, args) => {
        await lord.genericVideoEncoderOpenLogs(args);
    });

    registerReceive("encodeAndScoreEncoderAddPaths", async (_event, args) => {
        return await lord.encodeAndScoreEncoderAddPaths(args);
    });
    registerReceive("encodeAndScoreEncoderDeleteEncoders", async (_event, args) => {
        await lord.encodeAndScoreEncoderDeleteEncoders(args);
    });
    registerReceive("encodeAndScoreEncoderUpdateSettings", async (_event, args) => {
        return await lord.encodeAndScoreEncoderUpdateSettings(args);
    });
    registerReceive("encodeAndScoreEncoderResetEncoders", async (_event, args) => {
        await lord.encodeAndScoreEncoderResetEncoders(args);
    });
    registerReceive("encodeAndScoreEncoderCopyLogsToClipboard", async (_event, args) => {
        await lord.encodeAndScoreEncoderCopyLogsToClipboard(args);
    });
    registerReceive("encodeAndScoreEncoderOpenLogs", async (_event, args) => {
        await lord.encodeAndScoreEncoderOpenLogs(args);
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
    registerFetch("createEncodeAndScoreEncoder", async (_event, args) => {
        return await lord.createNewEncodeAndScoreEncoderController(args);
    });

    registerFetch("genericVideoEncoderSetEncoderActive", async (_event, args) => {
        return await lord.genericVideoEncoderSetEncoderActive(args);
    });
    registerFetch("encodeAndScoreEncoderSetEncoderActive", async (_event, args) => {
        return await lord.encodeAndScoreEncoderSetEncoderActive(args);
    });
}
