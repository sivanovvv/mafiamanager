import IconButton from "./IconButton.jsx";
import {useMemo} from "react";

/**
 * Category of icons
 * @param   {string} name
 * @param {IconType[]}    icons
 * @param {number}      [count]
 * @return {JSX.Element}
 * @constructor
 */
export default function IconCategory({name, icons, count}) {
    count = count === undefined ? icons.length : count;
    const effectiveTitleKey = useMemo(() => name.toLowerCase().replaceAll(/[^a-z0-9\s]/g, '').trim().replaceAll(/\s+/g, '_'), [name]);
    if (count === 0) {
        return <></>

    }
    const customTitle = window.ips.haveString(`iconpicker_category--${effectiveTitleKey}`) ? window.ips.getString(`iconpicker_category--${effectiveTitleKey}`) : name;
    return (
        <section
            className={"ipsIconPicker__category"}
            data-icon-category={name}
        >
            <h4 className={'ipsIconPicker__category-title'}>
                {customTitle} ({count})
            </h4>
            <div data-role={"iconarea"}>
                {icons.map((icon) => (
                    <IconButton
                        key={icon.key}
                        icon={icon}
                    />
                ))}
            </div>
        </section>
    )
}