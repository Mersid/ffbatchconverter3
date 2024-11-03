import { ReactElement } from "react";

export default function App2(): ReactElement {
    const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

    return (
        <>
            <p>Hello world!</p>
        </>
    );
}
