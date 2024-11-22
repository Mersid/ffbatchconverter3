import GenericVideoEncoderTable from "@renderer/components/GenericVideoEncoderTable";

export default function GenericVideoEncoderPage() {
    return (
        <div className={"pl-1"}>
            <p>Generic video encoder page!</p>
            <GenericVideoEncoderTable />
            <div className={"absolute bottom-0 left-64 right-0 bg-gray-50"}>
                <div className={"min-h-0.5 bg-gray-300"} />
                <div className={"flex flex-row"}>
                    <div className={""}>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Concurrency</label>
                                <input
                                    type={"text"}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Subdirectory</label>
                                <input
                                    type={"text"}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-64`}
                                />
                            </div>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block"}>Extension</label>
                                <input
                                    type={"text"}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-24`}
                                />
                            </div>
                        </div>
                        <div className={"flex items-center space-x-4"}>
                            <div className={"flex items-center"}>
                                <label className={"pr-2 inline-block min-w-24"}>Arguments</label>
                                <input
                                    type={"text"}
                                    className={`px-2 py-1 text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500 inline-block w-[654px]`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={"bg-green-300 w-full flex flex-col-reverse justify-end items-end"}>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add folders</button>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"}>Add files</button>
                        <button className={"bg-white hover:bg-gray-300 py-0 px-2 rounded"} onClick={() => {
                            window.api.send.log("Starting!");
                        }}>Start</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
