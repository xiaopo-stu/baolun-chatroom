import { EventEmitter } from 'events';
import { AgentGameReadyState, GameAgent } from './agent';
import HostAgent from './agent/host';

/** 遊戲順序 */
export const enum GameStage {
    waiting, // 等待玩家加入
    choosing,
    answering,
    sorting,
    ended
}


/** 問題 */
export type Question = { question: string, max: string, min: string };
/** 問題權重 */
export type QuestionAndWeight = [Question, number];

export interface GameOptions {
    mode: OptionMode;
    answerOrder: OptionAnswerOrder;
    life: OptionLife;
    round: OptionRound;
    maxTensor: OptionTensor;
    timeLimit: OptionTimeLimit;
    questionType: OptionQuestionType[];
    deadWeight: OptionDeadWeight;
}

export const enum OptionMode { standard, friendly, endless }
export const enum OptionAnswerOrder { random, fixed, freedom }
export const enum OptionLife { unlimited, three, five, seven, ten, onePerPerson, twoPerPerson, threePerPerson };
export const enum OptionRound { unlimited, three, five, seven, ten, onePerPerson, twoPerPerson, threePerPerson };
export const enum OptionTensor { five, seven, ten, fifteen, twenty, onePerPerson, onePerPersonAndFive, onePointFivePerPerson, twoPerPerson };
export const enum OptionTimeLimit { unlimited, oneMinute, threeMinute, fiveMinute, sevenMinute, tenMinute, fifteenMinute, thirdtyMinute };
export const enum OptionQuestionType { normal, adult, hell };
export const enum OptionDeadWeight { unactivate = 0, activate = 1 };

export const gameModeFixedOptionMap: {
    [mode: number]: Partial<GameOptions>
} = {
    [OptionMode.standard]: {},

    [OptionMode.friendly]: {
        life: OptionLife.unlimited,
        timeLimit: OptionTimeLimit.unlimited
    },

    [OptionMode.endless]: {
        round: OptionRound.unlimited,
        timeLimit: OptionTimeLimit.tenMinute,
        life: OptionLife.onePerPerson,
        answerOrder: OptionAnswerOrder.random,
        maxTensor: OptionTensor.onePerPersonAndFive
    }
}

export const enum MessageType { chat, answer, system, question };
export const enum MessageEmoji { like, dislike, happy, sad, angry, surprise };

export interface MessageInterface {
    type: MessageType;
    id: string;
    name: string;
    emoji?: { [username: string]: MessageEmoji };
}

export interface ChatMessage extends MessageInterface {
    type: MessageType.chat;
    content: string;
}

export interface AnswerMessage extends MessageInterface {
    type: MessageType.answer;
    content: string;
}

export interface SystemMessage extends MessageInterface {
    type: MessageType.system;
    content: string;
}

export interface QuestionMessage extends MessageInterface {
    type: MessageType.question;
    content: Question;
}

export type Message = ChatMessage | AnswerMessage | SystemMessage | QuestionMessage;

export class GameHost extends EventEmitter {

    public hostAgent: HostAgent;
    /** 在遊戲的所有玩家 */
    public participants: Map<string, GameAgent> = new Map();
    /** 在遊戲中的玩家 */
    public players: GameAgent[] = [];
    /** 猜謎者的順序 */
    public guessOrder: GameAgent[] = [];
    /** 答題者的順序 根據回答的模式不同會有不同的變化 */
    public answerOrder: GameAgent[] | null = null;
    /** 負責猜謎的人 */
    public guesser: GameAgent | null = null;

    /**題目集 */
    public questionBank: QuestionAndWeight[] = [];
    /** 供選擇的題目，共計四個 */
    // public choices: QuestionAndWeight[] | null = null;
    /** 最終選擇的題目 */
    // public finalChoices: QuestionAndWeight[] | null = null;
    /** 每位玩家持有的強度等級 */
    public tensors: Map<string, number> = new Map();

    /** 可設定的遊戲選項 */
    public options: GameOptions = {
        /** 回答順序，預設為固定順序 */
        answerOrder: OptionAnswerOrder.fixed,
        /** 生命數 */
        life: OptionLife.onePerPerson,
        /** 回合數 */
        round: OptionRound.five,
        /** 強度範圍 */
        maxTensor: OptionTensor.seven,
        /** 遊戲模式 */
        mode: OptionMode.standard,
        /** 時間限制 */
        timeLimit: OptionTimeLimit.tenMinute,
        /** 問題類型 */
        questionType: [OptionQuestionType.normal],
        /** 戰犯模式 */
        deadWeight: OptionDeadWeight.activate,
    };

