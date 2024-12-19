import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EncodeAndScoreEncoderReport } from "@shared/types/EncodeAndScoreEncoderReport";
import { EncodeAndScoreEncoderDeleteReport } from "@shared/types/EncodeAndScoreEncoderDeleteReport";

/**
 * Holds the latest copy of the report for each encoder, as identified by the encoder ID.
 */
export const encodeAndScoreEncoderReportsSlice = createSlice({
    name: "encodeAndScoreEncoderReports",
    initialState: [] as EncodeAndScoreEncoderReport[],
    reducers: {
        addEncodeAndScoreEncoderReport: (state, action: PayloadAction<EncodeAndScoreEncoderReport>) => {
            // If the data already exists, update it. Otherwise, add it.
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state[existingIndex] = action.payload;
                return;
            }
            state.push(action.payload);
        },

        removeEncodeAndScoreEncoderReport: (state, action: PayloadAction<EncodeAndScoreEncoderDeleteReport>) => {
            const existingIndex = state.findIndex(data => data.encoderId === action.payload.encoderId);
            if (existingIndex != -1) {
                state.splice(existingIndex, 1);
            }
        }
    }
});

export const { addEncodeAndScoreEncoderReport, removeEncodeAndScoreEncoderReport } = encodeAndScoreEncoderReportsSlice.actions;
