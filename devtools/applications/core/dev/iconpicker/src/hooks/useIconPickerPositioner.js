import {useEffect, useMemo, useRef} from "react";
import {throttle} from "lodash";

/**
 *
 * @param options
 * @param {React.MutableRefObject<HTMLElement>}ref
 */
export function useIconPickerPositioner({options, ref}) {
    // we store this inside a ref so we only need one resize observer instance
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const modeRef = useRef(/**@type{"dialog"|"panel"|"anchored"}*/'dialog');
    useMemo(() => {
        let mode = "dialog";
        if (options.panelMode) {
            mode = 'panel'
        } else if (options.anchor) {
            mode = 'anchored'
        }
        modeRef.current = mode;
    }, [options.panelMode, options.anchor]);

    const position = useRef(() => {
        if (modeRef.current === 'dialog' || (optionsRef.current.container instanceof Element) || !(ref.current instanceof Element)) {
            return;
        }

        if (!(optionsRef.current.anchor instanceof Element) || optionsRef.current.anchor.closest('body') !== document.body) {
            return;
        }

        const anchorBox = optionsRef.current.anchor.getBoundingClientRect();
        const docBox = (ref.current.offsetParent || document.documentElement).getBoundingClientRect();
        const iconPickerBox = ref.current.getBoundingClientRect();

        // first set left/right
        const arrowSize = 7;
        let left = Math.min(
            window.innerWidth - iconPickerBox.width, // all the way on the right side of the screen
            (modeRef.current === 'panel' ? anchorBox.left - arrowSize : anchorBox.left) // on the right of the anchor
        );

        ref.current.style.left = `${Math.round(left - docBox.left)}px`;
        const arrowLongCenter = optionsRef.current.panelMode ? anchorBox.right : ((anchorBox.left + anchorBox.right) / 2);
        ref.current.style.setProperty('--i-arrow-left', `${arrowLongCenter - left}`);

        // now top/bottom
        if (anchorBox.bottom + iconPickerBox.height + (modeRef.current === 'panel' ? arrowSize : 0) <= window.innerHeight) {
            // case when below
            ref.current.style.top = `${Math.round((anchorBox.bottom + arrowSize - docBox.top)*10) / 10}px`;
            if (modeRef.current === 'panel') {
                const el = ref.current.querySelector(`:scope > .ipsIconPicker`);
                el.style.setProperty('--i-arrow-border-bottom', '1')
                el.style.setProperty('--i-arrow-border-top', '0')
                el.style.setProperty('--i-arrow-top', `${-(2 * arrowSize)}`)
                ref.current.classList.remove('ipsIconPicker__dialog--popup');
            }
        } else {
            //case when above
            ref.current.style.top = `${Math.round((anchorBox.top - iconPickerBox.height - arrowSize - docBox.top) * 10) / 10}px`;
            if (modeRef.current === 'panel') {
                const el = ref.current.querySelector(`:scope > .ipsIconPicker`);
                el.style.setProperty('--i-arrow-border-top', '1')
                el.style.setProperty('--i-arrow-border-bottom', '0')
                el.style.setProperty('--i-arrow-top', `${iconPickerBox.height - 2}`)
                ref.current.classList.add('ipsIconPicker__dialog--popup');
            }
        }

        ref.current.classList.add('ipsIconPicker__dialog--positioned');
    });

    const ro = useRef(new ResizeObserver(throttle(() => position.current(), 100)));


    // Attach the resize observer if necessary
    const mode = modeRef.current;
    useEffect(() => {
        const observer = ro.current;
        const positionCb = () => position.current();
        if (mode !== 'dialog' && !(optionsRef.current.container instanceof Element)) {
            observer.observe(ref.current);
            if (optionsRef.current.anchor instanceof Element) {
                observer.observe(optionsRef.current.anchor)
            }
            document.addEventListener('scroll', positionCb);
        } else {
            observer.disconnect();
            for (const k of ['width','height','top','left']) {
                ref.current.style[k] = '';
            }
        }

        return () => {
            observer.disconnect();
            document.removeEventListener('scroll', positionCb);
        }
    }, [mode, ref]);

    // we do this in a separate effect because it should run each time
    useEffect(() => {
        position.current();
    })
}