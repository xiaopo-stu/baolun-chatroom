import { FunctionComponent, useEffect, useRef, useState } from "react";

import { useAgent } from "@core/agent/hook";

import styles from "./game-status.module.css";


export const GameStatus: FunctionComponent = function () {
    const agent = useAgent()!;

    const [life, setLife] = useState(agent.getLife());
    const [round, setRound] = useState(agent.getRound());
    const [timeStamp, setTimeStamp] = useState(agent.getTimestamp());

    useEffect(() => {
        const onNewRound = () => {
            setLife(agent.getLife());
            setRound(agent.getRound());
            setTimeStamp(agent.getTimestamp());
        };

        const onLifeIncrease = () => setLife(agent.getLife());
        const onLifeDecrease = () => setLife(agent.getLife());

        agent.on("new-round", onNewRound);
        agent.on("life-increase", onLifeIncrease);
        agent.on("life-decrease", onLifeDecrease);

        return () => {
            agent.off("new-round", onNewRound);
            agent.off("life-increase", onLifeIncrease);
            agent.off("life-decrease", onLifeDecrease);
        };
    }, [agent, setTimeStamp, setLife, setRound]);

    return (
        <div className={styles.container}>
            GameStatus
            <div>Round : {round}</div>
            <div>Timer : <Timer timeStamp={timeStamp} /></div>
            <div>Health : {life}</div>
        </div>
    );
};

interface TimerProps {
    timeStamp: number | null;
}
const Timer: FunctionComponent<TimerProps> = function (props) {

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!ref.current) return;
            const now = Date.now();
            const diff = props.timeStamp ? now - props.timeStamp : now; // if no timestamp, just show current time
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            ref.current.innerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }, 500);
        return () => clearInterval(interval);
    }, [props.timeStamp]);

    return (
        <div ref={ref}>0:00</div>
    );
}