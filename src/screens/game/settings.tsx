import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

import { ButtonAndCollapse } from "@components/button-and-collapse";

import styles from "./settings.module.css";
import { classname } from "@utils/classname";
import { DegreeChooser } from "@components/degree-chooser";
import { useAgent } from "@core/agent/hook";
import { gameModeFixedOptionMap, GameOptions, OptionMode, OptionQuestionType, OptionDeadWeight } from "@core/game-host";
import { HostAgent } from "@core/agent/host";

const lifeOptionText = ["不限制", "總共 3 命", "總共 5 命", "總共 7 命", "總共 10 命", "每人 1 命", "每人 2 命", "每人 3 命"];
const roundOptionText = ["不限制", "總共 3 回合", "總共 5 回合", "總共 7 回合", "總共 10 回合", "每人 1 回合", "每人 2 回合", "每人 3 回合"];
const timeOptionText = ["僅計時", "1 分鐘", "3 分鐘", "5 分鐘", "7 分鐘", "10 分鐘", "15 分鐘", "30 分鐘"];
const maxTensorOptionText = ["5 等級", "7 等級", "10 等級", "15 等級", "20 等級", "每人 1 等級", <>每人 1 等級<br />與額外 5 等級</>, <>每人 1 等級<br />與每 2 人 1 等級</>, "每人 2 等級"];
const answerOrderOptionText = ["隨機排序", "固定順序", "自由回答"];
const deadWeightOptionText = ["不啟用", "啟用"];


