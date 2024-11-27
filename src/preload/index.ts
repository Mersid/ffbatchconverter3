import { contextBridge } from "electron";
import { registerEvent, registerFetch, registerSend } from "./registerRenderer2";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend("ping"),
    log: registerSend("log"),
    addPathsToGenericVideoEncoder: registerSend("addPathsToGenericVideoEncoder")
};

const events = {
    genericVideoEncoderUpdate: registerEvent("genericVideoEncoderUpdate")
};

const fetch = {
    getExternalLibraryPaths: registerFetch("getExternalLibraryPaths"),
    createGenericVideoEncoder: registerFetch("createGenericVideoEncoder")
};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
