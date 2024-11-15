export default function EncoderCreationPage() {
    return (
        <>
            <div className={"flex justify-between bg-green-500 w-full"}>
                <div className={"flex-1 mr-2"}>
                    <label className={"pr-2"} htmlFor={"min"}>
                        Task name
                    </label>
                    <input
                        type={"text"}
                        id={"fromRange"}
                        name={"fromRange"}
                        className={`px-2 py-1 w-full text-gray-700 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500`}
                    />
                </div>
            </div>
        </>
    );
}
