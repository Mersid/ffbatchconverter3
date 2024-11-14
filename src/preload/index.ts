import { contextBridge } from "electron";
import { registerSend } from "./register";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend("ping")
};

const events = {};

const fetch = {};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
