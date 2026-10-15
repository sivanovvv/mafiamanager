import IconPickerContext from "../contexts/IconPickerContext.js";
import {useCallback, useContext, useRef} from "react";
import EmojiModifier from "./EmojiModifier.jsx";
import {debounce} from "lodash";

export default function Search() {
    const {
        setSearchString,
        tab,
        ref,
        options
    } = useContext(IconPickerContext);

    const setSearchStringRef = useRef(setSearchString);
    setSearchStringRef.current = setSearchString;
    const animationFrame = useRef(null);

    const update = useCallback(
        debounce(
            /**@param {ChangeEvent<HTMLInputElement>} e */
            e => {
                setSearchStringRef.current(e.target.value);
                setTimeout(() => {
                    if (animationFrame.current !== 0) {
                        cancelAnimationFrame(animationFrame.current);
                    }
                    requestAnimationFrame(() => ref.current?.querySelectorAll(`.ipsIconPicker__container`).forEach(tab => tab.classList.remove('ipsLoading')))
                },1);
            },
            1000
        ),
        []
    );


    return (
        <div
            className={"ipsIconPicker__search"}
        >
            <input
                name={'icon_picker_search_box'}
                data-role={'search'}
                placeholder={window.ips.getString('iconpicker_prompt')}
                className={'ipsInput'}
                type={'text'}
                defaultValue={""}
                onChange={(e) => {
                    animationFrame.current = requestAnimationFrame(() => {
                        animationFrame.current = null;
                        ref.current.querySelectorAll(`.ipsIconPicker__container:not(.ipsLoading)`).forEach(tab => tab.classList.add('ipsLoading'))
                    })
                    setTimeout(() => {
                        update(e);
                    }, 0);
                }}
                onFocusCapture={e => {
                    e.stopPropagation();
                    e.stopImmediatePropagation?.();
                }}
            />
            {
                (options?.nativeEmoji === false || tab !== 'emoji') ? <></> : (
                    <div data-role={"type_selectors"}>
                        <EmojiModifier name={'skinTone'} />
                        <EmojiModifier name={"hairStyle"} />
                    </div>
                )
            }
        </div>
    )
}