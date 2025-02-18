
import type { FunctionComponent, KeyboardEvent, UIEventHandler } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAgent } from "@core/agent/hook";
import type { Message, Question } from "@core/game-host";
import { GameStage, MessageType } from "@core/game-host";

import styles from "./chatroom.module.css";
import { classname } from "@utils/classname";
import { InteractionAgent } from "@core/agent";

export const Chatroom: FunctionComponent = function () {

    const agent = useAgent()!;

    const [gameStage, setGameStage] = useState(agent.getGameStage());

    useEffect(() => {
        const onStageChange = (stage: GameStage) => setGameStage(stage);
        agent.on("game-stage-change", onStageChange);
        return () => void agent.off("game-stage-change", onStageChange);
    }, [agent, setGameStage]);

    const [messages, setMessages] = useState<Message[]>(agent.getMessages());

    useEffect(() => {
        const onMessage = (messages: Message[]) => {
            setMessages(messages.slice());
        };

        agent.on("update-messages", onMessage);
        return () => void agent.off("update-messages", onMessage);
    }, [agent, setMessages]);

    const messageElements = useMemo(() => {
        return messages.map((message, index) => {
            return <Message key={index} agent={agent} message={message} />;
        });
    }, [messages]);

    const messageContainer = useRef<HTMLDivElement>(null);
    const scrollAtBottom = useRef<boolean>(true);

    const scrollHandler: UIEventHandler = useCallback(function (event) {
        const element = event.target as HTMLDivElement;
        scrollAtBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
    }, []);

    const scrollContainerWhenUpdate = useCallback(function (): void {
        if (scrollAtBottom.current && messageContainer.current)
            scrollToBottom(messageContainer.current);
    }, []);

    const scrollToBottom = useCallback(function (element: HTMLDivElement) {
        if (element)
            element.scrollTo(0, element.scrollHeight);
    }, []);

    useEffect(() => {
        scrollContainerWhenUpdate();
    }, [messageElements]);

    const [questionToChoose, setQuestionToChoose] = useState(agent.getQuestionToChoose());

    useEffect(() => {
        const listener = () => {
            setQuestionToChoose(agent.getQuestionToChoose());
            console.log(agent.getQuestionToChoose());
        };
        agent.on("choosing-question-state-change", listener);
        return () => void agent.off("choosing-question-state-change", listener);
    }, [agent, setQuestionToChoose]);

    return (
        <div className={styles.container}>
            {
                questionToChoose ? (
                    <QuestionChooser agent={agent} questions={questionToChoose} />
                ) : (
                    <div className={styles.messages}
                        onScroll={scrollHandler}
                        onWheel={scrollHandler}
                        ref={messageContainer}
                    >
                        {messageElements}
                    </div>
                )
            }
            {
                (gameStage === GameStage.waiting) ? (
                    <ChatMessageInput />
                ) : (
                    <AnsweringInput />
                )
            }
        </div>
    );
};

const ChatMessageInput: FunctionComponent = function () {

    const agent = useAgent()!;

    const inputRef = useRef<HTMLTextAreaElement>(null);

    function inputHandler(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event?.preventDefault();
            sendChatMessage();
        }
    }

    function sendChatMessage() {
        const content = inputRef.current!.value.trim();
        if (content === "") return;
        inputRef.current!.value = "";
        agent.sendChatMessage(content);
    };

    return (
        <div className={styles.input} id="inputForm">
            <textarea className={styles.content} onKeyDown={inputHandler} ref={inputRef} placeholder="Aa" />
            <div className={styles.buttonGroup}>
                <button type="button" className={styles.button} onClick={sendChatMessage}>評論</button>
                {/* <button className={styles.button} disabled>作答</button> */}
            </div>
        </div>
    );
};

