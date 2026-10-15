import {useContext} from "react";
import IconPickerContext from "../contexts/IconPickerContext.js";
import IconCategory from "./IconCategory.jsx";

export default function SelectedIcons() {
    const {options, selectedIcons} = useContext(IconPickerContext);
    if (options.submitOnClick || !selectedIcons.length) {
        return <></>
    }

    return (
        <div data-role={"selected_icons"}>
            <IconCategory
                icons={selectedIcons}
                name={window.ips.getString('iconpicker_selected_icons')}
                count={selectedIcons.length}
            />
        </div>
    );
}