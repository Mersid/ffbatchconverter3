import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GenericVideoEncoderReport } from "../../../shared/types/GenericVideoEncoderReport";

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
        }
    }
});

export const { addGenericVideoEncoderReport } = genericVideoEncoderReportsSlice.actions;
