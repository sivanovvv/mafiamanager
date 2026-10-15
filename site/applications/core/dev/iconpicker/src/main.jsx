import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IconPicker from "./components/IconPicker.jsx";
const roots = new Map();

setTimeout(() => window.ips.createModule('ips.ui.iconpicker', () => {
    setTimeout(() => document.dispatchEvent(new CustomEvent('ips:iconpickerUILoaded')));
    let key = 0;
    return {
        /**
         *
         * @param root
         * @param searchEmojis
         * @param searchFaIcons
         * @param {function(IconType[]|null)}   setSelectedIcons
         * @param skinToneOptions
         * @param hairStyleOptions
         * @param {function(IconPickerRenderHookOptions):void}      [onRender]
         * @param {function(IconType[]|null)|undefined}             [onSubmit]
         * @param {function()|undefined}                            [onClose]
         * @param {function|undefined}                              [afterHide]
         * @param options
         * @return {{close(): void}}
         */
        getIconPickerUI(root, {searchEmojis, searchFaIcons, setSelectedIcons, skinToneOptions, hairStyleOptions, onRender, onSubmit, onClose, afterHide, ...options}={}) {
            if (root === document.body) {
                root = document.querySelector("iconpicker-root-element");
                if (!root || root.parentElement !== document.body) {
                    root = document.createElement('iconpicker-root-element');
                }
                document.body.appendChild(root);
            }

            const reactRoot = roots.get(root) || createRoot(root);
            roots.set(root, reactRoot);
            let closed = false;
            const close = () => {
                if (!closed) {
                    closed = true;
                    roots.delete(root);
                    reactRoot.unmount();
                    try {
                        afterHide?.();
                    } catch (e) {
                        window.Debug.warn("Failed to call an afterHide hook on an iconpicker dialog");
                        window.Debug.warn(e);
                    }
                }
            }

            reactRoot.render(
                <StrictMode>
                    <IconPicker
                        key={key++ /* The key is necessary to ensure we render a NEW React root. Otherwise, all react DOM states, such as the search string, tabs, and skin tone will have whatever value the last iconpicker in this root had */}
                        options={options}
                        searchEmojis={searchEmojis}
                        searchFaIcons={searchFaIcons}
                        selectedIcons={options.defaultValue instanceof Array ? options.defaultValue : []}
                        setSelectedIcons={setSelectedIcons}
                        close={close}
                        skinToneOptions={skinToneOptions}
                        hairStyleOptions={hairStyleOptions}
                        onSubmit={onSubmit}
                        onClose={onClose}
                        onRender={onRender}
                    />
                </StrictMode>
            );

            return { close };
        }
    }
}))