import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { EncoderCreationPageSerializationData } from "@renderer/misc/EncoderCreationPageSerializationData";

export default function EncoderCreationPage() {
    const params = useParams();

    const [taskName, setTaskName] = useState("");
    const [taskType, setTaskType] = useState(1);
    const [ffmpegPath, setFFmpegPath] = useState("");
    const [ffprobePath, setFFprobePath] = useState("");

    useEffect(() => {
        const settings = window.sessionStorage.getItem(`encoderCreationSettings_${params.id}`);
        if (settings) {
            const parsedSettings = JSON.parse(settings) as EncoderCreationPageSerializationData;
            setTaskName(parsedSettings.taskName);
            setTaskType(parsedSettings.taskType);
            setFFmpegPath(parsedSettings.ffmpegPath);
            setFFprobePath(parsedSettings.ffprobePath);
        }

        return () => {
            const serializedData: EncoderCreationPageSerializationData = {
                encoderCreated: false,
                id: params.id as string,
                taskName,
                taskType,
                ffmpegPath,
                ffprobePath
            };
            window.sessionStorage.setItem(`encoderCreationSettings_${params.id}`, JSON.stringify(serializedData));
        };
    }, []);

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
                        onChange={e => setTaskName(e.target.value)}
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
                <button className={"bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"}>
                    Submit {params.id}
                </button>
            </div>
        </>
    );
}
