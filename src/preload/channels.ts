import { ExternalLibraryPathsInfo } from "../shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderReport } from "../shared/types/GenericVideoEncoderReport";

/**
 * Declares the names of channels that can be used to send messages from the renderer to the main process.
 */
export type SendChannel = "ping" | "log";

/**
 * Declares the types of data that can be sent through the channels declared in SendChannel.
 */
type SendChannelTypes = {
    ping: void;
    log: unknown;
};

export type SendChannelArgumentsType<T extends SendChannel> = SendChannelTypes[T];

/**
 * Declares the names of channels that can be used to listen for messages sent from the main process to the renderer.
 */
export type EventChannel = "genericVideoEncoderUpdate";

type EventChannelTypes = {
    genericVideoEncoderUpdate: GenericVideoEncoderReport;
};

export type EventChannelArgumentsType<T extends EventChannel> = EventChannelTypes[T];

/**
 * Declares the names of channels that can be used to fetch data from the main process.
 */
export type FetchChannel = "getExternalLibraryPaths";

type FetchChannelTypes = {
    getExternalLibraryPaths: [void, ExternalLibraryPathsInfo];
};

export type FetchChannelRequestArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][0];
export type FetchChannelResponseArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][1];
