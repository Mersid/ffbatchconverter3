import { contextBridge } from "electron";
import { registerSend } from "./registerRenderer";
import { SendChannelArgumentsType } from "./channels";

/**
 * Register one-way calls from the renderer to the main process here.
 */
const send = {
    ping: registerSend<SendChannelArgumentsType<"ping">>("ping"),
    log: registerSend<SendChannelArgumentsType<"log">>("log")
};

const events = {};

const fetch = {};

export const api = {
    send,
    events,
    fetch
};

contextBridge.exposeInMainWorld("api", api);
