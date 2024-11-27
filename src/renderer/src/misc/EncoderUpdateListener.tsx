import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addGenericVideoEncoderReport } from "@renderer/redux/GenericVideoEncoderReportsSlice";

export default function EncoderUpdateListener() {
    const dispatch = useDispatch();

    useEffect(() => {
        window.api.events.genericVideoEncoderUpdate((_event, args) => {
            window.api.send.log(`Received encoder update: ${JSON.stringify(args)}`);
            dispatch(addGenericVideoEncoderReport(args));
        });
    }, []);

    return <></>;
}
