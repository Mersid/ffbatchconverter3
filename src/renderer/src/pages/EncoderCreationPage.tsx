import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { EncoderCreationPageSerializationData } from "@renderer/misc/EncoderCreationPageSerializationData";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { addEncoderCreationData } from "@renderer/redux/EncoderCreationDataSlice";
import { updateTitle } from "@renderer/redux/TabSlice";
import { Tab } from "@renderer/misc/Tab";

export default function EncoderCreationPage() {
    const params = useParams();
    const creationData = useSelector((state: RootState) => state.encoderCreationData).find(data => data.id === params.id);
    const dispatch = useDispatch();

    const tab = useSelector((state: RootState) => state.tabs).find(tab => tab.id == parseInt(params.id as string)) as Tab;

    const [taskName, setTaskName] = useState(`New task ${params.id}`);
    const [taskType, setTaskType] = useState(1);
    const [ffmpegPath, setFFmpegPath] = useState("");
    const [ffprobePath, setFFprobePath] = useState("");

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
                setFFmpegPath(() => data.ffmpeg);
                setFFprobePath(() => data.ffprobe);
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
                        id={`taskName_${params.id}`}
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
                        id={`taskType_${params.id}`}
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
                    id={`ffmpegPath_${params.id}`}
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
                    id={`ffprobePath_${params.id}`}
                    name={"ffprobePath"}
                    value={ffprobePath}
                    onChange={e => setFFprobePath(e.target.value)}
                    className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block`}
                />
            </div>

            <div className={"absolute right-0 bottom-0 mb-4 mr-4"}>
                <button
                    className={"bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"}
                    onClick={() => {
                        setEncoderCreated(() => true);
                    }}
                >
                    Submit {params.id}
                </button>
            </div>
        </>
    );
}
