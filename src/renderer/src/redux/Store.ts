import { configureStore } from "@reduxjs/toolkit";
import { tabSlice } from "./TabSlice";

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const store = configureStore({
    reducer: {
        tabs: tabSlice.reducer
    }
});
