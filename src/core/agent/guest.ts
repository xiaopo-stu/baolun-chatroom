import { DataConnection } from "peerjs";

import { AgentAnswerAllowness, AgentGameReadyState, GameAgent } from ".";
import GameHost, { gameModeFixedOptionMap, GameOptions, Question } from "@core/game-host";
import { connection } from "@core/connection";

export class GuestAgent implements GameAgent {
    private connection: DataConnection;

    public name: string = "Player";
    public readyState: AgentGameReadyState = AgentGameReadyState.unready;
    public game: GameHost;

    public allowAnswering: AgentAnswerAllowness = AgentAnswerAllowness.waiting;

    constructor(name: string, connection: DataConnection, game: GameHost) {
        this.connection = connection;

        this.name = name;
        this.game = game;
        this.listenGame();

        this.listenConnection();
    }

    private listenGame() {

        this.game.on("new-message", data => {
            connection.send(this.connection, "new-message", data);
        });

        this.game.on("clear-messages", () => {
            connection.send(this.connection, "clear-messages");
        });

        this.game.on("new-participant", (data: GameAgent) => {
            connection.send(this.connection, "new-participant", {
                id: data.getId(), name: data.getName(), readyState: data.readyState
            });
        });

        this.game.on("remove-participant", (data: GameAgent) => {
            connection.send(this.connection, "remove-participant", {
                id: data.getId()
            });
        });

        this.game.on("update-participant", (data: GameAgent) => {
            connection.send(this.connection, "update-participant", {
                id: data.getId(), name: data.getName(), readyState: data.readyState
            });
        });

        this.game.on("update-options", (options: GameOptions) => {
            connection.send(this.connection, "update-options", { ...options, ...gameModeFixedOptionMap[options.mode] });
        });

        this.game.on("game-stage-change", stage => {
            connection.send(this.connection, "game-stage-change", stage);
        });

        this.game.on("game-start", () => {
            connection.send(this.connection, "game-start", {
                players: this.game.players.map(player => player.getId()),
                maxTensor: this.game.maxTensor,
                life: this.game.life
            });
        });

        this.game.on("new-round", (timestamp: number) => {
            this.allowAnswering = this.game.guesser === this ? (
                AgentAnswerAllowness.guesser
            ) : (
                AgentAnswerAllowness.waiting
            );

            connection.send(this.connection, "new-round", {
                round: this.game.round,
                timestamp,
                guesser: this.game.guesser!.getId()
            });
        });

        this.game.on("player-allow-answering", (player: GameAgent) => {
            connection.send(this.connection, "player-allow-answering", {
                id: player.getId()
            });
        });

        this.game.on("players-allow-answering", (players: GameAgent[]) => {
            connection.send(this.connection, "players-allow-answering", {
                ids: players.map(player => player.getId())
            });
        });

        this.game.on("player-answer", (player: GameAgent, answer: string) => {
            connection.send(this.connection, "player-answer", {
                id: player.getId(), answer
            });
        });

        this.game.on("player-was-sorted", (player: GameAgent, tensor: number) => {
            connection.send(this.connection, "player-was-sorted", {
                id: player.getId(), tensor
            });
        });

        this.game.on("life-decrease", (life: number) => {
            console.log("life-decrease", life);
            connection.send(this.connection, "life-decrease", life);   
        });

        this.game.on("close", () => {
            this.connection.close();
        });

    }

    private listenConnection() {
        connection.onConnectionMessage(this.connection, "new-message", data => {
            this.game.addMessage(data);
        });

        connection.onConnectionMessage(this.connection, "participant-update", data => {
            this.game.updateParticipant(data.id, data.update);
        });

        connection.onConnectionMessage(this.connection, "answer", data => {
            this.allowAnswering = AgentAnswerAllowness.answered;
            this.game.answerBy(this, data);
        });

        connection.onConnectionMessage(this.connection, "sort", data => {
            this.game.sort(this.game.participants.get(data)!);
        });

        connection.on("close-connection", connection => {
            if (connection === this.connection) {
                this.game.removeParticipant(this);
            }
        });

    }

    public getId(): string {
        return this.connection.peer;
    }

    public getName(): string {
        return this.name;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public passGameStatus(): void {

        const participants = [];
        for (const player of this.game.participants.values()) {
            participants.push([
                player.getId(),
                {
                    id: player.getId(),
                    name: player.getName(),
                    readyState: player.readyState
                }
            ]);
        }

        connection.send(this.connection, "game-status", {
            host: this.game.hostAgent.getId(),
            participants,
            messages: this.game.messages,
            options: this.game.options
        });
    }

    public chooseQuestionFrom(questions: { index: number; question: Question; }[]): Promise<number> {
        return new Promise((resolve) => {
            connection.send(this.connection, "choose-question", questions);
            connection.onceConnectionMessage(this.connection, "question-chosen", resolve);
        });
    }

    public setQuestion(question: Question): void {
        connection.send(this.connection, "set-question", question);
    }

    public setTensor(tensor: number): void {
        connection.send(this.connection, "set-tensor", tensor);
    }

    public startAnswering(): void {
        this.allowAnswering = AgentAnswerAllowness.answering;
        connection.send(this.connection, "start-answering");
    }

    public startSorting(sortingCount: number): void {
        connection.send(this.connection, "start-sorting", sortingCount);
    }

    public getAnswerAllowness(): AgentAnswerAllowness {
        return this.allowAnswering;
    }


    public leave(): void {
        connection.removeConnection(this.connection);
    }
}

export default GuestAgent;
