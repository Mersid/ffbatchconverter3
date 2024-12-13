import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GenericVideoEncoderReport } from "@shared/types/GenericVideoEncoderReport";
import { GenericVideoEncoderDeleteReport } from "@shared/types/GenericVideoEncoderDeleteReport";

export const genericVideoEncoderReportsSlice = createSlice({
    name: "genericVideoEncoderReports",
    initialState: [] as GenericVideoEncoderReport[],
    reducers: {
        addGenericVideoEncoderReport: (state, action: PayloadAction<GenericVideoEncoderReport>) => {
            // If the data already exists, update it. Otherwise, add it.
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state[existingIndex] = action.payload;
                return;
            }
            state.push(action.payload);
        },

        removeGenericVideoEncoderReport: (state, action: PayloadAction<GenericVideoEncoderDeleteReport>) => {
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state.splice(existingIndex, 1);
            }
        }
    }
});

export const { addGenericVideoEncoderReport, removeGenericVideoEncoderReport } = genericVideoEncoderReportsSlice.actions;
