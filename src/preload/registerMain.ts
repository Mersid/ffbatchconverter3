import { SendChannel, SendChannelArgumentsType } from "./channels";
import { ipcMain, IpcMainEvent } from "electron";

/**
 * Helper function to register a listener for one-way calls from the renderer to the main process.
 * @param channel
 * @param callback
 */
export function registerReceive<C extends SendChannel>(channel: C, callback: (event: IpcMainEvent, args: SendChannelArgumentsType<C>) => void): void {
    ipcMain.on(channel, (event, args) => {
        callback(event, args);
    });
}
