import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import EncoderCreationPage from "@renderer/pages/EncoderCreationPage";
import { useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";

export default function EncoderBase(): ReactElement {
    const params = useParams();
    const creationData = useSelector((state: RootState) => state.encoderCreationData).find(data => data.id === params.id);

    useEffect(() => {
        window.api.send.ping(`${params.id} mounted`);

        return () => {
            window.api.send.ping(`${params.id} unmounted`);
        };
    });

    const shouldShowCreationPage = () => {
        // If we don't have the key, this is a new encoder. Display the page.
        if (!creationData) {
            return true;
        }

        // Otherwise, if we already have the key, but it's not marked as completed, user likely switched out and back. Show it again with existing data.
        if (creationData.encoderCreated == false) {
            return true;
        }

        return false;
    };

    return (
        // If we don't have the key, switching between consecutive creation pages will retain data in the form!
        <div className={"pl-1"} key={params.id}>
            <p>Hello world!</p>
            <p className={"text-blue-300"}>{params.id}</p>
            {
                shouldShowCreationPage() ?
                    <EncoderCreationPage />
                    : <></>
            }
        </div>
    );
}
