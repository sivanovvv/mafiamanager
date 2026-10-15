import {useState} from "react";

/**
 *
 * @param {IconType[]|null}                             selectedIcons
 * @param {IconPickerOptions}                           options
 * @param {function(IconType[]|null) | undefined}       onSubmit
 * @param {function | undefined}                        onClose
 * @param {function}                                    close
 * @return {{submit(icons?:(IconType[]|null)): void, close(): void}}
 */
export default function useSubmitClose({selectedIcons, options, onSubmit, onClose, close}) {
    const [defaultIcons] = useState(selectedIcons);
    return {
        close() {
            try {
                onClose?.(defaultIcons.length ? defaultIcons : null);
            } catch (e) {
                window.Debug.error(e);
            }
            close();
        },
        submit(icons) {
            if (icons !== undefined) {
                selectedIcons = icons;
            }
            if (!selectedIcons?.length || !Array.isArray(selectedIcons)) {
                selectedIcons = null;
            }

            if (selectedIcons instanceof Array && typeof options.maxIcons === 'number') {
                selectedIcons = selectedIcons.slice(0, options.maxIcons);
            }

            try {
                onSubmit?.(selectedIcons);
            } catch (e) {
                window.Debug.error(e);
            }
            close();
        }
    }
}