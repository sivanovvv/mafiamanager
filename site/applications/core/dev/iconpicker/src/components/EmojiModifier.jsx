import {useContext} from "react";
import IconPickerContext from "../contexts/IconPickerContext.js";

/**
 *
 * @param {"skinTone"|"hairStyle"}    name
 * @return {JSX.Element}
 * @constructor
 */
export default function EmojiModifier({name}) {
    const {
        [name]: currentValue,
        [`set${name[0].toUpperCase()}${name.slice(1)}`]: setValue,
        [`${name}Options`] : options
    } = useContext(IconPickerContext);
    return (
        <select
            className={'ipsInput'}
            hidden={name === 'hairStyle'}
            defaultValue={currentValue}
            name={'icon_type_selector'}
            data-field={name}
            onChange={e => {
                window.ips.utils.db.set('emoji' , name, Number(e.target.value) || "", false);
                setValue(e.currentTarget.value)
            }}
        >
            {options.map(option => (
                <option
                    key={option.value}
                    value={option.value}
                    title={option.title}
                    aria-label={option.title}
                >
                    {option.label}
                </option>
            ))}
        </select>
    )
}