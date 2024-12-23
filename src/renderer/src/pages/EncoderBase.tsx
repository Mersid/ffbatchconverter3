import React, { ReactElement } from "react";
import { useParams } from "react-router-dom";
import EncoderCreationPage from "@renderer/pages/EncoderCreationPage";
import { useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import GenericVideoEncoderPage from "@renderer/pages/GenericVideoEncoderPage";
import NotImplementedPage from "@renderer/pages/NotImplementedPage";
import EncodeAndScoreEncoderPage from "@renderer/pages/EncodeAndScoreEncoderPage";
import VMAFTargetVideoEncoderPage from "@renderer/pages/VMAFTargetVideoEncoderPage";

export default function EncoderBase(): ReactElement {
    const params = useParams();
    const creationData = useSelector((state: RootState) => state.encoderCreationData).find(data => data.id === params.id);

    const shouldShowCreationPage = () => {
        // If we don't have the key, this is a new encoder. Display the page.
        if (!creationData) {
            return true;
        }

        // Otherwise, if we already have the key, but it's not marked as completed, user likely switched out and back. Show it again with existing data.
        return creationData.encoderCreated == false;
    };

    const showEncoderPage = () => {
        if (!creationData) {
            throw new Error("Creation data not found!");
        }
        if (creationData.taskType == 1) {
            return <GenericVideoEncoderPage />;
        } else if (creationData.taskType == 2) {
            return <EncodeAndScoreEncoderPage />;
        } else if (creationData.taskType == 3) {
            return <VMAFTargetVideoEncoderPage />;
        }

        return <NotImplementedPage />;
    };

    return (
        // If we don't have the key, switching between consecutive creation pages will retain data in the form!
        <div className={"pl-1"} key={params.id}>
            {shouldShowCreationPage() ? <EncoderCreationPage /> : showEncoderPage()}
        </div>
    );
}