    /** 上一個翻出的強度 */
    public lastTensor: number = 1;
    /** 下一個翻出的強度 */
    public nextTensor: number = 5;

    /** 遊戲的當前階段 */
    public stage: GameStage = GameStage.waiting;
    /** 生命數 */
    public life: number = 0;
    /** 回合數 */
    public round: number = 0;
    public maxRound: number = 0;

    public maxTensor: number = 0;

    public messages: Message[] = [];

    public timestamp: number | null = null;


    /** 建構子 */
    public constructor(host: HostAgent) {
        super();
        this.hostAgent = host;
        this.addParticipant(host);
    }

    /** 新增玩家 */
    public addParticipant(participant: GameAgent) {
        this.participants.set(participant.getId(), participant);

        const message: SystemMessage = {
            type: MessageType.system,
            id: "system",
            name: "system",
            content: `${participant.getName()} 加入遊戲`
        };

        this.addMessage(message);

        participant.passGameStatus();
        this.emit("new-participant", participant);
    }

    /** 刪除玩家 */
    public removeParticipant(participant: GameAgent) {

        this.participants.delete(participant.getId());

        const message: SystemMessage = {
            type: MessageType.system,
            id: "system",
            name: "system",
            content: `${participant.getName()} 離開遊戲`
        };

        this.addMessage(message);

        this.emit("remove-participant", participant);
    }

    public updateParticipant(id: string, update: any) {
        const participant = this.participants.get(id);
        if (!participant) return;

        if ("readyState" in update) {
            participant.readyState = update.readyState;
        }

        this.emit("update-participant", participant);
    }

    public updateGameOptions(options: Partial<GameOptions>) {
        Object.assign(this.options, options);
        this.emit("update-options", this.options);
    }

    public async start() {
        await this.initialize();
        await this.run();
        alert("your left is" + this.life);
        this.end();
    }

    public close() {
        this.emit("close");
    }

    public async initialize() {
        this.players = Array.from(this.participants.values())
            .filter(participant => participant.readyState !== AgentGameReadyState.spectator);

        switch (this.options.life) {
            case OptionLife.unlimited:
                this.life = Infinity;
                break;
            case OptionLife.three:
                this.life = 3;
                break;
            case OptionLife.five:
                this.life = 5;
                break;
            case OptionLife.seven:
                this.life = 7;
                break;
            case OptionLife.ten:
                this.life = 10;
                break;
            case OptionLife.onePerPerson:
                this.life = this.players.length;
                break;
            case OptionLife.twoPerPerson:
                this.life = this.players.length * 2;
                break;
            case OptionLife.threePerPerson:
                this.life = this.players.length * 3;
                break;
        }

        switch (this.options.round) {
            case OptionRound.unlimited:
                this.maxRound = Infinity;
                break;
            case OptionRound.three:
                this.maxRound = 3;
                break;
            case OptionRound.five:
                this.maxRound = 5;
                break;
            case OptionRound.seven:
                this.maxRound = 7;
                break;
            case OptionRound.ten:
                this.maxRound = 10;
                break;
            case OptionRound.onePerPerson:
                this.maxRound = this.players.length;
                break;
            case OptionRound.twoPerPerson:
                this.maxRound = this.players.length * 2;
                break;
            case OptionRound.threePerPerson:
                this.maxRound = this.players.length * 3;
                break;
        }

        switch (this.options.maxTensor) {
            case OptionTensor.five:
                this.maxTensor = 5;
                break;
            case OptionTensor.seven:
                this.maxTensor = 7;
                break;
            case OptionTensor.ten:
                this.maxTensor = 10;
                break;
            case OptionTensor.fifteen:
                this.maxTensor = 15;
                break;
            case OptionTensor.twenty:
                this.maxTensor = 20;
                break;
            case OptionTensor.onePerPerson:
                this.maxTensor = this.players.length;
                break;
            case OptionTensor.onePerPersonAndFive:
                this.maxTensor = this.players.length + 5;
                break;
            case OptionTensor.onePointFivePerPerson:
                this.maxTensor = Math.floor(this.players.length * 1.5);
                break;
            case OptionTensor.twoPerPerson:
                this.maxTensor = this.players.length * 2;
                break;
        }

        switch (this.options.timeLimit) {
            case OptionTimeLimit.unlimited:
                this.timestamp = null;
                break;
            case OptionTimeLimit.oneMinute:
                this.timestamp = 60000;
                break;
            case OptionTimeLimit.threeMinute:
                this.timestamp = 180000;
                break;
            case OptionTimeLimit.fiveMinute:
                this.timestamp = 300000;
                break;
            case OptionTimeLimit.sevenMinute:
                this.timestamp = 420000;
                break;
            case OptionTimeLimit.tenMinute:
                this.timestamp = 600000;
                break;
            case OptionTimeLimit.fifteenMinute:
                this.timestamp = 900000;
                break;
            case OptionTimeLimit.thirdtyMinute:
                this.timestamp = 1800000;
                break;
        }

        this.guessOrder = this.players.slice();
        for (let i = this.guessOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.guessOrder[i], this.guessOrder[j]] = [this.guessOrder[j], this.guessOrder[i]];
        }

