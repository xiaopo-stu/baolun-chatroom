import { FunctionComponent } from "react";

import { useAgent } from "./core/agent/hook";
import { Homepage } from "./screens/homepage";
import { Game } from "./screens/game";

export const App: FunctionComponent = function() {
    const agent = useAgent();
    return agent ? <Game /> : <Homepage />;
};

export default App;