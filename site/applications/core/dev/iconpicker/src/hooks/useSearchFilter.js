import {useMemo} from "react";
import extractSearchWordsFromTerm from "../helpers/extractSearchWordsFromTerm.js";

export function useSearchFilter(searchString, options) {
    const selectors = useMemo(() => {
        if (options.panelMode) {
            return [];
        }
        return extractSearchWordsFromTerm(searchString)
            .map(word => word.split('').map(c => c.codePointAt(0)).join(''))
            .map(hash => `[data-search-keys^="${hash}"], [data-search-keys*=" ${hash}"]`)
    }, [searchString, options.panelMode]);

    if (!selectors.length) {
        return '';
    }

    return `.ipsIconPicker__container [data-role="iconpicker_item"]:not(${selectors.join(', ')}) {display: none !important;}`;
}