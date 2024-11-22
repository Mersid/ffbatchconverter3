import {
    EventChannel,
    EventChannelArgumentsType,
    FetchChannel,
    FetchChannelRequestArgumentsType,
    FetchChannelResponseArgumentsType,
    SendChannel,
    SendChannelArgumentsType
} from "./channels";
import { ipcRenderer } from "electron";

/**
 * Helper function to register one-way calls from the renderer to the main process.
 * @param channel
 */
export function registerSend<T extends SendChannel>(channel: T) {
    return (...args: SendChannelArgumentsType<T> extends void ? [] : [SendChannelArgumentsType<T>]) => {
        ipcRenderer.send(channel, ...args);
    };
}

/**
 * Helper function to register one-way calls from the main process to the renderer.
 * @param channel
 */
export function registerEvent<T extends EventChannel>(channel: T) {
    return (callback: (event: Electron.IpcRendererEvent, ...args: EventChannelArgumentsType<T> extends void ? [] : [EventChannelArgumentsType<T>]) => void) => {
        ipcRenderer.on(channel, (event, ...args: EventChannelArgumentsType<T> extends void ? [] : [EventChannelArgumentsType<T>]) => callback(event, ...args));
    };
}

/**
 * Helper function to register two-way calls from the renderer to the main process and back.
 * @param channel
 */
export function registerFetch<T extends FetchChannel>(channel: T) {
    return (...args: FetchChannelRequestArgumentsType<T> extends void ? [] : [FetchChannelRequestArgumentsType<T>]) => {
        return ipcRenderer.invoke(channel, ...args) as Promise<FetchChannelResponseArgumentsType<T>>;
    };
}
