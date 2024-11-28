import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { EncoderCreationPageSerializationData } from "@renderer/misc/EncoderCreationPageSerializationData";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { addEncoderCreationData } from "@renderer/redux/EncoderCreationDataSlice";
import { updateTitle } from "@renderer/redux/TabSlice";
import { Tab } from "@renderer/misc/Tab";
import { addEncoderMap } from "@renderer/redux/EncoderMapDataSlice";

export default function EncoderCreationPage() {
    const params = useParams();
    const creationData = useSelector((state: RootState) => state.encoderCreationData).find(data => data.id === params.id);
    const dispatch = useDispatch();

    const tab = useSelector((state: RootState) => state.tabs).find(tab => tab.id == parseInt(params.id as string)) as Tab;

    const [taskName, setTaskName] = useState(`New task ${params.id}`);
    const [taskType, setTaskType] = useState(creationData ? creationData.taskType : 1);
    const [ffmpegPath, setFFmpegPath] = useState(creationData ? creationData.ffmpegPath : "");
    const [ffprobePath, setFFprobePath] = useState(creationData ? creationData.ffprobePath : "");

    const [encoderCreated, setEncoderCreated] = useState(false);

    // Load existing data if it exists
    useEffect(() => {
        if (creationData) {
            setTaskName(() => creationData.taskName);
            setTaskType(() => creationData.taskType);
            setFFmpegPath(() => creationData.ffmpegPath);
            setFFprobePath(() => creationData.ffprobePath);
        } else {
            window.api.fetch.getExternalLibraryPaths().then(data => {
                setFFmpegPath(() => data.ffmpegPath);
                setFFprobePath(() => data.ffprobePath);
            });
        }
    }, []);

    // Save data to Redux when it changes
    useEffect(() => {
        const serializedData: EncoderCreationPageSerializationData = {
            encoderCreated,
            id: params.id as string,
            taskName,
            taskType,
            ffmpegPath,
            ffprobePath
        };

        // Update the sidebar title as well
        dispatch(
            updateTitle({
                ...tab,
                title: taskName
            })
        );

        dispatch(addEncoderCreationData(serializedData));
    }, [taskName, taskType, ffmpegPath, ffprobePath, encoderCreated]);

    return (
        <>
            <div className={"w-full"}>
                <div className={"mr-2 mb-1 flex items-center"}>
                    <label className={"pr-2 inline-block min-w-32"} htmlFor={"taskName"}>
                        Task name
                    </label>
                    <input
                        type={"text"}
                        id={"taskName"}
                        name={"taskName"}
                        value={taskName}
                        onChange={e => setTaskName(() => e.target.value)}
                        className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                    />
                </div>

                <div className={"mr-2 mb-1 flex items-center pb-8"}>
                    <label className={"pr-2 inline-block min-w-32"} htmlFor={"taskType"}>
                        Task type
                    </label>
                    <select
                        id={"taskType"}
                        name={"taskType"}
                        value={taskType}
                        onChange={e => setTaskType(parseInt(e.target.value))}
                        className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                    >
                        <option value={1}>Encode videos</option>
                        <option value={2}>Encode videos, then score with VMAF</option>
                        <option value={3}>Target a specific VMAF score</option>
                    </select>
                </div>
            </div>

            <div className={"mr-2 mb-1 flex items-center"}>
                <label className={"pr-2 inline-block min-w-32"} htmlFor={"ffmpegPath"}>
                    FFmpeg path
                </label>
                <input
                    type={"text"}
                    id={"ffmpegPath"}
                    name={"ffmpegPath"}
                    value={ffmpegPath}
                    onChange={e => setFFmpegPath(e.target.value)}
                    className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                />
            </div>

            <div className={"mr-2 mb-1 flex items-center"}>
                <label className={"pr-2 inline-block min-w-32"} htmlFor={"ffprobePath"}>
                    FFprobe path
                </label>
                <input
                    type={"text"}
                    id={"ffprobePath"}
                    name={"ffprobePath"}
                    value={ffprobePath}
                    onChange={e => setFFprobePath(e.target.value)}
                    className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                />
            </div>

            <div className={"absolute right-0 bottom-0 mb-4 mr-4"}>
                <button
                    className={"bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"}
                    onClick={async () => {
                        setEncoderCreated(() => true);

                        if (taskType == 1) {
                            // Generic encoder
                            const controllerId = await window.api.fetch.createGenericVideoEncoder({
                                ffmpegPath,
                                ffprobePath
                            });

                            // The above call to the main process will return the controller ID. Track this in Redux.
                            dispatch(
                                addEncoderMap({
                                    pageId: params.id as string,
                                    controllerId: controllerId
                                })
                            );
                        }
                    }}
                >
                    Submit {params.id}
                </button>
            </div>
        </>
    );
}
