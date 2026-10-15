/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.editorRestrictions.js - AdminCP > Settings > Posting > Sandboxed and Advanced Editor Modes
 *
 * Author: Matt Finger
 */
;( function($, _){
    "use strict";


    /**
     * @typedef {{[p:number|"removed"]: string[]}} RestrictionSettings
     */
    ips.controller.register('core.admin.core.editorRestrictions', {
        /**
         * @type {string[]}
         */
        _restrictions: [],
        _restrictionDefaults: {},

        initialize() {
            if (!this._getHeader() || !this._getTextarea()) {
                return;
            }

            this.hideRealElements();
            // many extensions are registered after this event
            document.dispatchEvent(new CustomEvent('ips:editorBeforeInit', {
                detail: {
                    textarea: null,
                    elem: null,
                    content: "",
                    options: {}
                },
                bubbles: true,
            }));
            ips.ui.editorv5
                .getExtensionRestrictions(true)
                .then(
                    restrictions => this.addFormElements(restrictions)
                );

            this.elem.addEventListener('input', e => this.updateTextarea(e));
        },

        /**
         * Hide the real elements
         *
         * @returns {void}
         */
        hideRealElements() {
            this._getHeader()?.setAttribute('hidden', '');
            this._getTextarea()?.closest('.ipsFieldRow')?.setAttribute('hidden', '');
        },

        /**
         * Get the header
         * @return {HTMLElement|null}
         * @private
         */
        _getHeader() {
            return this.elem.querySelector( "#form_header_editor_extensions" );
        },

        /**
         * Get the textarea
         * @return {HTMLTextAreaElement|null}
         * @private
         */
        _getTextarea() {
            return this.elem.querySelector("textarea#el_editor_extension_restrictions_input, #el_editor_extension_restrictions_input textarea");
        },

        /**
         * Fill the form elements by loading select elements from the back end
         *
         * @param   {([string, int])[]} restrictions
         *
         * @return {Promise<void>}
         */
        async addFormElements(restrictions) {
            this._restrictions = restrictions.map(r => r[0]);
            this._restrictionDefaults = Object.fromEntries(restrictions);
            if (!restrictions.length) {
                return;
            }

            try {
                const content = await ips.fetch("/admin/?app=core&module=settings&controller=posting&do=getRestrictionInput", {
                    data: {
                        restrictionKey: this._restrictions.join(','),
                        restrictionDefault: JSON.stringify(Object.fromEntries(restrictions)),
                        restrictionLang: JSON.stringify(this._restrictions.map(restriction => ips.getString(restriction))),
                        restrictionDesc: JSON.stringify(this._restrictions.map(restriction => ips.haveString(restriction + ':description') ? ips.getString(restriction + ":description") : ""))
                    }
                });

                if (!content?.content || typeof content.content !== 'string') {
                    throw new TypeError(`content.content is not a string or is an empty string, so it cannot be added to the form`);
                }

                this._getHeader().removeAttribute('hidden');
                const clean = (new DOMParser()).parseFromString(content.content, 'text/html').body;
                let lastNode = this._getHeader();
                clean.querySelectorAll(':scope > *').forEach(node => {
                    lastNode.after(node);
                    lastNode = node;
                })
            } catch (e) {
                Debug.error(e);
            }
        },

        /**
         * Update the textarea based on an input event for an editor input
         *
         * @param {InputEvent}    e
         */
        updateTextarea(e) {
            const name = e.target.getAttribute('name');
            if (!name?.match(/^ipsCustom(?:Node|Mark|Extension)__/)) {
                return
            }

            /**
             * @type {RestrictionSettings}
             */
            const restrictionSetting = JSON.parse(this._getTextarea().innerText || '{}');
            restrictionSetting.removed = restrictionSetting.removed || []
            let value = parseInt(e.target.value);

            if ([-1,0,1,2].includes(this._restrictionDefaults[name]) && this._restrictionDefaults[name] === value) {
                // if this is just the default value, we can remove it from the list
                restrictionSetting.removed.push(name);
                value = Number.NaN;

            } else if ([0,1,2,-1].includes(value) && !(value.toString() in restrictionSetting)) {
                // there's a chance no other restrictions have this value, in which case we need to add it
                restrictionSetting[value.toString()] = [name];
            }

            for (const level in restrictionSetting) {
                if (level === 'removed') {
                    continue;
                }
                if (parseInt(level) === value && !Number.isNaN(value)) {
                    if (!restrictionSetting[level].includes(name)) {
                        restrictionSetting[level].push(name)
                    }
                } else if (restrictionSetting[level].includes(name)) {
                    restrictionSetting[level] = restrictionSetting[level].filter(restriction => restriction !== name);
                }

                // let's also filter to make sure they correspond to real settings. It's worth cleaning this up here to avoid a 10kb restriction array years down the road
                restrictionSetting[level] = restrictionSetting[level].filter(restriction => {
                    if (restriction.match(/^ipsCustom(Node|Mark|Extension)__/) && !this._restrictions.includes(restriction)) {
                        if (!restrictionSetting.removed.includes(restriction)) {
                            restrictionSetting.removed.push(restriction)
                        }
                        return false;
                    }
                    return true;
                })
            }

            this._getTextarea().innerText = JSON.stringify(restrictionSetting);
            this._getTextarea().setAttribute('value', this._getTextarea().innerText);
        }
    });
}(jQuery));