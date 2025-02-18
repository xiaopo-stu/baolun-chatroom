import { classname } from "@utils/classname";
import type { FunctionComponent, ReactNode } from "react";

import styles from "./degree-chooser.module.css";

interface DegreeChooserProps {
    className?: string;
    options: ReactNode[];
    selectIndex: number;
    showValue?: boolean;
    onChoose?: (index: number) => void;
    disabled?: boolean;
}
export const DegreeChooser: FunctionComponent<DegreeChooserProps> = function (props) {
    const thumbPosition = `calc(${props.selectIndex * 100}% / ${props.options.length - 1})`;

    return (
        <div className={classname(props.className, styles.container, props.disabled && styles.disabled)}>
            <div className={styles.slider}>
                <div className={styles.thumb} style={{ left: thumbPosition }} />
                <div className={styles.track} />
                <input
                    className={styles.input} type="range"
                    min={0} max={props.options.length - 1}
                    defaultValue={props.selectIndex}
                    onChange={e => props.disabled || props.onChoose?.(parseInt(e.target.value))}
                />
            </div>
            {props.showValue && props.options[props.selectIndex]}
        </div>
    );
};