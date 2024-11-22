export type SendChannel = "ping" | "log";

export type EventChannel = "";

export type FetchChannel = "";

export type SendChannelArgumentsType<T extends SendChannel> = T extends "ping" ? string : T extends "log" ? unknown : never;

// type SendChannelDataMap = {
//     ping: string;
//     log: unknown;
// }
//
// export type SendChannelArgumentsType<T extends SendChannel> = SendChannelDataMap[T];
