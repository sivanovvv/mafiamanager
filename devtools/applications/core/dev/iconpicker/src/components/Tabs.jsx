import {useContext, useTransition} from "react";
import IconPickerContext from "../contexts/IconPickerContext.js";

/**
 *
 * @param {function("emoji"|'fa')} action
 * @return {JSX.Element}
 * @constructor
 */
export default function Tabs({action}) {
    const {options, tab, ref} = useContext(IconPickerContext);
    const [transitioning, startTransition] = useTransition();
    const allowedTypes = options.allowedTypes instanceof Array ? options.allowedTypes : ['emoji', 'fa'];
    let tabs = <></>
    if (allowedTypes.length >= 2) {
        tabs = (
            <div data-role="tabs">
                {allowedTypes.map(allowedType => (
                    <button
                        key={allowedType}
                        data-role={"tab"}
                        data-tab={allowedType}
                        type={'button'}
                        data-active={allowedType === tab ? "" : undefined}
                        onClick={(e) => {
                            e.preventDefault()
                            if (allowedType !== tab) {
                                const iconArea = [...ref.current.querySelectorAll('.ipsIconPicker__container')]
                                // use a timeout to avoid forced reflow
                                startTransition(() => {
                                    let frame = requestAnimationFrame(() => iconArea.forEach(el => el.classList.add('ipsLoading')));
                                    action(allowedType);
                                    // use a timeout to avoid forced reflow
                                    requestAnimationFrame(() => {
                                        cancelAnimationFrame(frame);
                                        ref.current.querySelector('input[name="icon_picker_search_box"]')?.focus();
                                        iconArea.forEach(el => el.classList.remove('ipsLoading'));
                                    });
                                })
                            }
                        }}
                    >
                        {window.ips.getString(`ips_icon_picker__tab_${allowedType}`)}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div
            className={"ipsIconPicker__tabs"}
        >
            {tabs}
            <button
                type={'button'}
                data-role={"close"}
                aria-label={'Close'}
                title={window.ips.getString('close')}
                onClick={e => {
                    e.target.closest('dialog')?.close();
                }}
                className={'ipsIconPicker__close'}
            >
                <i className={'fa-solid fa-times'} />
            </button>
        </div>
    )
}