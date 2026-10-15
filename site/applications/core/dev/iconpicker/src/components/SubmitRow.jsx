import {useContext} from "react";
import IconPickerContext from "../contexts/IconPickerContext.js";

export default function SubmitRow() {
    const {options, selectedIcons} = useContext(IconPickerContext);

    if (options.anchor || options.container || options.panelMode) {
        return <></>
    }

    const lang = window.ips.pluralize(window.ips.getString('iconpicker_submit'), selectedIcons.length || 0);
    return (
        <div className={'ipsSubmitRow'}>
            <button
                type={'submit'}
                className={"ipsButton ipsButton--primary"}
                aria-label={lang}
                disabled={selectedIcons.length < (typeof options.minIcons === 'number' ? options.minIcons : 1)}
            >
                {lang}
            </button>
        </div>
    )
}