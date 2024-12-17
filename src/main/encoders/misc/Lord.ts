/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { ExternalLibraryPathsInfo } from "@shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";
import { GenericVideoEncoderPathUpdateInfo } from "@shared/types/GenericVideoEncoderPathUpdateInfo";
import { sendToRenderer } from "../../../preload/registerMain";
import { EncoderStatus } from "@shared/types/EncoderStatus";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { GenericVideoEncoderCopyLogsToClipboardInfo } from "@shared/types/GenericVideoEncoderCopyLogsToClipboardInfo";
import { GenericVideoEncoderOpenLogsInfo } from "@shared/types/GenericVideoEncoderOpenLogsInfo";
import { clipboard } from "electron";
import { openLog } from "./LogHelper";
import { GenericVideoEncoderResetEncodersInfo } from "@shared/types/GenericVideoEncoderResetEncodersInfo";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();

export const lord = {
    createNewGenericVideoEncoderController,
    addPathsToGenericVideoEncoder,
    setEncoderActive,
    setEncoderSettings,
    copyLogsToClipboard,
    openLogs,
    resetEncoders,
    deleteEncoders
};

/**
 * Creates a new GenericVideoEncoderController and registers it. The ID of the controller is returned.
 */
async function createNewGenericVideoEncoderController({ ffprobePath, ffmpegPath }: ExternalLibraryPathsInfo): Promise<string> {
    const controller = await GenericVideoEncoderController.createNew(ffprobePath, ffmpegPath);
    controller.on("update", reportId => {
        sendToRenderer("genericVideoEncoderUpdate", controller.getReportFor(reportId));
    });

    const id = controller.controllerId;
    genericVideoEncoders.set(id, controller);
    return id;
}

async function addPathsToGenericVideoEncoder(info: GenericVideoEncoderPathUpdateInfo): Promise<void> {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    const reports = await controller.addEncoders(info.paths);
    // Send the initial reports to the renderer. This allows the UI to generate initial rows for the encoders.
    reports.forEach(report => {
        sendToRenderer("genericVideoEncoderUpdate", report);
    });
}

async function setEncoderActive(status: EncoderStatus): Promise<EncoderStatus> {
    const controller = genericVideoEncoders.get(status.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${status.controllerId} found.`);
    }

    if (status.encoderActive) {
        await controller.startEncoding();
    } else {
        await controller.stopEncoding();
    }

    return {
        controllerId: controller.controllerId,
        encoderActive: controller.isEncoding
    };
}

async function setEncoderSettings(settings: GenericVideoEncoderSettings): Promise<void> {
    const controller = genericVideoEncoders.get(settings.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${settings.controllerId} found.`);
    }

    controller.concurrency = settings.concurrency;
    controller.outputSubdirectory = settings.subdirectory;
    controller.extension = settings.extension;
    controller.ffmpegArguments = settings.ffmpegArguments;
}

async function copyLogsToClipboard(info: GenericVideoEncoderCopyLogsToClipboardInfo) {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    const logs = controller.getLogsFor(info.encoderId);
    clipboard.write({ text: logs });
}

async function openLogs(info: GenericVideoEncoderOpenLogsInfo) {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    for (const encoderId of info.encoderIds) {
        const logs = controller.getLogsFor(encoderId);
        openLog(logs).then(() => {});
    }
}

async function resetEncoders(info: GenericVideoEncoderResetEncodersInfo) {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    controller.resetEncoders(info.encoderIds);
}

async function deleteEncoders(info: GenericVideoEncoderResetEncodersInfo) {
    const controller = genericVideoEncoders.get(info.controllerId);
    if (!controller) {
        throw new Error(`No controller with ID ${info.controllerId} found.`);
    }

    const removedIds = controller.deleteEncoders(info.encoderIds);

    const deleteInfo: GenericVideoEncoderResetEncodersInfo = {
        controllerId: info.controllerId,
        encoderIds: removedIds
    };

    sendToRenderer("genericVideoEncoderDelete", deleteInfo);
}