export const HostSettings: FunctionComponent = function () {
    const agent = useAgent() as HostAgent;

    const [gameMode, setGameMode] = useState<OptionMode>(OptionMode.standard);

    const [life, setLife] = useState(agent.getGameOptions().life);
    const [round, setRound] = useState(agent.getGameOptions().round);
    const [maxTensor, setMaxTensor] = useState(agent.getGameOptions().maxTensor);
    const [answerOrder, setAnswerOrder] = useState(agent.getGameOptions().answerOrder);
    const [timeLimit, setTimelimit] = useState(agent.getGameOptions().timeLimit);
    const [deadWeight, setDeadWeight] = useState(agent.getGameOptions().deadWeight);

    const [questionType, setQuestionType] = useState(agent.getGameOptions().questionType);

    const fixedOptions = gameModeFixedOptionMap[gameMode];

    function toggleQuestionType(type: OptionQuestionType) {
        const index = questionType.indexOf(type);
        if (index == -1) {
            questionType.push(type);
        } else if (questionType.length > 1) {
            questionType.splice(index, 1);
        }

        agent.updateGameOptions({ questionType });
    }

    useEffect(() => {
        const handler = (options: GameOptions) => {
            setGameMode(options.mode);
            setLife(options.life);
            setRound(options.round);
            setMaxTensor(options.maxTensor);
            setAnswerOrder(options.answerOrder);
            setTimelimit(options.timeLimit);
            setQuestionType(options.questionType.slice());
            setDeadWeight(options.deadWeight);
        };
        agent.on("update-options", handler);
        return () => void agent.off("update-options", handler);
    }, [agent]);

    return (
        <div className={styles.container}>
            <div className={styles.optionTitle}>遊戲模式</div>
            <div className={styles.gamemode}>
                <ButtonAndCollapse
                    className={styles.option} label={"標準模式"}
                    buttonClassName={classname(styles.mode, gameMode === OptionMode.standard && styles.active)}
                    collapsed={gameMode !== OptionMode.standard}
                    onClick={() => agent.updateGameOptions({ mode: OptionMode.standard })}
                >
                    <div className={styles.intro}>有生命值限制，完成指定輪數後遊戲結束，若有剩餘生命值則獲勝。</div>
                </ButtonAndCollapse>
                <ButtonAndCollapse
                    className={styles.option} label={"友善模式"}
                    buttonClassName={classname(styles.mode, gameMode === OptionMode.friendly && styles.active)}
                    collapsed={gameMode !== OptionMode.friendly}
                    onClick={() => agent.updateGameOptions({ mode: OptionMode.friendly })}
                >
                    <div className={styles.intro}>沒有生命值限制，完成指定輪數後遊戲結束。</div>
                </ButtonAndCollapse>
                <ButtonAndCollapse
                    className={styles.option} label={"無盡模式"}
                    buttonClassName={classname(styles.mode, gameMode === OptionMode.endless && styles.active)}
                    collapsed={gameMode !== OptionMode.endless}
                    onClick={() => agent.updateGameOptions({ mode: OptionMode.endless })}
                >
                    <div className={styles.intro}>有生命值限制，上限與玩家數量相同。當完美回答後獲得生命值。在生命值用盡前儘可能生存多個回合。</div>
                </ButtonAndCollapse>
            </div>
            <div className={styles.optionTitle}>題目類型</div>
            <div className={styles.questionType}>
                <button
                    className={classname(styles.option, questionType.includes(OptionQuestionType.normal) && styles.active)}
                    onClick={() => toggleQuestionType(OptionQuestionType.normal)}
                >
                    一般向
                </button>
                <button
                    className={classname(styles.option, questionType.includes(OptionQuestionType.adult) && styles.active)}
                    onClick={() => toggleQuestionType(OptionQuestionType.adult)}
                >
                    成人向
                </button>
                <button
                    className={classname(styles.option, questionType.includes(OptionQuestionType.hell) && styles.active)}
                    onClick={() => toggleQuestionType(OptionQuestionType.hell)}
                >
                    地獄哏
                </button>
                <a className={styles.upload} href="https://forms.gle/n9mcDGSsGFXu865V7" target="_black">上傳題目</a>
                <div>題目數量：205</div>
            </div>
            <div className={styles.optionTitle}>遊戲設定</div>
            <div className={classname(styles.optionItem, styles.optionRangeItem)}>
                <div className={styles.prompt}>
                    <div className={styles.info}>
                        <div className={styles.name}>生命值</div>
                        <div className={styles.hint}>順序錯誤時損失，盡可能地讓團隊存活下來</div>
                    </div>
                    <div className={styles.value}>{lifeOptionText[fixedOptions.life ?? life]}</div>
                </div>
                <DegreeChooser options={lifeOptionText} disabled={fixedOptions.life !== undefined}
                    selectIndex={fixedOptions.life ?? life} onChoose={index => agent.updateGameOptions({ life: index })}
                />
            </div>
            <div className={classname(styles.optionItem, styles.optionRangeItem)}>
                <div className={styles.prompt}>
                    <div className={styles.info}>
                        <div className={styles.name}>遊玩回合</div>
                        <div className={styles.hint}>在回合內合作避免扣除全部生命值</div>
                    </div>
                    <div className={styles.value}>{roundOptionText[fixedOptions.round ?? round]}</div>
                </div>
                <DegreeChooser options={roundOptionText} disabled={fixedOptions.round !== undefined}
                    selectIndex={fixedOptions.round ?? round} onChoose={index => agent.updateGameOptions({ round: index })}
                />
            </div>
            <div className={classname(styles.optionItem, styles.optionRangeItem)}>
                <div className={styles.prompt}>
                    <div className={styles.info}>
                        <div className={styles.name}>時間限制</div>
                        <div className={styles.hint}>規定的時間內完成回答並排序</div>
                    </div>
                    <div className={styles.value}>{timeOptionText[fixedOptions.timeLimit ?? timeLimit]}</div>
                </div>
                <DegreeChooser options={timeOptionText} disabled={fixedOptions.timeLimit !== undefined}
                    selectIndex={fixedOptions.timeLimit ?? timeLimit} onChoose={index => agent.updateGameOptions({ timeLimit: index })}
                />
            </div>
            <div className={classname(styles.optionItem, styles.optionRangeItem)}>
                <div className={styles.prompt}>
                    <div className={styles.info}>
                        <div className={styles.name}>強度上限</div>
                        <div className={styles.hint}>按照強度等級及題目敘述來完成作答</div>
                    </div>
                    <div className={styles.value}>{maxTensorOptionText[fixedOptions.maxTensor ?? maxTensor]}</div>
                </div>
                <DegreeChooser options={maxTensorOptionText} disabled={fixedOptions.maxTensor !== undefined}
                    selectIndex={fixedOptions.maxTensor ?? maxTensor} onChoose={index => agent.updateGameOptions({ maxTensor: index })}
                />
            </div>
            <div className={classname(styles.optionItem, styles.optionRangeItem)}>
                <div className={styles.prompt}>
                    <div className={styles.info}>
                        <div className={styles.name}>回答順序</div>
                        <div className={styles.hint}>按順序對題目作出符合所抽強度的回答</div>
                    </div>
                    <div className={styles.value}>{answerOrderOptionText[fixedOptions.answerOrder ?? answerOrder]}</div>
                </div>
                <DegreeChooser options={answerOrderOptionText} disabled={fixedOptions.answerOrder !== undefined}
                    selectIndex={fixedOptions.answerOrder ?? answerOrder} onChoose={index => agent.updateGameOptions({ answerOrder: index })}
                />
            </div>
            <label className={classname(styles.optionItem, styles.optionItemCheckbox)}>
                <div className={styles.info}>
                    <div className={styles.name}>開啟戰犯模式</div>
                    <div className={styles.hint}>每個回合結束投票出這輪次最狗屎的玩家 {/* 給表現最差的玩家大大的「肯定」*/}</div>
                </div>
                <input className={styles.inputCheck} type="checkbox" checked={deadWeight === OptionDeadWeight.activate} onChange={() => {
                    agent.updateGameOptions({ deadWeight: deadWeight === OptionDeadWeight.activate ? OptionDeadWeight.unactivate : OptionDeadWeight.activate });
                }} />
            </label>
        </div>
    );
};

