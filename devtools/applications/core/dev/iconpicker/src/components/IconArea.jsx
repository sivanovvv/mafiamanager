import IconAreaContext from "../contexts/IconAreaContext.js";
import {useContext, useEffect, useMemo, useRef, useState, useTransition} from "react";
import IconPickerContext from "../contexts/IconPickerContext.js";
import IconCategory from "./IconCategory.jsx";
import extractSearchWordsFromTerm from "../helpers/extractSearchWordsFromTerm.js";

const ALL_ICON_CACHE = {};

/**
 *
 * @param {"fa"|"emoji"}     [type="fa"]
 * @return {JSX.Element}
 * @constructor
 */
export default function IconArea({type="fa"}) {
    const {
        tab,
        searchString: _searchString,
        [type === 'fa' ? "searchFaIcons": "searchEmojis"] : search,
        options,
        activeIdx,
        ref,
        hairStyle,
        skinTone,
    } = useContext(IconPickerContext);

    const searchString = _searchString.toLowerCase().trim().replaceAll(/[^a-z0-9_-]/g, '');
    const [transitioning, startTransition] = useTransition();

    const key = type + ":" + (type === 'emoji' ? `${skinTone}:${hairStyle}:${options.nativeEmoji}:${options.customEmoji}` : "");
    const [icons, setIcons] = useState(/**@type {[string, IconType[]][]}*/[]);
    const [allIcons, setAllIcons] = useState(/**@type {null|[string,IconType[]][]} */ALL_ICON_CACHE[key] || null)
    const [loading, setLoading] = useState(() => !(!options.panelMode && allIcons?.length));
    const lastUpdated = useRef(0);
    const timeout = useRef(null);
    let fatalErrorShown = useRef(false)
    const lastSkinTone = useRef(skinTone);
    const lastHairStyle = useRef(hairStyle);

    useEffect(() => {
        if (!options.panelMode && (!allIcons || lastSkinTone.current !== skinTone || lastHairStyle.current !== hairStyle)) {
            if (ALL_ICON_CACHE[key]) {
                startTransition(() => {
                    setAllIcons(ALL_ICON_CACHE[key]);
                    setLoading(false);
                });
                return;
            }
            startTransition(() => {
                setAllIcons([]);

                if (!options.panelMode) {
                    setLoading(true);
                }
                lastSkinTone.current = skinTone;
                lastHairStyle.current = hairStyle;
                search("")
                    .then(icons => {
                        startTransition(() => {
                            setLoading(false);
                            ALL_ICON_CACHE[key] = [...Object.entries(icons)];
                            setAllIcons(ALL_ICON_CACHE[key])
                        })
                    })
                    .catch(e => {
                        ref.current?.close();
                        window.Debug.error(`An unexpected error occurred while getting the iconpicker icons`);
                        // we want to fail fast so we'll log the actual error debug or not. This shouldn't ever really fail in real use.
                        console.error(e);

                        // for this one, we can just exit
                        if (!fatalErrorShown.current) {
                            fatalErrorShown.current = true;
                            window.ips.ui.alert.show({
                                message: window.ips.getString(`iconpicker_error_fatal`),
                                type: 'alert'
                            })
                        }
                    })
                });
        }
    }, [allIcons, search, options.panelMode, hairStyle, ref, skinTone, key]);

    useEffect(() => {
        if (tab !== type || !options.panelMode) {
            return;
        }
        startTransition(() => {
            setLoading(true);
            clearTimeout(timeout.current);
            const doSearch = () => {
                clearTimeout(timeout.current);
                lastUpdated.current = Date.now();
                lastSkinTone.current = skinTone;
                lastHairStyle.current = hairStyle;
                search(searchString)
                    .then(icons => {
                        startTransition(() => {
                            setLoading(false);
                            setIcons(
                                [...Object.entries(icons)].filter(([_, icons]) => !!icons.length)
                            );
                        });
                    })
                    .catch(e => {
                        startTransition(() => {
                            setIcons([]);
                        })
                        window.Debug.error('An unexpected error occurred while searching icons');
                        console.error(e);
                    });
            }

            if (lastUpdated.current + 300 < Date.now()) {
                doSearch()
            } else {
                timeout.current = setTimeout(doSearch, 300);
            }
        });
    }, [type, searchString, search, tab, options.panelMode, hairStyle, skinTone]);

    const categoryCountsRef = useRef({});
    const css = useMemo(() => {
        if (options.panelMode) {
            return "";
        }
        if (searchString.length && allIcons?.length) {
            let toHide = [];
            const searchStrings = new Set(extractSearchWordsFromTerm(_searchString));

            const regex = new RegExp(`^(?:${[...searchStrings].map(str => RegExp.escape(str)).join('|')})`)
            for (const [category, icons] of allIcons) {
                const visibleIcons = icons.filter(icon => {
                    return extractSearchWordsFromTerm(icon.title)
                        .some(word => word.match(regex))
                });
                categoryCountsRef.current[category] = visibleIcons.length;
                if (visibleIcons.length) {
                    continue
                }
                toHide.push(`[data-icon-category="${category}"]`);
            }

            if (toHide.length) {
                return `[data-role="${type}area"] :is(${toHide.join(',')}) {display: none !important;}`;
            }
        } else if (typeof allIcons === 'object' && allIcons) {
            for (const [category, icons] of allIcons) {
                categoryCountsRef.current[category] = icons.length;
            }
        } else {
            for (const k in categoryCountsRef.current) {
                categoryCountsRef.current[k] = 0;
            }
        }
        return ''
    }, [type, _searchString, searchString, allIcons, options.panelMode]);

    const activeIcon = useMemo(() => {
        if (!options.panelMode || !icons?.length || !icons.some(([_,icons]) => !!icons.length)) {
            return undefined;
        }

        const totalItems = icons.reduce((prev,[_, cur]) => prev + cur.length, 0)
        let actualIdx = activeIdx;
        while (actualIdx < 0) {
            actualIdx += totalItems;
        }
        actualIdx = activeIdx % totalItems;
        let offset = 0;
        for (const [_,categoryIcons] of icons) {
            if (actualIdx < offset + categoryIcons.length) {
                return categoryIcons[actualIdx - offset].key;
            }
            offset += categoryIcons.length;
        }

        return icons[0][1][0].key
    }, [options.panelMode, icons, activeIdx]);

    const empty = options.panelMode ? icons.some(([_,icons]) => !!icons.length) : [...Object.values(categoryCountsRef.current)].some(count => !!count);

    return (
        <IconAreaContext.Provider value={{type, activeIcon}}>
            <article
                hidden={tab !== type}
                data-role={`${type}area`}
                className={`ipsIconPicker__container ${loading ? 'ipsLoading' : ''}`}
            >
                <style data-role={'category-filter'} >
                    {/*{css}*/}
                </style>
                {type === 'fa' ? <a href={'https://fontawesome.com/v6/search?o=r&m=free'} target={"_blank"} className={"ipsIconPicker__fa-attribution"} tabIndex={-1} >Icons By FontAwesome <i className={"fa-solid fa-arrow-up-right-from-square"}/></a> : <></>}
                <div
                    data-role={'icons'}
                    className={"ipsIconPicker__root-icon-area" + (empty ? "" : " ipsIconPicker__root-icon-area--empty")}
                >
                    {empty ? <></> : <p className={"ipsTitle--h4"}>{window.ips.getString('iconpicker_no_results')}</p>}
                    {(options.panelMode ? icons : allIcons)?.map(([category, categoryIcons]) => (
                        <IconCategory
                            key={category}
                            icons={categoryIcons}
                            name={category}
                            count={options.panelMode ? categoryIcons.length : categoryCountsRef.current[category] || 0}
                        />
                    ))}
                </div>
            </article>
        </IconAreaContext.Provider>
    )
}