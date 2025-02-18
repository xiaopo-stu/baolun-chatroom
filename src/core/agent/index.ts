import { EventEmitter } from "events";
import { GameOptions, GameStage, Message, Question } from "@core/game-host";

export const enum AgentGameReadyState {
    ready, unready, host, spectator
}

export const enum AgentAnswerAllowness {
    waiting, answering, answered, guesser
}

export interface Agent {
    readyState: AgentGameReadyState;

    getId(): string;
    getName(): string;
    setName(name: string): void;
}

export interface GameAgent extends Agent {
    passGameStatus(): void;
    chooseQuestionFrom(questions: { index: number, question: Question }[]): Promise<number>;
    setQuestion(question: Question): void;
    setTensor(tensor: number): void;
    startAnswering(): void;
    startSorting(sortingCount: number): void;
    getAnswerAllowness(): AgentAnswerAllowness;
}

export interface InteractionAgent extends Agent, EventEmitter {
    getGameStage(): GameStage;
    getMessages(): Message[];
    getRoomCode(): string;
    getParticipants(): string[];
    getParticipant(id: string): string | undefined;
    getGameOptions(): GameOptions;
    getTensor(): number;
    getRound(): number;
    getLife(): number;
    getTimestamp() : number | null;
    getMaxTensor(): number;
    getQuestionToChoose(): { index: number, question: Question }[] | null;
    getQuestion(): Question | null;
    getPlayerTensor(id: string): number | undefined;

    getHost(): string;
    getReadyParticipants(): string[];
    getUnreadyParticipants(): string[];
    getSpectators(): string[];

    getGuesser(): string | null;
    getHadAnsweredPlayers(): string[];
    getHadAnsweredPlayerIds(): string[];
    getAnsweringPlayers(): string[];
    getWaitingAnsweringPlayers(): string[];

    getAnswer(id: string): string;

    setReadyState(state: AgentGameReadyState): void;
    sendChatMessage(message: string): void;
    
    chooseQuestion(index: number): void;
    answer(message: string): void;
    sort(id: string): void;

    leave(): void;
}