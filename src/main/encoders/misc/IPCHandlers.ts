import { ipcMain } from "electron";
import { SendChannel } from "../../../preload/channels";
import { registerReceive } from "../../../preload/registerMain";

export function registerIPCHandlers(): void {
    registerReceive("ping", (_event, args) => {
        console.log(`pong ${args}`);
    });

    registerReceive("log", (_event, args) => {
        console.log(args);
    });
}
