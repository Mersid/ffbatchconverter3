import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addGenericVideoEncoderReport, removeGenericVideoEncoderReport } from "@renderer/redux/GenericVideoEncoderReportsSlice";

export default function EncoderUpdateListener() {
    const dispatch = useDispatch();

    useEffect(() => {
        window.api.events.genericVideoEncoderUpdate((_event, args) => {
            window.api.send.log(`Received encoder update: ${JSON.stringify(args)}`);
            dispatch(addGenericVideoEncoderReport(args));
        });

        window.api.events.genericVideoEncoderDelete((_event, args) => {
            window.api.send.log(`Received encoder delete: ${JSON.stringify(args)}`);

            for (const encoderId of args.encoderIds) {
                dispatch(removeGenericVideoEncoderReport({
                    controllerId: args.controllerId,
                    encoderId
                }));
            }
        });
    }, []);

    return <></>;
}
