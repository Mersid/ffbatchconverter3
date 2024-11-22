import { EventChannel, FetchChannel, SendChannel } from "./channels";
import { ipcRenderer } from "electron";

/**
 * Helper function to register one-way calls from the renderer to the main process.
 * @param channel
 */
export function registerSend<T extends unknown[]>(channel: SendChannel): (...args: T) => void;
export function registerSend<T>(channel: SendChannel): (args: T) => void;
export function registerSend(channel: SendChannel) {
    return (...args: unknown[]) => {
        if (args.length === 1 && typeof args[0] === "object") {
            ipcRenderer.send(channel, args[0]);
        } else {
            ipcRenderer.send(channel, ...args);
        }
    };
}

/**
 * Helper function to register one-way calls from the main process to the renderer.
 * @param channel
 */
export function registerEvent<T extends unknown[]>(channel: EventChannel): (callback: (event: Electron.IpcRendererEvent, ...args: T) => void) => void;
export function registerEvent<T>(channel: EventChannel): (callback: (event: Electron.IpcRendererEvent, args: T) => void) => void;
export function registerEvent(channel: EventChannel) {
    return (callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => {
        ipcRenderer.on(channel, callback);
    };
}

/**
 * Helper function to register two-way calls from the renderer to the main process and back.
 * @param channel
 */
export function registerFetch<T extends unknown[]>(channel: FetchChannel): (...args: T) => Promise<unknown>;
export function registerFetch<T>(channel: FetchChannel): (args: T) => Promise<unknown>;
export function registerFetch(channel: FetchChannel) {
    return (...args: unknown[]) => {
        return ipcRenderer.invoke(channel, ...args);
    };
}
