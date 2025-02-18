import { EventEmitter } from "events";
import { DataConnection } from "peerjs";

import { GameStage, Message, MessageType, GameOptions, Question } from "@core/game-host";
import { connection } from "@core/connection";

import { AgentAnswerAllowness, AgentGameReadyState, InteractionAgent } from ".";
import { setAgent } from "./hook";

type Participant = { 
    id: string, 
    name: string, 
    readyState: AgentGameReadyState,
    answer: AgentAnswerAllowness,
};

export class PlayerAgent extends EventEmitter implements InteractionAgent {
    public readyState: AgentGameReadyState = AgentGameReadyState.unready;

    private gameConnection: DataConnection | null = null;

    private gameStage: GameStage;
    private roomCode: string;

    public name: string;
    private host: string = null!;
    private participants: Map<string, Participant> = new Map();
    private players: Participant[] = [];

    private messages: Message[] = [];

    private gameOptions: GameOptions;
    private tensor: number = 0;
    private allowAnswering: boolean = false;
    private sortingCount: number = 0;

    private choices: { index: number; question: Question }[] | null = null;
    private question: Question | null = null;
    private answers: Map<string, string> = new Map();
    private tensorMap: Map<string, number> = new Map();

    private life: number = 0;
    private round: number = 0
    private maxTensor: number = 0;
    private timestamp: number | null = null;

    constructor(name: string, roomCode: string) {
        super();
        this.gameStage = GameStage.waiting;
        this.name = name;
        this.roomCode = roomCode;

        this.gameOptions = {} as PlayerAgent["gameOptions"];

        connection.connect(roomCode)
            .then(this.initialize.bind(this));
    }

