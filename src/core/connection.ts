import { Peer, DataConnection } from "peerjs"
import { EventEmitter } from "events";

export class Connection extends EventEmitter {
    public peer: Peer;
    public connections: Set<DataConnection> = new Set();

    public isReady: boolean = false;

    constructor() {
        super();

        const peer = this.peer = new Peer();

        // 當連線成功時，設定為 ready
        peer.once("open", () => { this.isReady = true; this.emit("ready") });
        // 當有新的連線時，加入新連線
        peer.on("connection", connection => this.addConnection(connection));
        
        // 當有錯誤時，輸出錯誤
        peer.on("error", error => { console.error(error); this.emit("error", error) });
    
    }

    public whenReady(): Promise<void> {
        if (this.isReady)
            return Promise.resolve();

        return new Promise((resolve) => {
            this.once("ready", resolve);
        });
    }

    public async connect(peerId: string): Promise<DataConnection> {
        const connection = this.peer.connect(peerId);
        await this.addConnection(connection);
        return connection;
    }

    public async broadcast(type: string, data: any): Promise<void> {
        const message = { type, data };
        await Promise.all(Array.from(this.connections).map(connection => connection.send(message)));
    }

    public async send(connection: DataConnection, type: string, data?: any): Promise<void> {
        const message = { type, data };
        await connection.send(message);
    }

    public async addConnection(connection: DataConnection): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const onOpen = () => { resolve(); connection.off("error", onError)};
            const onError = (error: any) => { reject(error); connection.off("open", onOpen) };

            connection.once("open", onOpen);
            connection.once("error", onError);
        });

        this.connections.add(connection);
        this.emit("new-connection", connection);

        connection.on("data", data => this.emit("message", connection, data));
        connection.once("close", () => this.removeConnection(connection));
    }

    public removeConnection(connection: DataConnection): void {
        connection.close({ flush: true });
        this.connections.delete(connection);
        this.emit("close-connection", connection);
    }

    public clearConnections(): void {
        for (const connection of this.connections) {
            connection.close();
        }

        this.connections.clear();
    }

    /**
     * @param type 
     * @param listener 
     * @returns Listener remover, call this function to remove the listener
     */
    public onMessage(type: string, listener: (connection: DataConnection, data: any) => void): () => void {
        const callback = (connection: DataConnection, data: any) => {
            if (data.type === type)
                listener(connection, data.data);
        };
        
        this.on("message", callback);
        return () => this.off("message", callback);
    }

    public onceMessage(type: string, listener: (connection: DataConnection, data: any) => void): void {
        const callback = (connection: DataConnection, data: any) => {
            if (data.type === type) {
                listener(connection, data.data);
                this.off("message", callback);
            }
        };

        this.on("message", callback);
    }

    public onConnectionMessage(connection: DataConnection, type: string, listener: (data: any) => void): () => void {
        const callback = (conn: DataConnection, data: any) => {
            if (conn === connection && data.type === type)
                listener(data.data);
        };

        this.on("message", callback);
        return () => this.off("message", callback);
    }

    public onceConnectionMessage(connection: DataConnection, type: string, listener: (data: any) => void): void {
        const callback = (conn: DataConnection, data: any) => {
            if (conn === connection && data.type === type) {
                listener(data.data);
                this.off("message", callback);
            }
        };

        this.on("message", callback);
    }
}

export const connection = new Connection();
console.log(connection); // [DEBUG]