export const PlayerSettings: FunctionComponent = function () {
    const agent = useAgent()!;

    const [gameMode, setGameMode] = useState<OptionMode>(OptionMode.standard);


    const [life, setLife] = useState(agent.getGameOptions().life);
    const [round, setRound] = useState(agent.getGameOptions().round);
    const [maxTensor, setMaxTensor] = useState(agent.getGameOptions().maxTensor);
    const [answerOrder, setAnswerOrder] = useState(agent.getGameOptions().answerOrder);
    const [timeLimit, setTimelimit] = useState(agent.getGameOptions().timeLimit);
    const [deadWeight, setDeadWeight] = useState(agent.getGameOptions().deadWeight);

    const [questionType, setQuestionType] = useState(agent.getGameOptions().questionType);

    useEffect(() => {
        const handler = (options: GameOptions) => {
            setGameMode(options.mode);
            setLife(options.life);
            setRound(options.round);
            setMaxTensor(options.maxTensor);
            setAnswerOrder(options.answerOrder);
            setTimelimit(options.timeLimit);
            setQuestionType(options.questionType.slice());
            setDeadWeight(options.deadWeight);
        };
        agent.on("update-options", handler);
        return () => void agent.off("update-options", handler);
    }, [agent]);

    return (
        <div className={styles.container}>
            <div className={styles.optionTitle}>遊戲模式</div>
            <div className={styles.gamemode}>
                <div className={styles.option}>
                    <div className={classname(styles.mode, styles.active)}>
                        {gameMode === OptionMode.standard && "標準模式"}
                        {gameMode === OptionMode.friendly && "友善模式"}
                        {gameMode === OptionMode.endless && "無盡模式"}
                    </div>
                    <div className={styles.intro}>
                        {gameMode === OptionMode.standard && "有生命值限制，完成指定輪數後遊戲結束，若有剩餘生命值則獲勝。"}
                        {gameMode === OptionMode.friendly && "沒有生命值限制，完成指定輪數後遊戲結束。"}
                        {gameMode === OptionMode.endless && "有生命值限制，上限與玩家數量相同。當完美回答後獲得生命值。在生命值用盡前儘可能生存多個回合。"}
                    </div>
                </div>
            </div>
            <div className={styles.optionTitle}>題目類型</div>
            <div className={styles.questionType}>
                <div className={classname(styles.option, questionType.includes(OptionQuestionType.normal) && styles.active)}>一般向</div>
                <div className={classname(styles.option, questionType.includes(OptionQuestionType.adult) && styles.active)}>成人向</div>
                <div className={classname(styles.option, questionType.includes(OptionQuestionType.hell) && styles.active)}>地獄哏</div>
                <a className={styles.upload} href="https://forms.gle/n9mcDGSsGFXu865V7" target="_black">上傳題目</a>
                <div>題目數量：205</div>
            </div>
            <div className={styles.optionTitle}>遊戲設定</div>
            <div className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>生命值</div>
                    <div className={styles.hint}>調整生命值的上限，盡可能地讓團隊存活下來</div>
                </div>
                <div className={styles.value}>{lifeOptionText[life]}</div>
            </div>
            <div className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>遊玩回合</div>
                    <div className={styles.hint}>調整遊玩的次數，在回合內合作避免扣除全部生命值</div>
                </div>
                <div className={styles.value}>{roundOptionText[round]}</div>
            </div>
            <div className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>時間限制</div>
                    <div className={styles.hint}>調整時間的限制，在規定的時間內完成排序</div>
                </div>
                <div className={styles.value}>{timeOptionText[timeLimit]}</div>
            </div>
            <div className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>強度區間</div>
                    <div className={styles.hint}>調整時間的限制，在規定的時間內完成排序</div>
                </div>
                <div className={styles.value}>{maxTensorOptionText[maxTensor]}</div>
            </div>
            <div className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>回答順序</div>
                    <div className={styles.hint}>調整時間的限制，在規定的時間內完成排序</div>
                </div>
                <div className={styles.value}>{answerOrderOptionText[answerOrder]}</div>
            </div>
            <label className={styles.optionItem}>
                <div className={styles.info}>
                    <div className={styles.name}>開啟戰犯模式</div>
                    <div className={styles.hint}>每個回合結束投票出這輪次最狗屎的玩家</div>
                </div>
                {/* <input className={styles.inputCheck} type="checkbox" checked={deadWeight === OptionWar.activate} disabled /> */}
                <div className={styles.value}>{deadWeightOptionText[deadWeight]}</div>
            </label>
        </div>
    );
}