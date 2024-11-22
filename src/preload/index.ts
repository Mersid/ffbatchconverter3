import { contextBridge } from "electron";
import { registerFetch, registerSend } from "./registerRenderer2";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend("ping"),
    log: registerSend("log")
};

const events = {};

const fetch = {
    getExternalLibraryPaths: registerFetch("getExternalLibraryPaths")
};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
