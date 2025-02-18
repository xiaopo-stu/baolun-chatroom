import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

import { AgentGameReadyState, InteractionAgent } from "@core/agent";
import { useAgent } from "@core/agent/hook";

import styles from "./waiting-info.module.css";
import { classname } from "@utils/classname";
import HostAgent from "@core/agent/host";

export const WaitingInfo: FunctionComponent = function () {
    const agent = useAgent()!;

    const [host, setHost] = useState(agent.getHost());
    const [readyParticipants, setReadyParticipants] = useState(agent.getReadyParticipants());
    const [unreadyParticipants, setUnreadyParticipants] = useState(agent.getUnreadyParticipants());
    const [spectators, setSpectators] = useState(agent.getSpectators());
    

    useEffect(() => {
        const onParticipantsChange = () => {
            setHost(agent.getHost());
            setReadyParticipants(agent.getReadyParticipants());
            setUnreadyParticipants(agent.getUnreadyParticipants());
            setSpectators(agent.getSpectators());
        };

        agent.on("update-participants", onParticipantsChange);
        return () => void agent.off("update-participants", onParticipantsChange);
    }, [agent, setHost, setReadyParticipants, setUnreadyParticipants]);

    return (
        <div className={styles.container}>
            <div className={styles.information}>
                <div className={styles.roomCode}>
                    <span>房間代碼</span>
                    <code>{agent.getRoomCode()}</code>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${agent.getRoomCode()}&qzone=0&margin=0&size=150x150&ecc=L`} alt="room code"></img>
                </div>

                {/* <div className={styles.online}>房主</div> */}
                <div className={styles.playerGroup}>房主</div>
                <div className={styles.player}>{host}</div>

                {
                    readyParticipants.length > 0 && <>
                        <div className={styles.playerGroup}>已準備 ({readyParticipants.length})</div>
                        {readyParticipants.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                    </>
                }
                {
                    unreadyParticipants.length > 0 && <>
                        <div className={styles.playerGroup}>未準備 ({unreadyParticipants.length})</div>
                        {unreadyParticipants.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                    </>
                }
                {
                    spectators.length > 0 && <>
                        <div className={styles.playerGroup}>旁觀 ({spectators.length})</div>
                        {spectators.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                    </>
                }
            </div>
            {
                agent.readyState === AgentGameReadyState.host ? (
                    <StartButton />
                ) : (
                    <ReadyButton />
                )
            }
        </div>
    );
};

const ReadyButton: FunctionComponent = function () {

    const agent = useAgent()!;
    const [readyState, setReadyState] = useState(agent.readyState);

    useEffect(() => {
        const onReadyStateChange = (state: AgentGameReadyState) => setReadyState(state);
        agent.on("ready-state-change", onReadyStateChange);
        return () => void agent.off("ready-state-change", onReadyStateChange);
    }, [agent, setReadyState]);

    switch (readyState) {
        case AgentGameReadyState.ready:
            return (
                <button
                    className={classname(styles.button, styles.ready)}
                    onClick={() => agent.setReadyState(AgentGameReadyState.spectator)}
                >
                    已準備
                </button>
            );
        case AgentGameReadyState.unready:
            return (
                <button
                    className={classname(styles.button, styles.unready)}
                    onClick={() => agent.setReadyState(AgentGameReadyState.ready)}
                >
                    未準備
                </button>
            );
        case AgentGameReadyState.spectator:
            return (
                <button
                    className={classname(styles.button, styles.spectator)}
                    onClick={() => agent.setReadyState(AgentGameReadyState.unready)}
                >
                    旁觀
                </button>
            );
        default:
            throw new Error("Invalid ready state");
    }
};

const StartButton: FunctionComponent = function () {

    const agent = useAgent()! as unknown as HostAgent;

    const [readyParticipants, setReadyParticipants] = useState(agent.getReadyParticipants());
    const [unreadyParticipants, setUnreadyParticipants] = useState(agent.getUnreadyParticipants());

    useEffect(() => {
        const onParticipantsChange = () => {
            setReadyParticipants(agent.getReadyParticipants());
            setUnreadyParticipants(agent.getUnreadyParticipants());
        };

        agent.on("update-participants", onParticipantsChange);
        return () => void agent.off("update-participants", onParticipantsChange);
    }, [agent, setReadyParticipants, setUnreadyParticipants]);

    if (readyParticipants.length + unreadyParticipants.length < 1) { // [DEBUG]
    // if (readyParticipants.length + unreadyParticipants.length < 3) {
        return (
            <button className={classname(styles.button, styles.waiting)} disabled>
                玩家人數不足
            </button>
        );
    } else if (unreadyParticipants.length > 0) {
        return (
            <button className={classname(styles.button, styles.waiting)} disabled>
                等待玩家準備
            </button>
        );
    } else {
        return (
            <button className={classname(styles.button, styles.start)} onClick={() => agent.startGame()}>
                開始遊戲
            </button>
        );
    }
};

