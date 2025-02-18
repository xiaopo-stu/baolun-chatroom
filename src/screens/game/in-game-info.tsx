import { useAgent } from "@core/agent/hook";
import { Question } from "@core/game-host";
import { FunctionComponent, useEffect, useState } from "react";

import styles from "./in-game-info.module.css";

export const InGameInfo: FunctionComponent = function () {

    const agent = useAgent()!;

    const [question, setQuestion] = useState(agent.getQuestion());
    const [tensor, setTensor] = useState(agent.getTensor());

    const [guesser, setGuesser] = useState(agent.getGuesser());
    const [answeringPlayers, setAnsweringPlayers] = useState(agent.getAnsweringPlayers());
    const [hadAnsweredPlayerIds, setHadAnsweredPlayerIds] = useState(agent.getHadAnsweredPlayerIds());
    const [waitingAnsweringPlayers, setWaitingAnsweringPlayers] = useState(agent.getWaitingAnsweringPlayers());;

    useEffect(() => {
        const onQuestionChange = (question: Question) => setQuestion(question);
        const onTensorChange = (tensor: number) => setTensor(tensor);

        agent.on("question-change", onQuestionChange);
        agent.on("tensor-change", onTensorChange);

        return () => {
            agent.off("question-change", onQuestionChange);
            agent.off("tensor-change", onTensorChange);
        };
    }, [agent, setQuestion, setTensor]);

    useEffect(() => {
        const onParticipantsChange = () => {
            setGuesser(agent.getGuesser());
            setAnsweringPlayers(agent.getAnsweringPlayers());
            setHadAnsweredPlayerIds(agent.getHadAnsweredPlayerIds());
            setWaitingAnsweringPlayers(agent.getWaitingAnsweringPlayers());
        };

        agent.on("update-participants", onParticipantsChange);
        return () => void agent.off("update-participants", onParticipantsChange);
    }, [agent, setGuesser, setAnsweringPlayers, setHadAnsweredPlayerIds, setWaitingAnsweringPlayers]);

    return (
        <div className={styles.container}>
            {
                question ? (
                    <div className={styles.question}>
                        <span className={styles.content}>
                            {question.question}
                        </span>
                        <span className={styles.extreme}>
                            <div>1 分<span className={styles.min}>{question.min}</span></div>
                            <div>{agent.getMaxTensor()} 分<span className={styles.max}>{question.max}</span></div>
                            {/* 1 分<span className={styles.min}>{question.min}</span>，
                            {agent.getMaxTensor()} 分
                            <span className={styles.max}>{question.max}</span> */}
                        </span>
                    </div>
                ) : (
                    <div className={styles.question}>
                        正在等待題目
                    </div>
                )
            }
            {/* <div>
                答題者：{agent.getGuesser()}
            </div>
            <div>
                你抽到的等級: {tensor}
            </div>
            <div>
                輪到誰發言:
            </div> */}

            <div className={styles.playerGroup}>答題者</div>
            <div className={styles.player}><span>{guesser}</span></div>
            {
                answeringPlayers.length > 0 && <>
                    <div className={styles.playerGroup}>回答中 ({answeringPlayers.length})</div>
                    {answeringPlayers.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                </>
            }
            {/* {
                hadAnsweredPlayers.length > 0 && <>
                    <div className={styles.playerGroup}>已回答 ({hadAnsweredPlayers.length})</div>
                    {hadAnsweredPlayers.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                </>
            } */}
            {
                hadAnsweredPlayerIds.length > 0 && <>
                    <div className={styles.playerGroup}>已回答 ({hadAnsweredPlayerIds.length})</div>
                    {hadAnsweredPlayerIds.map((id, index) =>
                        <div className={styles.player} key={index}>
                            <span>{agent.getParticipant(id)}</span>
                            <span>{agent.getAnswer(id)}</span>
                            {agent.getPlayerTensor(id) ? <span>{agent.getPlayerTensor(id)}</span> : <span onClick={() => agent.sort(id)}>你個SB</span>}
                        </div>  
                    )}
                </>
            }
            {
                waitingAnsweringPlayers.length > 0 && <>
                    <div className={styles.playerGroup}>等待回答 {waitingAnsweringPlayers.length > 1 && `(${waitingAnsweringPlayers.length})`}</div>
                    {waitingAnsweringPlayers.map((name, index) => <div className={styles.player} key={index}><span>{name}</span></div>)}
                </>
            }

            {/* {
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
                } */}
        </div>
    );
}