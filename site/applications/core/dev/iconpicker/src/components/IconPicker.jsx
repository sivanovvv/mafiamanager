import IconPickerContext from "../contexts/IconPickerContext.js";
import Tabs from "./Tabs.jsx";
import {useEffect, useRef, useState} from "react";
import useHairStyleAndSkinTone from "../hooks/useHairStyleAndSkinTone.js";
import Search from "./Search.jsx";
import IconArea from "./IconArea.jsx";
import {useSearchFilter} from "../hooks/useSearchFilter.js";
import {useIconPickerPositioner} from "../hooks/useIconPickerPositioner.js";
import SelectedIcons from "./SelectedIcons.jsx";
import SubmitRow from "./SubmitRow.jsx";
import useSubmitClose from "../hooks/useSubmitClose.js";

/**
 * @typedef IconPickerRenderHookOptions
 * @property {HTMLElement}  elem
 * @property {function(string)}     setSearchString
 * @property {function(string, *)}  setOption
 * @property {function}         incrementHighlight
 * @property {function}         decrementHighlight
 */

/**
 *
 * @param {IconPickerOptions} options
 * @param search
 * @param {function(string): Promise<{[category:string]: IconType[]}>}  searchEmojis
 * @param {function(string): Promise<{[category:string]: IconType[]}>}  searchFaIcons
 * @param {IconType[]}      _selectedIcons
 * @param {function(IconType[]):void}       _setSelectedIcons
 * @param {function}    _close
 * @param {function(IconPickerRenderHookOptions)}       [onRender]
 * @param {function|undefined}          onSubmit
 * @param {function|undefined}          onClose
 * @return {JSX.Element}
 * @constructor
 */
export default function IconPicker({options, searchEmojis, searchFaIcons, selectedIcons:_selectedIcons, setSelectedIcons:_setSelectedIcons, close: _close, skinToneOptions, hairStyleOptions, onRender, onSubmit, onClose}) {
    const [searchString, setSearchString] = useState("");
    const {hairStyle, setHairStyle, skinTone, setSkinTone} = useHairStyleAndSkinTone();
    const [selectedIcons, setSelectedIcons] = useState(_selectedIcons);
    const {close, submit} = useSubmitClose({selectedIcons, onSubmit, onClose, close: _close, options})
    const [tab, setTab] = useState(() => {
        if (options.defaultTab === "emoji" || !options.allowedTypes.includes('fa')) {
            return "emoji"
        }
        return "fa";
    })
    const css = useSearchFilter(searchString, options);
    const [activeIdx, setActiveIdx] = useState(0);
    /**
     * @type {React.RefObject<null|HTMLDialogElement>}
     */
    const ref = useRef(null);
    const [inc, setInc] = useState(0);
    useIconPickerPositioner({options, ref});
    useEffect(() => {
        onRender?.({
            elem: ref.current,
            setSearchString(str) {
                setActiveIdx(0);
                setSearchString(str);
            },
            setOption(option, value) {
                options[option] = value;
                setInc(inc+1);
            },
            incrementHighlight() {
                const totalIcons = ref.current.querySelectorAll('.ipsIconPicker__container [data-role="iconpicker_item"]').length;
                if (!totalIcons) {
                    setActiveIdx(0);
                } else {
                    setActiveIdx((activeIdx + 1) % totalIcons);
                }
            },
            decrementHighlight() {
                const totalIcons = ref.current.querySelectorAll('.ipsIconPicker__container [data-role="iconpicker_item"]').length;
                if (!totalIcons) {
                    setActiveIdx(0)
                } else {
                    let idx = activeIdx - 1;
                    while (idx < 0) {
                        idx += totalIcons;
                    }
                    setActiveIdx(idx);
                }
            }
        });
    });

    const isPopover = !!(options.anchor || options.container || options.panelMode);
    useEffect(() => {
        if (!isPopover) {
            ref.current.showModal();
        }
        if (!options.panelMode) {
            ref.current.querySelector('input[name="icon_picker_search_box"]')?.focus();
        }
    }, [isPopover, options.panelMode]);

    useEffect(() => {
        if (options.panelMode) {
            return;
        }
        const el = ref.current;
        const closeCb = () => close();
        /** @param   {MouseEvent} e */
        const blurCb = e => {
            if (!(e.target instanceof Element) || e.target.closest('body') !== document.body || (e.target !== el && e.target.closest('dialog') === el) || !el.open) {
                return;
            }
            el.dispatchEvent(new CustomEvent('close'));
        }
        el.addEventListener('close', closeCb);
        document.addEventListener('click', blurCb, {capture: true});
        return () => {
            el.removeEventListener('close', closeCb);
            document.removeEventListener('click', blurCb, {capture: true});
        };
    }, [close, options.panelMode]);

    const otherClasses = [];
    if (options.panelMode) {
        otherClasses.push('ipsIconPicker--panel')
    }

    if (options.anchor || options.container || options.panelMode) {
        otherClasses.push('ipsIconPicker--anchored')
    }

    return (
        <dialog
            ref={ref}
            open={isPopover ? true : undefined}
            className={`ipsIconPicker__dialog ${options.panelMode ? 'ipsIconPicker__dialog--panel' : ''} ${isPopover ? 'ipsIconPicker__dialog--positioned' : 'ipsIconPicker__dialog--modal'}`}
        >
            <form
                action={"#"}
                className={`ipsIconPicker ${otherClasses.join(" ")}`}
                style={{width: options.container ? "100%" : undefined}}
                onSubmitCapture={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    submit();
                }}
            >
                <IconPickerContext.Provider value={{
                    options,
                    setSearchString,
                    searchString,
                    hairStyle,
                    setHairStyle,
                    skinTone,
                    setSkinTone,
                    skinToneOptions,
                    hairStyleOptions,
                    tab,
                    setTab,
                    searchEmojis,
                    searchFaIcons,
                    selectedIcons,
                    activeIdx,
                    setSelectedIcons(icons) {
                        if (!icons?.length) {
                            icons = [];
                        }

                        if (typeof options.maxIcons === 'number') {
                            icons = icons.slice(0, options.maxIcons);
                        }

                        if (icons.length && options.submitOnClick) {
                            submit(icons.slice(0,1));
                        }
                        _setSelectedIcons(icons);
                        setSelectedIcons(icons);
                    },
                    onSubmit,
                    onClose,
                    ref
                }}>
                    <style>
                        {css}
                    </style>
                    <Tabs
                        action={setTab}
                    />
                    <Search/>
                    {(options.allowedTypes instanceof Array ? options.allowedTypes : ['emoji','fa']).filter(type => type === tab).map(type => (
                        <IconArea
                            key={type}
                            type={type}
                        />
                    ))}
                    <SelectedIcons/>
                    <SubmitRow/>
                </IconPickerContext.Provider>
            </form>
        </dialog>
    )
}