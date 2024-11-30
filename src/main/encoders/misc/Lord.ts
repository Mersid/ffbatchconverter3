/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { ExternalLibraryPathsInfo } from "../../../shared/types/ExternalLibraryPathsInfo";
import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";
import { GenericVideoEncoderPathUpdateInfo } from "../../../shared/types/GenericVideoEncoderPathUpdateInfo";
import { sendToRenderer } from "../../../preload/registerMain";
import { EncoderStatus } from "../../../renderer/src/misc/EncoderStatus";
import { GenericVideoEncoderSettings } from "../../../renderer/src/misc/GenericVideoEncoderSettings";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();

export const lord = {
    createNewGenericVideoEncoderController,
    addPathsToGenericVideoEncoder,
    setEncoderActive,
    setEncoderSettings
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

    const reports = await controller.addEntries(info.paths);
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
