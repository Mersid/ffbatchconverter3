import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { VMAFTargetVideoEncoderReport } from "@shared/types/VMAFTargetVideoEncoderReport";
import { VMAFTargetVideoEncoderDeleteReport } from "@shared/types/VMAFTargetVideoEncoderDeleteReport";

/**
 * Holds the latest copy of the report for each encoder, as identified by the encoder ID.
 */
export const vmafTargetVideoEncoderReportsSlice = createSlice({
    name: "vmafTargetVideoEncoderReports",
    initialState: [] as VMAFTargetVideoEncoderReport[],
    reducers: {
        addVMAFTargetVideoEncoderReport: (state, action: PayloadAction<VMAFTargetVideoEncoderReport>) => {
            // If the data already exists, update it. Otherwise, add it.
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state[existingIndex] = action.payload;
                return;
            }
            state.push(action.payload);
        },

        removeVMAFTargetVideoEncoderReport: (state, action: PayloadAction<VMAFTargetVideoEncoderDeleteReport>) => {
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state.splice(existingIndex, 1);
            }
        }
    }
});

export const { addVMAFTargetVideoEncoderReport, removeVMAFTargetVideoEncoderReport } = vmafTargetVideoEncoderReportsSlice.actions;
