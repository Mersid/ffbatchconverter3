import { configureStore } from "@reduxjs/toolkit";
import { tabSlice } from "./TabSlice";
import { encoderCreationDataSlice } from "./EncoderCreationDataSlice";
import { encoderMapDataSlice } from "@renderer/redux/EncoderMapDataSlice";
import { genericVideoEncoderReportsSlice } from "./GenericVideoEncoderReportsSlice";
import { encoderStatusSlice } from "@renderer/redux/EncoderStatusSlice";
import { genericVideoEncoderSettingsSlice } from "@renderer/redux/GenericVideoEncoderSettingsSlice";
import { encodeAndScoreEncoderSettingsSlice } from "./EncodeAndScoreEncoderSettingsSlice";
import { encodeAndScoreEncoderReportsSlice } from "./EncodeAndScoreEncoderReportsSlice";
import { vmafTargetVideoEncoderReportsSlice } from "@renderer/redux/VMAFTargetVideoEncoderReportsSlice";
import { vmafTargetVideoEncoderSettingsSlice } from "./VMAFTargetVideoEncoderSettingsSlice";

export type RootState = ReturnType<typeof store.getState>;

export const store = configureStore({
    reducer: {
        tabs: tabSlice.reducer,
        encoderCreationData: encoderCreationDataSlice.reducer,
        encoderMapData: encoderMapDataSlice.reducer,
        encoderStatus: encoderStatusSlice.reducer,
        genericVideoEncoderReports: genericVideoEncoderReportsSlice.reducer,
        genericVideoEncoderSettings: genericVideoEncoderSettingsSlice.reducer,
        encodeAndScoreEncoderReports: encodeAndScoreEncoderReportsSlice.reducer,
        encodeAndScoreEncoderSettings: encodeAndScoreEncoderSettingsSlice.reducer,
        vmafTargetVideoEncoderReports: vmafTargetVideoEncoderReportsSlice.reducer,
        vmafTargetVideoEncoderSettings: vmafTargetVideoEncoderSettingsSlice.reducer
    }
});
