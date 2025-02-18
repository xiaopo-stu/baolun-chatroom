import { FunctionComponent, useEffect, useState } from "react";

import { useAgent } from "@core/agent/hook";
import { GameStage } from "@core/game-host";

import styles from "./index.module.css";
import { WaitingInfo } from "./waiting-info";
import { Chatroom } from "./chatroom";
import { HostSettings, PlayerSettings } from "./settings";
import { AgentGameReadyState } from "@core/agent";
import { InGameInfo } from "./in-game-info";
import { GameStatus } from "./game-status";


export const Game: FunctionComponent = function () {

    const agent = useAgent()!;

    const [stage, setStage] = useState<GameStage>(agent.getGameStage());

    useEffect(() => {
        const onStageChange = (stage: GameStage) => setStage(stage);
        agent.on("game-stage-change", onStageChange);
        return () => void agent.off("game-stage-change", onStageChange);
    }, [agent, setStage]);

    const isHost = agent.readyState === AgentGameReadyState.host;

    return stage === GameStage.waiting ? (
        <div className={styles.container}>
            <WaitingInfo />
            <Chatroom />
            {isHost ? <HostSettings /> : <PlayerSettings />}
        </div>
    ) : (
        <div className={styles.container}>
            <InGameInfo />
            <Chatroom />
            <GameStatus />
        </div>
    );
};

export default Game;
