/**
 * Not a particularly descriptive name, but this is the class that tracks all the controllers and handles
 * interfacing those with the IPC.
 */

import { GenericVideoEncoderController } from "../controllers/GenericVideoEncoderController";

const genericVideoEncoders = new Map<string, GenericVideoEncoderController>();

export const lord = {
};

function addGenericVideoEncoders(controller: GenericVideoEncoderController) {
    genericVideoEncoders.set(controller.controllerId, controller);
}
