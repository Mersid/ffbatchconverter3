import GenericVideoEncoderTable from "@renderer/components/GenericVideoEncoderTable";
import { DragEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@renderer/redux/Store";
import { setEncoderStatus } from "@renderer/redux/EncoderStatusSlice";
import { setGenericVideoEncoderSettings } from "@renderer/redux/GenericVideoEncoderSettingsSlice";
import { GenericVideoEncoderSettings } from "@shared/types/GenericVideoEncoderSettings";
import { EncoderStatus } from "@shared/types/EncoderStatus";

export default function GenericVideoEncoderPage() {
    const params = useParams();
    const id = params.id;
    const controllerId = useSelector((state: RootState) => state.encoderMapData).find(data => data.pageId === id)?.controllerId as string;
    const encoderStatus = useSelector((state: RootState) => state.encoderStatus).find(status => status.controllerId === controllerId) as EncoderStatus;
    const settings = useSelector((state: RootState) => state.genericVideoEncoderSettings).find(s => s.controllerId === controllerId);
    const dispatch = useDispatch();

    const [concurrency, setConcurrency] = useState(settings ? settings.concurrency.toString() : "1");
    const [subdirectory, setSubdirectory] = useState(settings ? settings.subdirectory : "FFBatch");
    const [extension, setExtension] = useState(settings ? settings.extension : "mkv");
    const [ffmpegArguments, setFFmpegArguments] = useState(settings ? settings.ffmpegArguments : "-c:v libx265 -c:a aac");

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        window.api.send.log(`Dropped ${files.length} files!\n${JSON.stringify(files)}`);

        const filePaths: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                filePaths.push(file.path);
            } else {
                throw new Error(`File ${i} is null!`);
            }
        }

        window.api.send.addPathsToGenericVideoEncoder({
            controllerId,
            paths: filePaths
        });
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    console.log(controllerId);
    /**
     * Push settings to Redux store and send to main process.
     */
    const updateSettings = () => {
        const c = parseInt(concurrency);
        const settings: GenericVideoEncoderSettings = {
            controllerId,
            concurrency: isNaN(c) ? 1 : c,
            extension,
            ffmpegArguments,
            subdirectory
        };

        dispatch(setGenericVideoEncoderSettings(settings));
        window.api.send.setSettingsForGenericVideoEncoder(settings);
    };

    // On change, replicate changes to backing store and send to main process.
    useEffect(() => {
        updateSettings();
    }, [concurrency, subdirectory, extension, ffmpegArguments]);

    return (
        <div className={"pl-1 flex flex-col h-screen"}>
            <div className={"flex-1 overflow-y-auto"} onDragOver={event => handleDragOver(event)} onDrop={event => handleDrop(event)}>
                <p>Generic video encoder page! ID: {id}</p>
                <p>Controller ID: {controllerId}</p>
                <GenericVideoEncoderTable />
            </div>
            <div className={"bg-gray-50 sticky bottom-0"}>
                <div className={"min-h-0.5 bg-gray-300"} />
                <div className={"flex flex-row"}>
                    <div className={""}>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Concurrency</label>
                                <input
                                    type={"text"}
                                    value={concurrency}
                                    onChange={e => setConcurrency(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Subdirectory</label>
                                <input
                                    type={"text"}
                                    value={subdirectory}
                                    onChange={e => setSubdirectory(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-64`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Extension</label>
                                <input
                                    type={"text"}
                                    value={extension}
                                    onChange={e => setExtension(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                        </div>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Arguments</label>
                                <input
                                    type={"text"}
                                    value={ffmpegArguments}
                                    onChange={e => setFFmpegArguments(() => e.target.value)}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-[654px]`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={"bg-green-300 w-full flex flex-col-reverse justify-end items-end"}>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add folders</button>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add files</button>
                        <button
                            className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}
                            onClick={async () => {
                                const result = await window.api.fetch.setEncoderActive({
                                    controllerId,
                                    encoderActive: !encoderStatus?.encoderActive
                                });

                                console.log(result)
                                dispatch(setEncoderStatus(result));
                            }}
                        >
                            {encoderStatus?.encoderActive ? "Stop" : "Start"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
