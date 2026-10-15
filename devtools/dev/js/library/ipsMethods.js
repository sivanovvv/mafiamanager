"use strict";

function eventSuppressor(e) {
    e.preventDefault();
    e.stopPropagation();
}

let uuid = 0;
const METHODS = {
    /**
     * Show the element
     */
    ipsHide() {
        this.setAttribute('hidden', 'true')
    },
    /**
     * Hide the element (analogous to display:none)
     */
    ipsShow() {
        this.removeAttribute('hidden')
        this.classList.remove('ipsHide');
        if (this.style.display === 'none') {
            this.style.display = ''
        }
    },

    /**
     * Remove the disabled filter and the disabled tooltip if there is one
     */
    ipsEnable() {
        this.style.filter = '';
        this.style.cursor = '';
        if (this.dataset.disabledOriginalStyles) {
            for (const [k, v] of Object.entries(JSON.parse(this.dataset.disabledOriginalStyles))) {
                if (v) {
                    this.style[k] = v;
                } else {
                    delete this.style[k];
                }
            }
        }
        delete this.dataset.disabledOriginalStyles;
        this.removeEventListener('click', eventSuppressor);
        this.removeEventListener('mousedown', eventSuppressor);
        this.removeEventListener('mouseup', eventSuppressor);
        this.removeEventListener('focus', eventSuppressor);


        if ('ipstooltip' in this.dataset && this.dataset.disableTitle && this.dataset.disableTitle === (this.getAttribute('title')||this.getAttribute('data-ipstooltip'))) {
            const originalTitle = this.dataset.originalTitle;
            delete this.dataset.disableTitle;
            if (!originalTitle) {
                this.removeAttribute('title');
                delete this.dataset.ipstooltip;
            } else {
                this.setAttribute('title', originalTitle);
            }
        }
    },
    /**
     * Disable the button
     *
     * @param {Object}      [options]       The options for the disable region
     * @param {string|null}  [options.message]  A message to display in a tooltip explaining why this element was disabled
     * @param   {number}     [options.opacity]          The opacity of the disable effect, should be a number between 0 and 1
     */
    ipsDisable(options = {}) {
        let {message, opacity} = options;
        if (!this.dataset.disabledOriginalStyles) {
            const originals = {
                filter: this.style.filter,
                cursor: this.style.cursor
            };
            this.dataset.disabledOriginalStyles = JSON.stringify(originals);
        }
        opacity = Number(opacity);
        opacity = (opacity > 0 && opacity < 1) ? opacity : 0.6;
        this.style.filter = `grayscale(1) opacity(${opacity * 100}%)`;
        this.style.cursor = (message ? 'default' : 'not-allowed');
        this.addEventListener('click', eventSuppressor);
        this.addEventListener('mousedown', eventSuppressor);
        this.addEventListener('mouseup', eventSuppressor);
        this.addEventListener('focus', eventSuppressor);
        if (typeof message === 'string') {
            const originalMessage = ('ipstooltip' in this.dataset) ? (this.getAttribute('data-ipstooltip') || this.getAttribute('title') || this.getAttribute('aria-label')) : false;
            if (originalMessage) {
                this.dataset.originalTitle = originalMessage;
            }
            delete this.dataset.ipstooltip;
            this.setAttribute('title', message);
            this.dataset.disableTitle = message;
            this.setAttribute('data-ipstooltip', '')
        }
    }
};

for (const [name, func] of Object.entries(METHODS)) {
    Element.prototype[name] = function(...args) {
        func.bind(this)(...args);
        return this;
    }

    NodeList.prototype[name] = function(...args) {
        this.forEach(e => {
            if (e instanceof Element) {
                e[name](...args)
            }
        })
        return this;
    }
}

/**
 *
 * Wrapper for ips.getString() as a template tag (e.g. ilang`close` <=> 'Close')
 *
 * @param {string}      str         The lang key. This differs from ips.getString in that, if the lang key is undefined, it will return the raw lang key instead of an empty string
 * @param {*[]}         values      The rest of the values (e.g. every value<i> from `${value1}${value2}${value3}...${value<n>}`)
 *
 * @return {string}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
 */
const ilang = (str, ...values) => {
    const raw = String.raw({raw:str}, ...values)
    return ips.getString(raw) || raw
}