    private initialize(conn: DataConnection) {
        this.gameConnection = conn;

        conn.on("close", () => {
            setAgent(null);
        });

        connection.send(conn, "join", { name: this.name });

        connection.onceConnectionMessage(conn, "game-status", data => {
            this.host = data.host;
            this.participants = new Map(data.participants); // 參與者名單
            this.gameOptions = data.options; // 遊戲選項

            this.messages = data.messages; // 目前的訊息

            this.emit("ready");
        });

        connection.onConnectionMessage(conn, "new-message", data => {
            this.messages.push(data);
            this.emit("new-message", data);
            this.emit("update-messages", this.messages);
        });

        connection.onConnectionMessage(conn, "clear-messages", () => {
            this.messages = [];
            this.emit("clear-messages");
            this.emit("update-messages", this.messages);
        });

        // connection.onConnectionMessage(conn, "message-reaction", data => {
        //     // TODO: 處理訊息反應變化
        // });

        connection.onConnectionMessage(conn, "new-participant", data => {
            this.participants.set(data.id, data);
            this.emit("new-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        connection.onConnectionMessage(conn, "remove-participant", data => {
            this.participants.delete(data.id);
            this.emit("remove-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        connection.onConnectionMessage(conn, "update-participant", data => {
            Object.assign(this.participants.get(data.id)!, data)
            this.emit("update-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        connection.onConnectionMessage(conn, "update-options", data => {
            this.gameOptions = data;
            this.emit("update-options", data);
        });

        connection.onConnectionMessage(conn, "game-stage-change", data => {
            this.gameStage = data;
            this.emit("game-stage-change", data);
        });

        connection.onConnectionMessage(conn, "game-start", data => {
            this.maxTensor = data.maxTensor;
            this.life = data.life;
            this.round = 0;
            this.players = [];
            for (const playerId of data.players) {
                this.players.push(this.participants.get(playerId)!);
            }

            this.emit("game-start", data);
        });
        
        connection.onConnectionMessage(conn, "new-round", data => {
            this.round = data.round;
            this.question = null;
            this.timestamp = data.timestamp;

            this.answers.clear();
            this.tensorMap.clear();

            for (const player of this.players.values()) {
                player.answer = player.id == data.guesser ? (
                    AgentAnswerAllowness.guesser
                ) : (
                    AgentAnswerAllowness.waiting
                );
            }

            this.emit("new-round");
            this.emit("update-question", this.question);
            this.emit("update-answers", this.answers);
            this.emit("update-participants", this.getParticipants());
        });

        connection.onConnectionMessage(conn, "player-allow-answering", data => {
            this.participants.get(data.id)!.answer = AgentAnswerAllowness.answering;
            this.emit("update-participants", this.getParticipants());
        });
        
        connection.onConnectionMessage(conn, "players-allow-answering", data => {
            for (const id of data.ids) {
                this.participants.get(id)!.answer = AgentAnswerAllowness.answering;
            }
            this.emit("update-participants", this.getParticipants());
        });
        
        connection.onConnectionMessage(conn, "player-answer", data => {
            this.answers.set(data.id, data.answer);
            this.participants.get(data.id)!.answer = AgentAnswerAllowness.answered;
            this.emit("update-answers", this.answers);
            this.emit("update-participants", this.getParticipants());
        });

        connection.onConnectionMessage(conn, "set-tensor", tensor => {
            this.tensor = tensor;
            this.emit("tensor-change", tensor);
        });

        connection.onConnectionMessage(conn, "choose-question", data => {
            this.choices = data;
            this.emit("question-choices", data);
            this.emit("choosing-question-state-change", true);
        });
        
        connection.onConnectionMessage(conn, "set-question", data => {
            this.question = data;
            this.emit("question-change", data);
        });
        
        connection.onConnectionMessage(conn, "start-answering", () => {
            this.allowAnswering = true;
            this.emit("answering-allowness-change", true);
        });

        connection.onConnectionMessage(conn, "start-sorting", sortingCount => {
            this.sortingCount = sortingCount;
            this.emit("sorting-allowness-change", true);
        });

        connection.onConnectionMessage(conn, "player-was-sorted", data => {
            this.tensorMap.set(data.id, data.tensor);
            this.emit("update-participants", this.getParticipants());
        });

        conn.on("data", console.log); // [DEBUG]
    }

    public whenConnectionReady(): Promise<void> {
        if (this.gameConnection)
            return Promise.resolve();

        return new Promise((resolve, reject) => {
            this.once("ready", resolve);
            this.once("error", reject);
        });
    }

    public setReadyState(state: AgentGameReadyState): void {
        this.readyState = state;

        this.emit("ready-state-change", state);

        if (!this.gameConnection) return;
        connection.send(this.gameConnection!, "participant-update", {
            id: this.getId(),
            update: { readyState: state }
        });
    }

    public chooseQuestion(index: number): void {
        if (!this.gameConnection || !this.choices)
            return;

        this.choices = null;
        this.emit("choosing-question-state-change", false);
        connection.send(this.gameConnection, "question-chosen", index);
    }

    public getGameStage(): GameStage {
        return this.gameStage;
    }

    public getGameOptions() {
        return this.gameOptions;
    }

    public getMessages() {
        return this.messages;
    }

    public getRoomCode() {
        return this.roomCode;
    }

    public getId() {
        return connection.peer.id;
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public getParticipants(): string[] {
        return Array.from(this.participants.values()).map(p => p.name);
    }

    public getParticipant(id: string): string | undefined {
        return this.participants.get(id)?.name;
    }

    public getTensor(): number {
        return this.tensor;
    }

    public getRound(): number {
        return this.round;
    }

    public getLife(): number {
        return this.life;
    }

    public getTimestamp(): number | null {
        return this.timestamp;
    }

    public getMaxTensor(): number {
        return this.maxTensor;
    }

    public getQuestionToChoose(): { index: number; question: Question; }[] | null {
        return this.choices;
    }

    public getQuestion(): Question | null {
        return this.question;
    }

    public getPlayerTensor(id: string): number | undefined {
        return this.tensorMap.get(id);
    }

    public getHost(): string {
        return this.participants.get(this.host)!.name;
    }

    public getReadyParticipants(): string[] {
        return Array.from(this.participants.values())
            .filter(p => p.readyState === AgentGameReadyState.ready)
            .map(p => p.name);
    }

    public getUnreadyParticipants(): string[] {
        return Array.from(this.participants.values())
            .filter(p => p.readyState === AgentGameReadyState.unready)
            .map(p => p.name);
    }

    public getSpectators(): string[] {
        return Array.from(this.participants.values())
            .filter(p => p.readyState === AgentGameReadyState.spectator)
            .map(p => p.name);
    }

    public getGuesser(): string | null {
        return Array.from(this.participants.values())
            .find(p => p.answer === AgentAnswerAllowness.guesser)?.name ?? null;
    }

    public getHadAnsweredPlayers(): string[] {
        return Array.from(this.answers.keys())
            .map(id => this.participants.get(id)!.name);
    }

    public getHadAnsweredPlayerIds(): string[] {
        return Array.from(this.answers.keys());
    }

    public getAnsweringPlayers(): string[] {
        return Array.from(this.participants.values())
            .filter(p => p.answer === AgentAnswerAllowness.answering)
            .map(p => p.name);
    }

    public getWaitingAnsweringPlayers(): string[] {
        return Array.from(this.participants.values())
            .filter(p => p.answer === AgentAnswerAllowness.waiting)
            .map(p => p.name);
    }

    public sendChatMessage(content: string) {
        if (!this.gameConnection)
            return;

        const message: Message = {
            id: this.getId(),
            name: this.getName(),
            type: MessageType.chat,
            content
        };

        connection.send(this.gameConnection, "new-message", message);
    }

    public answer(message: string): void {
        if (!this.allowAnswering || !this.gameConnection)
            return;

        this.allowAnswering = false;
        connection.send(this.gameConnection, "answer", message);
        this.emit("answering-allowness-change", false);	
    }

    public sort(id: string): void {
        if (!this.gameConnection)
            return;

        connection.send(this.gameConnection, "sort", id);
    }

    public updateGameOptions(): void {
        // 其他玩家無法更改遊戲選項
    }

    public leave() {
        if (this.gameConnection)
            connection.removeConnection(this.gameConnection);
        setAgent(null);
    }

    public getAnswer(id : string) : string {
        return this.answers.get(id)!;
    }
}

export default PlayerAgent;