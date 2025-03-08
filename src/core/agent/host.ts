import { DataConnection } from "peerjs";
import { EventEmitter } from "events";

import { connection } from "@core/connection";
import { GameHost, GameStage, Message, MessageType, Question } from "@core/game-host";

import { AgentAnswerAllowness, AgentGameReadyState, GameAgent, InteractionAgent } from ".";
import { GuestAgent } from "./guest";


export class HostAgent extends EventEmitter implements InteractionAgent, GameAgent {

    private game: GameHost;

    public readyState: AgentGameReadyState = AgentGameReadyState.host;
    public name: string = "Host";

    public question: Question | null = null;
    public tensor: number = 0;
    public allowAnswering: AgentAnswerAllowness = AgentAnswerAllowness.waiting;
    public sortingCount: number = 0;
    public choices: { index: number; question: Question; }[] | null = null;
    public answers: Map<string, string> = new Map();
    private tensorMap: Map<string, number> = new Map();
    private timestamp: number = 0;

    constructor(name: string) {
        super();

        this.name = name;

        this.game = new GameHost(this);
        this.listenGame();

        // 當有新的連線時，新增玩家
        connection.clearConnections();
        connection.on("new-connection", this.onConnection.bind(this));
    }

    private listenGame() {

        this.game.on("new-message", data => {
            this.emit("new-message", data);
            this.emit("update-messages", this.game.messages);
        });

        this.game.on("clear-messages", () => {
            this.emit("clear-messages");
            this.emit("update-messages", this.game.messages);
        });

        this.game.on("new-participant", data => {
            this.emit("new-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        this.game.on("remove-participant", data => {
            this.emit("remove-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        this.game.on("update-participant", data => {
            this.emit("update-participant", data);
            this.emit("update-participants", this.getParticipants());
        });

        this.game.on("update-options", options => {
            this.emit("update-options", options);
        });

        this.game.on("game-stage-change", stage => {
            this.emit("game-stage-change", stage);
        });

        this.game.on("new-round", (timestamp: number) => {
            this.question = null;

            this.answers.clear();
            this.tensorMap.clear();

            this.timestamp = timestamp;

            this.allowAnswering = this.game.guesser === this ? (
                AgentAnswerAllowness.guesser
            ) : (
                AgentAnswerAllowness.waiting
            );

            console.log(this.game.guesser); // [DEBUG]

            this.emit("new-round");
            this.emit("update-question", this.question);
            this.emit("update-answers", this.answers);
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("player-allow-answering", () => {
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("players-allow-answering", () => {
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("player-answer", (player: GameAgent, answer: string) => {
            this.answers.set(player.getId(), answer);
            this.emit("update-answers", this.answers);
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("player-was-sorted", (player: GameAgent, tensor: number) => {
            this.tensorMap.set(player.getId(), tensor);
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("life-decrease", () => {
            this.emit("update-life", this.game.life);
        });

        this.game.on("tensor-update", (playerId : string, tensor: number) => {
            this.tensorMap.set(playerId, tensor);
            this.emit("update-participants", this.getParticipants());
            this.emit("update-waiting-answering-players", this.getWaitingAnsweringPlayers());
        });

        this.game.on("close", () => {
            // TODO
        });
    }

    private async onConnection(newConnection: DataConnection) {
        if (this.game.stage !== GameStage.waiting)
            return connection.removeConnection(newConnection);

        const playerData = await new Promise<any>((resolve) => {
            connection.onceConnectionMessage(newConnection, "join", data => resolve(data));
        });

        // 當遊戲還在等待階段時，新增玩家
        const player = new GuestAgent(playerData.name, newConnection, this.game);
        this.game.addParticipant(player);
    }

    public clearConnection() {
        connection.clearConnections();
    }

    public getId(): string {
        return connection.peer.id;
    }

    public getName(): string {
        return this.name;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public passGameStatus() {
        // ignore status passing
    }

    public chooseQuestionFrom(questions: { index: number; question: Question; }[]): Promise<number> {
        const { promise, resolve } = Promise.withResolvers<number>();

        this.choices = questions;
        this.emit("choosing-question-state-change", true);

        this.once("question-choose", index => {
            this.choices = null;
            this.emit("choosing-question-state-change", false);
            resolve(index);
        });

        return promise;
    }

    public setQuestion(question: Question): void {
        this.question = question;
        this.emit("question-change", question);
    }

    public setTensor(tensor: number): void {
        this.tensor = tensor;
        this.emit("tensor-change", tensor);
    }

    public startAnswering(): void {
        this.allowAnswering = AgentAnswerAllowness.answering;
        this.emit("answering-allowness-change", true);
    }

    public startSorting(sortingCount: number): void {
        this.sortingCount = sortingCount;
        this.emit("sorting-allowness-change", true);
    }

    public getAnswerAllowness(): AgentAnswerAllowness {
        return this.allowAnswering;
    }

    public getGameStage(): GameStage {
        return this.game.stage;
    }

    public getMessages(): Message[] {
        return this.game.messages;
    }

    public getRoomCode(): string {
        return connection.peer.id;
    }

    public getParticipants(): string[] {
        return Array.from(this.game.participants.values()).map(player => player.getName());
    }

    public getParticipant(id: string): string | undefined {
        return this.game.participants.get(id)?.getName();
    }

    public getGameOptions() {
        return this.game.options;
    }

    public getTensor(): number {
        return this.tensor;
    }

    public getMaxTensor(): number {
        return this.game.maxTensor;
    }

    public getRound(): number {
        return this.game.round;
    }

    public getLife(): number {
        return this.game.life;
    }

    public getTimestamp(): number | null {
        return this.timestamp;
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
        return this.getName();
    }

    public getReadyParticipants(): string[] {
        return Array.from(this.game.participants.values())
            .filter(player => player.readyState === AgentGameReadyState.ready)
            .map(player => player.getName());
    }

    public getUnreadyParticipants(): string[] {
        return Array.from(this.game.participants.values())
            .filter(player => player.readyState === AgentGameReadyState.unready)
            .map(player => player.getName());
    }

    public getSpectators(): string[] {
        return Array.from(this.game.participants.values())
            .filter(player => player.readyState === AgentGameReadyState.spectator)
            .map(player => player.getName());
    }

    public getGuesser(): string | null {
        return this.game.guesser?.getName() ?? null;
    }

    public getHadAnsweredPlayers(): string[] {
        return Array.from(this.answers.keys())
            .map(id => this.game.participants.get(id)!.getName());
    }

    public getHadAnsweredPlayerIds(): string[] {
        return Array.from(this.answers.keys());
    }

    public getAnsweringPlayers(): string[] {
        return Array.from(this.game.participants.values())
            .filter(player => player.getAnswerAllowness() === AgentAnswerAllowness.answering)
            .map(player => player.getName());
    }

    public getWaitingAnsweringPlayers(): string[] {
        return Array.from(this.game.participants.values())
            .filter(player => player.getAnswerAllowness() === AgentAnswerAllowness.waiting)
            .map(player => player.getName());
    }

    public setReadyState(_state: AgentGameReadyState): void {
    }

    public sendChatMessage(content: string): void {
        const message: Message = {
            type: MessageType.chat,
            id: this.getId(),
            name: this.getName(),
            content
        };

        this.game.addMessage(message);
    }

    public chooseQuestion(index: number): void {
        this.emit("question-choose", index);
    }

    public answer(content: string): void {
        if (!this.allowAnswering)
            return;

        this.allowAnswering = AgentAnswerAllowness.answered;
        this.game.answerBy(this, content);
        this.emit("answering-allowness-change", false);
        
    }

    public sort(id: string): void {
        this.game.sort(this.game.participants.get(id)!);
    }

    public leave(): void {
        this.game.close();
    }

    public updateGameOptions(options: Partial<GameHost["options"]>) {
        this.game.updateGameOptions(options);
        // console.log(options); // [DEBUG]
    }

    public startGame(): void {
        this.game.start();
    }
    public getAnswer(id: string): string {
        return this.answers.get(id)!;
    }

}

export default HostAgent;