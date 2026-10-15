import {createContext} from "react";


/**
 * @type {React.Context<{type: "fa"|"emoji", activeIcon: undefined|string}>}
 */
const IconAreaContext = createContext({
    type: "fa",
    activeIcon: undefined,
})

export default IconAreaContext;