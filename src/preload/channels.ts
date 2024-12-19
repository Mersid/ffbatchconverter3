import { ExternalLibraryPathsInfo } from "@shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";
import { GenericVideoEncoderPathUpdateInfo } from "@shared/types/GenericVideoEncoderPathUpdateInfo";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import { GenericVideoEncoderCopyLogsToClipboardInfo } from "@shared/types/GenericVideoEncoderCopyLogsToClipboardInfo";
import { GenericVideoEncoderOpenLogsInfo } from "@shared/types/GenericVideoEncoderOpenLogsInfo";
import { GenericVideoEncoderResetEncodersInfo } from "@shared/types/GenericVideoEncoderResetEncodersInfo";
import { GenericVideoEncoderDeleteEncodersInfo } from "@shared/types/GenericVideoEncoderDeleteEncodersInfo";
import { EncodeAndScoreEncoderPathUpdateInfo } from "@shared/types/EncodeAndScoreEncoderPathUpdateInfo";
import { EncodeAndScoreEncoderDeleteEncodersInfo } from "@shared/types/EncodeAndScoreEncoderDeleteEncodersInfo";
import { EncodeAndScoreEncoderSettings } from "@shared/types/EncodeAndScoreEncoderSettings";
import { EncodeAndScoreEncoderResetEncodersInfo } from "@shared/types/EncodeAndScoreEncoderResetEncodersInfo";
import {
    EncodeAndScoreEncoderCopyLogsToClipboardInfo
} from "@shared/types/EncodeAndScoreEncoderCopyLogsToClipboardInfo";
import { EncodeAndScoreEncoderOpenLogsInfo } from "@shared/types/EncodeAndScoreEncoderOpenLogsInfo";
import { EncodeAndScoreEncoderReport } from "@shared/types/EncodeAndScoreEncoderReport";

/**
 * Declares the names of channels that can be used to send messages from the renderer to the main process.
 */
export type SendChannel = keyof SendChannelTypes;

/**
 * Declares the types of data that can be sent through the channels declared in SendChannel.
 */
type SendChannelTypes = {
    ping: void;
    log: unknown;

    genericVideoEncoderAddPaths: GenericVideoEncoderPathUpdateInfo;
    genericVideoEncoderDeleteEncoders: GenericVideoEncoderDeleteEncodersInfo;
    genericVideoEncoderUpdateSettings: GenericVideoEncoderSettings;
    genericVideoEncoderResetEncoders: GenericVideoEncoderResetEncodersInfo;
    genericVideoEncoderCopyLogsToClipboard: GenericVideoEncoderCopyLogsToClipboardInfo;
    genericVideoEncoderOpenLogs: GenericVideoEncoderOpenLogsInfo;

    encodeAndScoreEncoderAddPaths: EncodeAndScoreEncoderPathUpdateInfo;
    encodeAndScoreEncoderDeleteEncoders: EncodeAndScoreEncoderDeleteEncodersInfo;
    encodeAndScoreEncoderUpdateSettings: EncodeAndScoreEncoderSettings;
    encodeAndScoreEncoderResetEncoders: EncodeAndScoreEncoderResetEncodersInfo;
    encodeAndScoreEncoderCopyLogsToClipboard: EncodeAndScoreEncoderCopyLogsToClipboardInfo;
    encodeAndScoreEncoderOpenLogs: EncodeAndScoreEncoderOpenLogsInfo;

    vmafTargetVideoEncoderAddPaths: never;
    vmafTargetVideoEncoderDeleteEncoders: never;
    vmafTargetVideoEncoderUpdateSettings: never;
    vmafTargetVideoEncoderResetEncoders: never;
    vmafTargetVideoEncoderCopyLogsToClipboard: never;
    vmafTargetVideoEncoderOpenLogs: never;

};

export type SendChannelArgumentsType<T extends SendChannel> = SendChannelTypes[T];

/**
 * Declares the names of channels that can be used to listen for messages sent from the main process to the renderer.
 */
export type EventChannel = keyof EventChannelTypes;

type EventChannelTypes = {
    genericVideoEncoderUpdate: GenericVideoEncoderReport;
    genericVideoEncoderDelete: GenericVideoEncoderDeleteEncodersInfo;

    encodeAndScoreEncoderUpdate: EncodeAndScoreEncoderReport;
    encodeAndScoreEncoderDelete: EncodeAndScoreEncoderDeleteEncodersInfo;

    vmafTargetVideoEncoderUpdate: never;
    vmafTargetVideoEncoderDelete: never;
};

export type EventChannelArgumentsType<T extends EventChannel> = EventChannelTypes[T];

/**
 * Declares the names of channels that can be used to fetch data from the main process.
 */
export type FetchChannel = keyof FetchChannelTypes;

type FetchChannelTypes = {
    getExternalLibraryPaths: [void, ExternalLibraryPathsInfo];

    createGenericVideoEncoder: [ExternalLibraryPathsInfo, string];
    createEncodeAndScoreEncoder: [ExternalLibraryPathsInfo, string];
    createVmafTargetVideoEncoder: never;

    genericVideoEncoderSetEncoderActive: [EncoderStatus, EncoderStatus];
    encodeAndScoreEncoderSetEncoderActive: [EncoderStatus, EncoderStatus];
    vmafTargetVideoEncoderSetEncoderActive: [EncoderStatus, EncoderStatus];
};

export type FetchChannelRequestArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][0];
export type FetchChannelResponseArgumentsType<T extends FetchChannel> = FetchChannelTypes[T][1];