        this.emit("game-start");
        await this.loadQuestions(this.options.questionType);
    }

    public async loadQuestions(types: OptionQuestionType[]) {
        const jsonModules = types.map(type => {
            switch (type) {
                case OptionQuestionType.normal:
                    return import("@assets/questions/normal.json", { assert: { type: "json" } });
                case OptionQuestionType.adult:
                    return import("@assets/questions/adult.json", { assert: { type: "json" } });
                case OptionQuestionType.hell:
                    return import("@assets/questions/hell.json", { assert: { type: "json" } });
            }
        });

        const questionBanks = await Promise.all(jsonModules)
            .then(quesionModules => quesionModules.map(module => module.default));
        const questions = questionBanks.flat();


        for (const question of questions) {
            this.questionBank.push([question, 100]);
        }

        console.log(this.questionBank);
        console.log(this);
    }

    /** 換劇本的新一輪 */
    public async run() {
        for (this.round = 1; this.round <= this.maxRound; this.round++) {
            
            this.nextPlayer(); // 要換人
            this.setAnswerOrder(); // 設定回答順序
            this.tensors.clear(); // 清空等級卡
            this.destributeTensor(); // 分配等級卡
            this.clearMessages();

            const timestamp = Date.now();
            const timeLimit = this.timestamp ? timestamp + this.timestamp : null;
            this.emit("new-round", timeLimit);

            await this.chooseQuestion(); // 要換題目
            await this.getAnswers(); // 進入回答階段
            await this.getOrder(); // 排序階段

            if (this.life === 0) {
                break;
            }
        }
    }

    public nextPlayer() {
        // 選擇出題的人
        this.guesser = this.guessOrder[(this.round - 1) % this.guessOrder.length];
    }

    public async chooseQuestion() {

        this.stage = GameStage.choosing;
        this.emit("game-stage-change", this.stage);

        const questions: Map<number, Question> = new Map();
        let totalWeight = this.questionBank.reduce((sum, [_question, weight]) => sum + weight, 0);

        for (let i = 0; i < 4; i++) {
            let randomValue = Math.random() * totalWeight;
            for (let j = 0; j < this.questionBank.length; j++) {
                if (questions.has(j)) continue;

                const [question, weight] = this.questionBank[j];
                randomValue -= weight;

                if (randomValue <= 0) {
                    questions.set(j, question);
                    totalWeight -= weight;
                    break;
                }
            }
        }

        const guesser = this.guesser!;

        const choosedIndex = await guesser.chooseQuestionFrom(Array.from(questions.entries()).map(([index, question]) => ({ index, question })));
        const choosedQuestion = questions.get(choosedIndex)!;

        for (const player of this.participants.values())
            player.setQuestion(choosedQuestion);

        this.addMessage({
            type: MessageType.question,
            id: guesser.getId(),
            name: guesser.getName(),
            content: choosedQuestion
        });

        let weight = 0;
        for (const index of questions.keys()) {
            if (index === choosedIndex) {
                weight += this.questionBank[index][1];
                this.questionBank[index][1] = 0;
            } else {
                weight += Math.floor(this.questionBank[index][1] * .75);
                this.questionBank[index][1] = Math.ceil(this.questionBank[index][1] * .25);
            }
        }

        for (let index = 0; index < this.questionBank.length; index++) {
            if (questions.has(index)) continue;

            const weightDistribution = weight / (this.questionBank.length - index);
            const integerPart = Math.floor(weightDistribution);
            const decimalPart = weightDistribution - integerPart;

            this.questionBank[index][1] += integerPart;
            weight -= integerPart;
            if (Math.random() < decimalPart) {
                this.questionBank[index][1]++;
                weight--;
            }
        }
    }

    public setAnswerOrder() {

        switch (this.options.answerOrder) {
            case OptionAnswerOrder.random:
                this.answerOrder = this.players.slice();
                for (let i = this.answerOrder.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.answerOrder[i], this.answerOrder[j]] = [this.answerOrder[j], this.answerOrder[i]];
                }
                break;
            case OptionAnswerOrder.fixed:
                const guesserIndex = this.guessOrder.indexOf(this.guesser!);
                this.answerOrder = this.guessOrder.slice(guesserIndex + 1)
                    .concat(this.guessOrder.slice(0, guesserIndex)).reverse(); // 反轉以減少程序調整 index 過程
                break;
            case OptionAnswerOrder.freedom:
                this.answerOrder = null;
                break;
        }
    }

    public destributeTensor() {

        const tensors = [];
        for (let i = 1; i <= this.maxTensor; i++) {
            tensors.push(i);
        }

        // 為每個玩家分配一張等級卡
        for (const player of this.participants.values()) {
            if (player === this.guesser){
                player.setTensor(0);
                this.tensors.set(player.getId(), 0);
                this.emit("tensor-update", player.getId(), 0);
                continue
            };

            const index = Math.floor(Math.random() * tensors.length);
            if (index != tensors.length - 1)
                [tensors[index], tensors[tensors.length - 1]] = [tensors[tensors.length - 1], tensors[index]];

            const tensor = tensors.pop()!;
            player.setTensor(tensor);
            this.tensors.set(player.getId(), tensor);
            this.emit("tensor-update", player.getId(), tensor);
        }
    }

    public async getAnswers() {
        this.stage = GameStage.answering;
        this.emit("game-stage-change", this.stage);

        // 自由回答模式
        if (!this.answerOrder) {
            const players: GameAgent[] = [];

            for (const player of this.players) {
                if (player === this.guesser) continue;
                player.startAnswering();
                players.push(player);
            }

            this.emit("players-allow-answering", players);
        }

        // 等待回答，共有參與者數量-1次回答
        await new Promise<void>(resolve => {
            let answerCount = this.participants.size - 1;

            const nextAnswerer = () => {
                if (!this.answerOrder || !this.answerOrder.length) return;
                const player = this.answerOrder!.pop()!;
                player.startAnswering();
                this.emit("player-allow-answering", player);
            }

            const onAnswered = (data: any) => {
                const player = data.player as GameAgent;
                const answerContent = data.answer as string;

                const message: AnswerMessage = {
                    type: MessageType.answer,
                    id: player.getId(),
                    name: player.getName(),
                    content: answerContent
                };

                this.addMessage(message);
                this.emit("player-answer", player, answerContent);

                if (--answerCount === 0) {
                    this.off("answer", onAnswered);
                    return resolve();
                }
                nextAnswerer();
            }

            nextAnswerer();
            this.on("answer", onAnswered);
        });
    }

    public async getOrder() {
        this.stage = GameStage.sorting;
        this.emit("game-stage-change", this.stage);

        let answerCount = this.players.length - 1;

        // 等待排序，共有參與者數量-1次排序
        this.guesser!.startSorting(answerCount);

        const hasError = await new Promise<boolean>(resolve => {
            let lastTensor = 0;
            let hasError = false;

            const onSorted = (player: GameAgent) => {
                const tensor = this.tensors.get(player.getId())!;

                console.log("Tensor : " + tensor + "lastTensor : " + lastTensor);

                if (tensor < lastTensor) {
                    hasError = true;
                    this.life--;
                    this.emit("life-decrease", this.life);
                }

                lastTensor = tensor;
                this.emit("player-was-sorted", player, tensor);

                if (--answerCount === 0) {
                    this.off("sorted", onSorted);
                    return resolve(hasError);
                }
            };

            this.on("sorted", onSorted);
        });

        if (this.options.mode === OptionMode.endless && !hasError) {
            this.life++;
            if (this.life > this.players.length)
                this.life = this.players.length;
            this.emit("life-increase", this.life);
        }
    }

    public end() {
        // 顯示結果，回到等待階段
        this.stage = GameStage.ended;
        this.emit("game-stage-change", this.stage);

        // TODO: 顯示結果
    }

    public answerBy(player: GameAgent, answer: string) {
        this.emit("answer", { player, answer });
    }

    public sort(player: GameAgent) {
        this.emit("sorted", player);
    }

    public addMessage(message: Message) {
        this.messages.push(message);
        this.emit("new-message", message);
    }

    public clearMessages() {
        this.messages = [];
        this.emit("clear-messages");
    }
}


export default GameHost;