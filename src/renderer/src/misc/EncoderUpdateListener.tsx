import { useEffect } from "react";

export default function EncoderUpdateListener() {
    useEffect(() => {
        window.api.events.genericVideoEncoderUpdate((_event, args) => {
            window.api.send.log(`Received encoder update: ${JSON.stringify(args)}`);
        });
    }, []);

    return <></>;
}


