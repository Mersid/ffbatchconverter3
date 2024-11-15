import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import EncoderCreationPage from "@renderer/pages/EncoderCreationPage";

export default function EncoderBase(): ReactElement {
    const params = useParams();

    useEffect(() => {
        window.api.send.ping(`${params.id} mounted`);

        return () => {
            window.api.send.ping(`${params.id} unmounted`);
        };
    });

    return (
        <>
            <p>Hello world!</p>
            <p className={"text-blue-300"}>{params.id}</p>
            {
                window.sessionStorage.getItem((`encoderCreationSettings_${params.id}`)) ?
                    <EncoderCreationPage />
                    : <></>
            }
            <EncoderCreationPage />
        </>
    );
}
