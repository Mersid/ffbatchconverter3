import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EncoderStatus } from "@shared/types/EncoderStatus";

/**
 * Tracks whether the encoder is active (encoding) or not.
 */
export const encoderStatusSlice = createSlice({
    name: "encoderStatus",
    initialState: [] as EncoderStatus[],
    reducers: {
        setEncoderStatus: (state, action: PayloadAction<EncoderStatus>) => {
            const index = state.findIndex(status => status.controllerId === action.payload.controllerId);
            if (index !== -1) {
                state[index] = action.payload;
            } else {
                state.push(action.payload);
            }
        }
    }
});

export const { setEncoderStatus } = encoderStatusSlice.actions;
