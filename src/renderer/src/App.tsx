import { ReactElement, useEffect } from "react";

export default function App(): ReactElement {
    useEffect(() => {
        window.api.send.ping();
        console.log(window.api);
    });

    return (
        <>
            <p>asdf</p>
        </>
    );
}
