import { ReactElement } from "react"

export default function App(): ReactElement {
    const ipcHandle = (): void => window.electron.ipcRenderer.send("ping")

    return (
        <>
            <p>asdf</p>
        </>
    )
}
