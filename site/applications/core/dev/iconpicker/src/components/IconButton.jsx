import {useContext, useEffect, useMemo, useRef} from "react";
import IconAreaContext from "../contexts/IconAreaContext.js";
import IconPickerContext from "../contexts/IconPickerContext.js";
import extractSearchWordsFromTerm from "../helpers/extractSearchWordsFromTerm.js";

/**
 * Button to select an icon
 *
 * @param   {IconType} icon
 * @return {JSX.Element}
 * @constructor
 */
export default function IconButton({icon}) {
    const {selectedIcons, options, setSelectedIcons} = useContext(IconPickerContext);
    const {activeIcon} = useContext(IconAreaContext);
    /**
     * @type {React.RefObject<HTMLElement>}
     */
    const ref = useRef(null);
    const {raw, image,key} = icon;

    const searchKeys = useMemo(
        () => extractSearchWordsFromTerm(icon.title)
            .map(component => component.split('').map(c => c.codePointAt(0)).join(''))
            .join(' '),
        [icon.title]
    );
    const isSelected = selectedIcons.some(selectedIcon => selectedIcon.key === key);
    const {type} = icon;
    let content;
    let usingRaw = false;
    if (image) {
        content = <span className={"ipsEmoji"}><img src={image} alt={image.title} /></span>
    } else {
        if (type !== 'fa') {
            content = raw;
            usingRaw = true;
        } else {
            const faSuite = {
                far: 'regular',
                fas: 'solid',
                fab: 'brands'
            }[icon.key.split(':')[1]] || 'solid';

            content = <i className={`fa-${faSuite} fa-${icon.key.split(":")[0]}`}/>
        }
    }

    useEffect(() => {
        if (!options.panelMode || activeIcon !== key) {
            return
        }

        const refBox = ref.current?.getBoundingClientRect();
        const scroller = ref.current.closest('.ipsIconPicker__container [data-role="icons"]')
        const scrollBox = scroller?.getBoundingClientRect();
        if (scrollBox && refBox && (refBox.top < scrollBox.top || refBox.bottom > scrollBox.bottom)) {
            const distance = refBox.top - scrollBox.top;
            scroller.scrollBy({top: distance, behavior: 'smooth'});
        }
    }, [activeIcon, options.panelMode, key]);

    const title = (!icon.key.startsWith('custom-') && options.shortCodeFixer) ? options.shortCodeFixer(icon.title) : icon.title
    return (
        <button
            ref={ref}
            type={"button"}
            data-role={"iconpicker_item"}
            title={title}
            data-title-raw={icon.title}
            data-search-keys={searchKeys}
            className={`ipsIconPicker__option ${isSelected || activeIcon === icon.key ? "ipsIconPicker__option--active" : ""}`}
            data-icon-type={icon.type}
            data-icon-key={icon.key}
            data-icon-title={options.panelMode ? `:${title}:` : title}
            data-icon-selected={isSelected ? "" : undefined}
            data-icon-hair-style={icon.hairStyle || undefined}
            data-icon-skin-tone={icon.skinTone || undefined}
            onClick={(e) => {
                e.stopPropagation();
                if (isSelected) {
                    setSelectedIcons([...(selectedIcons||[])].filter(selectedIcon => selectedIcon.key !== icon.key));
                } else if (options.maxIcons === 1) { // if there's just one icon allowed, swap the selection with this one
                    setSelectedIcons([icon]);
                } else {
                    setSelectedIcons([...(selectedIcons||[]), icon]);
                }
            }}
            disabled={typeof options.maxIcons === 'number' && options.maxIcons > 1 && options.maxIcons <= selectedIcons.length && !isSelected}
            dangerouslySetInnerHTML={{__html: usingRaw ? content : undefined}}
        >
            {usingRaw ? undefined : content}
        </button>
    )
}

function RawContent({content}) {
    return (
        <div className={"ipsIconPicker__content"} dangerouslySetInnerHTML={{ __html: content }} />
    )
}

function IconContent({content}) {
    return (
        <div className={'ipsIconPicker__content'}>
            {content}
        </div>
    )
}