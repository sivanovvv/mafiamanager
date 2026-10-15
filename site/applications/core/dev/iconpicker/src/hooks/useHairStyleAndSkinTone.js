import {useState} from "react";

/**
 *
 * @return {{hairStyle: string|null, setHairStyle: function(string|null) : void, setSkinTone: function(string|null):void, skinTone: string|null}}
 */
export default function useHairStyleAndSkinTone() {
    const [hairStyle, _setHairStyle] = useState(() => {
        return Number(window.ips.utils.db.get('emoji', 'hairStyle'))?.toString() || null;
    });
    const [skinTone, _setSkinTone] = useState(() => {
        return Number(window.ips.utils.db.get('emoji', 'skinTone'))?.toString() || null;
    });

    return {
        hairStyle,
        skinTone,
        setHairStyle(value) {
            _setHairStyle(value);
        },
        setSkinTone(value) {
            _setSkinTone(value);
        }
    };
}