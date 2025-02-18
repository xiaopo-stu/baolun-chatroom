import { FormEvent, FunctionComponent, useEffect, useRef, useState } from "react";

import { setAgent } from "../core/agent/hook";
import { HostAgent } from "../core/agent/host";
import { PlayerAgent } from "../core/agent/player";
import { connection } from "../core/connection";

import brandDark from "@assets/images/brand-dark.svg";

import styles from "./homepage.module.css";

export const Homepage: FunctionComponent = function () {

    const roomCodeRef = useRef<HTMLTextAreaElement>(null);

    const nameRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState<string>("");

    function handleName(event: FormEvent) {
        event.preventDefault();
        const name = nameRef.current?.value.trim();
        if (name) setName(name);
    }

    const [connectionReady, setConnectionReadyState] = useState(connection.isReady);
    const [attempingJoin, setJoinState] = useState(false);

    function handleJoinRoom() {
        const roomCode = roomCodeRef.current?.value.trim();
        if (roomCode) {
            const agent = new PlayerAgent(name, roomCode);
            setJoinState(true);
            agent.whenConnectionReady()
                .then(() => setAgent(agent))
                .catch((err) => { console.error(err); setJoinState(false) });
        };
    }

    function handleCreateRoom() {
        setAgent(new HostAgent(name));
    }

    useEffect(() => {
        if (connectionReady) return;
        const onReady = () => setConnectionReadyState(true);
        connection.on("ready", onReady);
        return () => void connection.off("ready", onReady);
    }, [connectionReady]);

    return (
        <div className={styles.container}>
            <img className={styles.brand} src={brandDark} alt="Logo" />
            {!name ? (
                <>
                    <p className={styles.hint}>暱稱</p>
                    <form className={styles.center} onSubmit={handleName}>
                        <input  maxLength={15} autoComplete="off" className={styles.inputCode} ref={nameRef} />
                        <button type="submit" className={styles.into}>➡️</button>
                    </form>
                </>
            ) : (
                <>
                    <p className={styles.hint}>房間代碼</p>
                    <textarea className={styles.code} ref={roomCodeRef} />
                    <button className={styles.button} onClick={handleJoinRoom} disabled={!connectionReady || attempingJoin}>
                        進入房間
                    </button>
                    <div className={styles.divider}>OR</div>
                    <button className={styles.button} onClick={handleCreateRoom} disabled={!connectionReady || attempingJoin}>
                        建立房間
                    </button>
                </>
            )}
        </div>
    );
}

export default Homepage;