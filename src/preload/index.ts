import { contextBridge } from "electron";
import { registerEvent, registerFetch, registerSend } from "./registerRenderer2";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend("ping"),
    log: registerSend("log"),

    genericVideoEncoderAddPaths: registerSend("genericVideoEncoderAddPaths"),
    genericVideoEncoderDeleteEncoders: registerSend("genericVideoEncoderDeleteEncoders"),
    genericVideoEncoderUpdateSettings: registerSend("genericVideoEncoderUpdateSettings"),
    genericVideoEncoderResetEncoders: registerSend("genericVideoEncoderResetEncoders"),
    genericVideoEncoderCopyLogsToClipboard: registerSend("genericVideoEncoderCopyLogsToClipboard"),
    genericVideoEncoderOpenLogs: registerSend("genericVideoEncoderOpenLogs"),

    encodeAndScoreEncoderAddPaths: registerSend("encodeAndScoreEncoderAddPaths"),
    encodeAndScoreEncoderDeleteEncoders: registerSend("encodeAndScoreEncoderDeleteEncoders"),
    encodeAndScoreEncoderUpdateSettings: registerSend("encodeAndScoreEncoderUpdateSettings"),
    encodeAndScoreEncoderResetEncoders: registerSend("encodeAndScoreEncoderResetEncoders"),
    encodeAndScoreEncoderCopyLogsToClipboard: registerSend("encodeAndScoreEncoderCopyLogsToClipboard"),
    encodeAndScoreEncoderOpenLogs: registerSend("encodeAndScoreEncoderOpenLogs"),

    vmafTargetVideoEncoderAddPaths: registerSend("vmafTargetVideoEncoderAddPaths"),
    vmafTargetVideoEncoderDeleteEncoders: registerSend("vmafTargetVideoEncoderDeleteEncoders"),
    vmafTargetVideoEncoderUpdateSettings: registerSend("vmafTargetVideoEncoderUpdateSettings"),
    vmafTargetVideoEncoderResetEncoders: registerSend("vmafTargetVideoEncoderResetEncoders"),
    vmafTargetVideoEncoderCopyLogsToClipboard: registerSend("vmafTargetVideoEncoderCopyLogsToClipboard"),
    vmafTargetVideoEncoderOpenLogs: registerSend("vmafTargetVideoEncoderOpenLogs")
};

const events = {
    genericVideoEncoderUpdate: registerEvent("genericVideoEncoderUpdate"),
    genericVideoEncoderDelete: registerEvent("genericVideoEncoderDelete"),

    encodeAndScoreEncoderUpdate: registerEvent("encodeAndScoreEncoderUpdate"),
    encodeAndScoreEncoderDelete: registerEvent("encodeAndScoreEncoderDelete"),

    vmafTargetVideoEncoderUpdate: registerEvent("vmafTargetVideoEncoderUpdate"),
    vmafTargetVideoEncoderDelete: registerEvent("vmafTargetVideoEncoderDelete")
};

const fetch = {
    getExternalLibraryPaths: registerFetch("getExternalLibraryPaths"),

    genericVideoEncoderSetEncoderActive: registerFetch("genericVideoEncoderSetEncoderActive"),
    encodeAndScoreEncoderSetEncoderActive: registerFetch("encodeAndScoreEncoderSetEncoderActive"),

    createGenericVideoEncoder: registerFetch("createGenericVideoEncoder"),
    createEncodeAndScoreEncoder: registerFetch("createEncodeAndScoreEncoder"),
    createVmafTargetVideoEncoder: registerFetch("createVmafTargetVideoEncoder")
};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