const AnsweringInput: FunctionComponent = function () {

    const agent = useAgent()!;

    const inputRef = useRef<HTMLTextAreaElement>(null);

    function inputHandler(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event?.preventDefault();
            sendChatMessage();
        }
    }

    function sendChatMessage() {
        const content = inputRef.current!.value.trim();
        if (content === "") return;
        inputRef.current!.value = "";
        agent.sendChatMessage(content);
    };

    function sendAnswer() {
        const content = inputRef.current!.value.trim();
        if (content === "") return;
        inputRef.current!.value = "";
        agent.answer(content);
    }

    const [gameStage, setGameStage] = useState(agent.getGameStage());

    useEffect(() => {
        const onStageChange = (stage: GameStage) => setGameStage(stage);
        agent.on("game-stage-change", onStageChange);
        return () => void agent.off("game-stage-change", onStageChange);
    }, [agent, setGameStage]);

    const [allowAnswering, setAnsweringAllowness] = useState(false);

    useEffect(() => {
        const listener = (state: boolean) => setAnsweringAllowness(state);
        agent.on("answering-allowness-change", listener);
        return () => void agent.off("answering-allowness-change", listener);
    }, [agent, setAnsweringAllowness]);


    return gameStage === GameStage.choosing ? (
        <div className={styles.waiting} id="inputForm">
            {/* <textarea className={styles.content} placeholder="Aa" />
            <div className={styles.buttonGroup}>
                <button type="button" className={styles.button} disabled>評論</button>
                <button className={styles.button} disabled>作答</button>
            </div> */}
            <div>等待玩家選擇題目</div>
        </div>
    ) : (
        <div className={styles.input} id="inputForm">
            <textarea className={styles.content} onKeyDown={inputHandler} ref={inputRef} placeholder="Aa" />
            <div className={styles.buttonGroup}>
                <button type="button" className={styles.button} onClick={sendChatMessage}>評論</button>
                <button className={styles.button} disabled={!allowAnswering} onClick={allowAnswering ? sendAnswer : undefined}>作答</button>
            </div>
        </div>
    );
};

interface QuestionChooserProps {
    agent: InteractionAgent;
    questions: { index: number, question: Question }[];
}
const QuestionChooser: FunctionComponent<QuestionChooserProps> = function (props) {

    const agent = useAgent()!;

    const [chosen, setChosen] = useState<number | undefined>(undefined);

    const chooseQuestion = useCallback(function () {
        if (chosen === undefined) return;
        agent.chooseQuestion(chosen);
    }, [chosen, props.questions]);

    console.log(props.questions);

    const questionElements = useMemo(() => {
        return props.questions.map(({ index, question }) => {
            const buttonProps = {
                className: classname(styles.question, chosen === index && styles.selected),
                onClick: () => setChosen(index)
            };

            return (
                <button key={index} {...buttonProps}>
                    <div className={styles.content}>{question.question}</div>
                    <div className={styles.extreme}>
                        <div>1 分<span className={styles.min}>{question.min}</span></div>
                        <div>{props.agent.getMaxTensor()} 分<span className={styles.max}>{question.max}</span></div>
                    </div>
                </button>
            );
        });
    }, [props.questions, chosen]);

    return (
        <div className={styles.chooser}>
            <div className={styles.title}>選擇題目</div>
            <div className={styles.list}>{questionElements}</div>
            <button className={styles.confirm} onClick={chooseQuestion}>確認</button>
        </div>
    );
};

interface MessageProps {
    agent: InteractionAgent;
    message: Message;
}
const Message: FunctionComponent<MessageProps> = function (props) {

    const name = props.agent.getParticipant(props.message.id) ?? props.message.name;

    const classNames: Set<string> = new Set();
    classNames.add(styles.message);

    switch (props.message.type) {
        case MessageType.chat:
            classNames.add(styles.comment);
            break;
        case MessageType.answer:
            classNames.add(styles.answer);
            break;
        case MessageType.system:
            classNames.add(styles.system);
            break;
        case MessageType.question:
            classNames.add(styles.question);
            break;
    }

    const isSelf = props.agent.getId() === props.message.id;
    if (isSelf) {
        classNames.add(styles.self);
    } else if (props.message.id === "system") {
        // classNames.add(styles.system);
    } else {
        classNames.add(styles.other);
    }

    return props.message.type === MessageType.question ? (
        <div className={Array.from(classNames).join(" ")}>
            <span className={styles.name}>{isSelf ? "你" : name}</span>
            <span className={styles.content}>
                {props.message.content.question}
                <br />
                <span className={styles.extreme}>
                    ── 1 分<span className={styles.min}>{props.message.content.min}</span>，
                    {props.agent.getMaxTensor()} 分
                    <span className={styles.max}>{props.message.content.max}</span>
                </span>
            </span>
        </div>
    ) : (
        <div className={Array.from(classNames).join(" ")}>
            <span className={styles.name}>{isSelf ? "你" : name}</span>
            <span className={styles.content}>{props.message.content}</span>
        </div>
    );
};