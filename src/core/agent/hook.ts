import { EventEmitter } from "events";
import { InteractionAgent } from ".";

import { useEffect, useState } from "react";

const agentHolder = new class extends EventEmitter {
    agent: InteractionAgent | null = null;
    
    setAgent(newAgent: InteractionAgent | null): void {
        this.agent = newAgent;
        this.emit('agent', newAgent);
    }

    getAgent(): InteractionAgent | null {
        return this.agent;
    }
};

export function useAgent(): InteractionAgent | null {

    const [agent, setAgent] = useState<InteractionAgent | null>(agentHolder.getAgent());

    useEffect(() => {
        const listener = () => setAgent(agentHolder.getAgent());
        agentHolder.on('agent', listener);
        return () => void agentHolder.off('agent', listener);
    }, [setAgent]);

    return agent;
}

export function setAgent(newAgent: InteractionAgent | null): void {
    agentHolder.setAgent(newAgent);
}