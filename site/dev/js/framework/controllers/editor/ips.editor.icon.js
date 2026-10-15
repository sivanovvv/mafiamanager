/**
 * IPS Social Suite 5
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.editor.icon.js - Controller for the icon picker form element
 *
 * @todo this should be moved to where the rest of the form input controllers are, rather than in the editor module.
 *
 * Author: Matt Finger
 */
;(function($,_) {
    "use strict";

    ips.controller.register('core.global.editor.icon', {
        /**
         * @type {Element}
         */
        elem: undefined,

        /**
         * @type {null|string[]}
         */
        _allowedTypes: null,

        /**
         * @type {null|Object[]}
         */
        _currentValue: undefined,

        /**
         * @type {null|Number}
         */
        _maxIcons: undefined,

        /**
         * Setup the element
         */
        initialize() {
            // This loads fontawesome when the page loads rather than when the button is clicked
            ips.utils.iconpicker.faIconsEnabled();

            this.elem.querySelector('button[data-role="launcher"]').onclick = async () => {
                this.setCurrentValue(await ips.utils.iconpicker.pick({defaultValue: this.getCurrentValue(), allowedTypes: this.getAllowedTypes(), maxIcons: this.getMaxIcons(), svgIcons: 'svgIcons' in this.elem.dataset}))
            }

            this.setCurrentValue(this.getCurrentValue())

            this.elem.querySelectorAll('[data-role="clear"]').forEach(element => {
                if (!(Array.isArray(this._currentValue) && this._currentValue.length)) {
                    element.ipsHide()
                }
                element.onclick = () => {
                    this.setCurrentValue(null)
                }
            });

            this.fillIcons();
        },

        /**
         * @return {HTMLInputElement}
         */
        getInputEl() {
            return this.elem.querySelector('input[data-ips-icon-picker-input]')
        },

        /**
         * Get the current value
         * @returns {null|Object[]}
         */
        getCurrentValue() {
            if (this._currentValue === undefined) {
                this._currentValue = JSON.parse(this.getInputEl().value);
            }

            return this._currentValue;
        },

        /**
         *
         * @return {string[]}
         */
        getAllowedTypes() {
            if (!Array.isArray(this._allowedTypes)) {
                this._allowedTypes = this.elem.dataset.allowedIconTypes?.split(",").map(i => i.trim().toLowerCase()) || [];
            }
            return this._allowedTypes
        },

        /**
         * Get the max icons allowed
         *
         * @return {Number|null}
         */
        getMaxIcons() {
            if (this._maxIcons === undefined) {
                this._maxIcons = parseInt(this.elem.dataset.maxIcons || '');
                if (!(Number.isInteger(this._maxIcons) && this._maxIcons > 0)) {
                    this._maxIcons = null;
                }
            }
            return this._maxIcons;
        },


        /**
         * Set the current value for the input (and this controller)
         *
         * @param {IconType[] | null}    value
         */
        setCurrentValue(value) {
            try {
                if (value === null || (Array.isArray(value) && !value.length)) {
                    this.elem.querySelectorAll('[data-role="clear"]').ipsHide()
                    this._currentValue = null;
                } else if (Array.isArray(value)) {
                    this.elem.querySelectorAll('[data-role="clear"]').ipsShow()
                    // we iterate to make sure the values are acceptable
                    for (const item of value) {
                        if (typeof item !== 'object') {
                            throw new Error();
                        }
                        if (!this.getAllowedTypes().includes(item.type)) {
                            throw new Error()
                        }

                        // some additional validation for fa icons
                        if (typeof item.raw !== 'string' || typeof item.title !== 'string') {
                            throw new Error()
                        }
                    }
                    this._currentValue = value;
                } else {
                    throw new Error();
                }
            } catch (e) {
                e.message += '\n\t(An error occurred while setting the input value.)'
                Debug.error(e);
                return;
            }

            this.getInputEl().setAttribute('value', JSON.stringify(value));
            this.fillIcons();
        },

        fillIcons() {
            const fillArea = this.elem.querySelector('[data-role="selectedicons"]');
            if (!(Array.isArray(this._currentValue) && this._currentValue.length)) {
                fillArea.ipsHide();
            } else {
                fillArea.innerHTML = "";
                fillArea.ipsShow();

                for (const iconData of this._currentValue) {
                    fillArea.innerHTML += ips.templates.render('core.iconpicker.selectedicon', iconData)
                }
            }
        }
    })

}(jQuery))