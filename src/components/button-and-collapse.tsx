import type { FunctionComponent, PropsWithChildren, ReactNode, MouseEventHandler } from "react";

import styles from "./button-and-collapse.module.css";
import { classname } from "@utils/classname";

interface ButtonAndCollapseProps extends PropsWithChildren {
    label: ReactNode;
    collapsed: boolean;
    className?: string;
    buttonClassName?: string;
    collapseClassName?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}
export const ButtonAndCollapse: FunctionComponent<ButtonAndCollapseProps> = function (props) {

    return (
        <div className={classname(props.className, styles.container)}>
            <button className={classname(props.buttonClassName, styles.button)} onClick={props.onClick}>{props.label}</button>
            <div className={classname(props.collapseClassName, styles.collapse, props.collapsed && styles.collapsed)} data-collapsed={props.collapsed}>
                {props.children}
            </div>
        </div>
    );
}; 