import { contextBridge } from "electron";
import { registerEvent, registerFetch, registerSend } from "./registerRenderer2";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend("ping"),
    log: registerSend("log"),
    addPathsToGenericVideoEncoder: registerSend("genericVideoEncoderAddPaths"),
    setSettingsForGenericVideoEncoder: registerSend("genericVideoEncoderUpdateSettings"),
    copyLogsToClipboard: registerSend("genericVideoEncoderCopyLogsToClipboard"),
    openLogs: registerSend("genericVideoEncoderOpenLogs"),
    resetEncoders: registerSend("genericVideoEncoderResetEncoders"),
    deleteEncoders: registerSend("genericVideoEncoderDeleteEncoders")
};

const events = {
    genericVideoEncoderUpdate: registerEvent("genericVideoEncoderUpdate"),
    genericVideoEncoderDelete: registerEvent("genericVideoEncoderDelete")
};

const fetch = {
    getExternalLibraryPaths: registerFetch("getExternalLibraryPaths"),
    createGenericVideoEncoder: registerFetch("createGenericVideoEncoder"),
    setEncoderActive: registerFetch("setEncoderActive")
};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
