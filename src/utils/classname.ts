
type ClassName = string | ClassMap | null | undefined | boolean;
type ClassMap = { [key: string]: boolean };
export function classname(...classes: ClassName[]) {
    const classSet = new Set<string>();

    for (const c of classes) {
        if (typeof c === "string") {
            classSet.add(c);
        } else if (typeof c === "object") {
            for (const key in c) {
                if (c[key]) classSet.add(key);
            }
        }
    }

    return Array.from(classSet).join(" ");
}