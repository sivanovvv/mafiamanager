import {createContext, createRef} from "react";

/**
 * @typedef IconPickerContextValue
 * @property {string}                   searchString
 * @property {function(string):void}    setSearchString
 * @property {string|null}                   skinTone
 * @property {function(string|null):void}    setSkinTone
 * @property {string|null}                   hairStyle
 * @property {function(string|null):void}    setHairStyle
 * @property {IconPickerOptions}        options
 * @property {"fa"|"emoji"}             tab
 * @property {function("fa"|"emoji"):void}      setTab
 * @property {function(string):Promise<IconType[]>}   searchEmojis
 * @property {function(string):Promise<IconType[]>}     searchFaIcons
 * @property {IconType[]}       selectedIcons
 * @property {function(IconType[]):void}    setSelectedIcons
 * @property {React.MutableRefObject<HTMLDialogElement>}  ref
 * @property {number}       activeIdx
 * @property {function}       submit
 * @property {function}       close
 */

/**
 *
 * @type {React.Context<IconPickerContextValue>}
 */
const IconPickerContext = createContext({
    searchString: "",
    setSearchString: (str) => {},
    skinTone: null,
    setSkinTone: (tone) => {},
    hairStyle: null,
    setHairStyle: (style) => {},
    options: {},
    currentSelection: [],
    tab: 'fa',
    setTab: tab => {},
    searchFaIcons: async (str) => [],
    searchEmojis: async (str) => [],
    selectedIcons: [],
    setSelectedIcons: (icons) => {},
    ref: createRef(),
    activeIdx: 0,
    submit: () => {},
    close: () => {},
});

export default IconPickerContext;