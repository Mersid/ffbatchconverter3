import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addGenericVideoEncoderReport, removeGenericVideoEncoderReport } from "@renderer/redux/GenericVideoEncoderReportsSlice";
import { addEncodeAndScoreEncoderReport, removeEncodeAndScoreEncoderReport } from "@renderer/redux/EncodeAndScoreEncoderReportsSlice";
import { addVMAFTargetVideoEncoderReport, removeVMAFTargetVideoEncoderReport } from "@renderer/redux/VMAFTargetVideoEncoderReportsSlice";

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
                dispatch(
                    removeGenericVideoEncoderReport({
                        controllerId: args.controllerId,
                        encoderId
                    })
                );
            }
        });

        window.api.events.encodeAndScoreEncoderUpdate((_event, args) => {
            window.api.send.log(`Received encoder update: ${JSON.stringify(args)}`);
            dispatch(addEncodeAndScoreEncoderReport(args));
        });

        window.api.events.encodeAndScoreEncoderDelete((_event, args) => {
            window.api.send.log(`Received encoder delete: ${JSON.stringify(args)}`);

            for (const encoderId of args.encoderIds) {
                dispatch(
                    removeEncodeAndScoreEncoderReport({
                        controllerId: args.controllerId,
                        encoderId
                    })
                );
            }
        });

        window.api.events.vmafTargetVideoEncoderUpdate((_event, args) => {
            window.api.send.log(`Received VMAF encoder update: ${JSON.stringify(args)}`);
            dispatch(addVMAFTargetVideoEncoderReport(args));
        });

        window.api.events.vmafTargetVideoEncoderDelete((_event, args) => {
            window.api.send.log(`Received VMAF encoder delete: ${JSON.stringify(args)}`);

            for (const encoderId of args.encoderIds) {
                dispatch(
                    removeVMAFTargetVideoEncoderReport({
                        controllerId: args.controllerId,
                        encoderId
                    })
                );
            }
        });
    }, []);

    return <></>;
}
