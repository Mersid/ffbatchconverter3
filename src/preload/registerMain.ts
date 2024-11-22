import {
    FetchChannel,
    FetchChannelRequestArgumentsType,
    FetchChannelResponseArgumentsType,
    SendChannel,
    SendChannelArgumentsType
} from "./channels";
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from "electron";

/**
 * Helper function to register a listener for one-way calls from the renderer to the main process.
 * @param channel
 * @param callback
 */
export function registerReceive<T extends SendChannel>(channel: T, callback: (event: IpcMainEvent, args: SendChannelArgumentsType<T>) => void): void {
    ipcMain.on(channel, (event, args) => {
        callback(event, args);
    });
}

export function registerFetch<T extends FetchChannel>(
    channel: T,
    callback: (event: IpcMainInvokeEvent, args: FetchChannelRequestArgumentsType<T>) => Promise<FetchChannelResponseArgumentsType<T>>
): void {
    ipcMain.handle(channel, async (event, args) => {
        return await callback(event, args);
    });
}
