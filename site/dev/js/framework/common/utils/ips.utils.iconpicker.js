/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.iconpicker.js - A module for picking icons
 *
 * Author: Matt Finger
 */
;(function($, _){
    "use strict";

    const UI_CALLBACKS = {
        resolvers: new Set(),
        rejects: new Set(),
        timeout: null,
    };

    let UI_STATE = 'unloaded';
    let UI_ERR;

    document.addEventListener("ips:iconpickerUILoaded", () => {
        UI_STATE = "loaded";
        clearTimeout(UI_CALLBACKS.timeout);
        for (const cb of UI_CALLBACKS.resolvers) {
            cb();
        }
        UI_CALLBACKS.resolvers.clear();
        UI_CALLBACKS.rejects.clear();
    })
    function loadIconPickerUI() {
        return new Promise((resolve, reject) => {
            if (UI_STATE === 'loaded' || ips.ui.iconpicker) {
                UI_STATE = 'loaded';
                resolve();
                return;
            } else if (UI_STATE === 'error') {
                UI_ERR ? reject(UI_ERR) : reject();
                return;
            }

            UI_CALLBACKS.resolvers.add(resolve);
            UI_CALLBACKS.rejects.add(reject);
            if (UI_STATE === 'unloaded') {
                UI_STATE = 'loading';

                UI_CALLBACKS.timeout = setTimeout(() => {
                    UI_STATE = 'error';
                    UI_CALLBACKS.resolvers.clear();
                    for (const cb of UI_CALLBACKS.rejects) {
                        cb()
                    }
                    UI_CALLBACKS.rejects.clear();
                }, 30000);

                ips.fetch(ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/iconpicker/manifest.json')
                    .then(response => {
                        if (typeof response !== 'object') {
                            throw new TypeError(`The response from ${ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/iconpicker/manifest.json'} was not an object`);
                        }

                        for (const key in response) {
                            const entry = response[key];
                            if (entry.isEntry) {
                                const src = ips.getSetting('baseURL').replace(/\/+$/, "") + "/applications/core/interface/static/iconpicker/" + entry.file.replace(/^\/+/, '');
                                if (entry.css) {
                                    const el = document.createElement('link');
                                    el.setAttribute('rel', 'stylesheet');
                                    el.href = src;
                                    document.head.appendChild(el);
                                } else {
                                    const el = document.createElement('script');
                                    el.setAttribute('type', 'module');
                                    el.src = src;
                                    document.body.appendChild(el);
                                }
                            }
                        }
                    })
                    .catch(err => {
                        clearTimeout(UI_CALLBACKS.timeout);
                        UI_STATE = 'error';
                        UI_ERR = err;
                        for (const cb of UI_CALLBACKS.rejects) {
                            cb(err);
                        }
                        UI_CALLBACKS.rejects.clear();
                        UI_CALLBACKS.resolvers.clear();
                    })
            }
        })
    }

    /**
     * @typedef IconType
     * @property {AllowedIconType}     type        The type of icon
     * @property {string}           title       The icon title
     * @property {string}           raw         The raw data type
     * @property {string}           key         A unique key to identify the icon within its type (e.g. an emoji with the key 'smiling_face' is distinct from a fa icon with the key 'smiling_face')
     * @property {string}           [hairStyle]
     * @property {string}           [skinTone]
     * @property {boolean}          [selected]  Only used internally. Whether or not this icon is selected
     * @property {string}           [image]     The source of an image for the icon; if this is set it indicates the icon is a custom emoticon
     *
     * @typedef {"fa"|"emoji"} AllowedIconType
     *
     * @typedef IconPickerOptions
     * @property {null|IconType[]}      [defaultValue]      The default value of the picker
     * @property {AllowedIconType[]}    [allowedTypes]      The allowed types that we can choose from
     * @property {Number|null}          [maxIcons=1]        The max number of icons that this function can accept
     * @property {Number|null}          [minIcons=1]        The minimum number of icons that can be submitted
     * @property  {Element|null}        [rootElement]       Pass this to make the selector hover beneath a root item (like the ips menus)
     * @property {boolean}              [svgIcons]          Whether or not to use the raw svg icons
     * @property {boolean|undefined}    [nativeEmojis=true] Native emojis are allowed
     * @property {boolean|undefined}    [customEmojis=false] Custom emojis are allowed
     */
    ips.createModule("ips.utils.iconpicker", function() {
        const fileToLoad = '/applications/core/interface/static/fontawesome/js/fontawesome.js';
        let faLoaded = 'unloaded';
        let faAvailable = false;
        let faLoadAttempts  = 0;

        /**
         *
         * @return {Promise<boolean>}
         */
        function resolveWhenLoaded() {
            return new Promise(resolve => {
                if (ips.utils.fontawesome?.searchIcons instanceof Function) {
                    resolve(true);
                }
                else if (++faLoadAttempts > 200) {
                    resolve(false)
                } else {
                    setTimeout(() => {
                        resolveWhenLoaded().then(resolve);
                    }, 100)
                }
            })
        }

        /**
         *
         * @return {Promise<unknown>}
         */
        function loadFa6() {
            return new Promise(resolve => {
                if (faLoaded === 'loaded' || ips.utils.fontawesome?.searchIcons instanceof Function) {
                    faLoaded = 'loaded';
                    resolve(true)
                } else {
                    if (faLoaded !== 'loading') {
                        faLoaded = 'loading';
                        const script = document.createElement('script');
                        script.type = "module";
                        script.src = ips.getSetting('baseURL').replace(/\/+$/, '') + fileToLoad;
                        document.body.appendChild(script);
                    }

                    resolveWhenLoaded().then(_loaded => {
                        if (_loaded) {
                            faLoaded = true;
                            faAvailable = true;
                            resolve(true)
                        } else {
                            faLoaded = true;
                            faAvailable = false;
                            resolve(true)
                        }
                    })
                }
            })
        }


        /**
         * See if fa is faIconsEnabled
         *
         * @return {Promise<boolean>}
         */
        async function faIconsEnabled() {
            return !!((await loadFa6()) || faAvailable)
        }

        function getValuesFromOptions(options) {
            const {
                defaultValue=null,
                defaultTab='fa',
                anchor,
                allowedTypes=['emoji', 'fa'],
                maxIcons=null,
                minIcons=null,
                rootElement=null,
                svgIcons=false,
                panelMode,
                submitOnClick=false,
                afterOpen,
                afterHide,
                shortCodeFixer,
                container,
                nativeEmoji=true,
                customEmoji
            } = options

            return {defaultValue, defaultTab, allowedTypes, maxIcons, rootElement, svgIcons, anchor, panelMode, submitOnClick, afterOpen, afterHide, shortCodeFixer, container, customEmoji, nativeEmoji};
        }

        /**
         * @type {IconPicker}
         */
        let iconPicker;

        let lastOpened;

        return {
            /**
             *
             * @param {IconPickerOptions}   options
             *
             * @return {Promise<Object[]>}
             */
            pick(options={}) {
                options = getValuesFromOptions(options)
                return new Promise(_resolve => {
                    if (lastOpened && Date.now() - 100 < lastOpened) {
                        return;
                    }
                    lastOpened = Date.now();

                    if (iconPicker instanceof IconPicker) {
                        iconPicker.remove();
                    }

                    /**
                     *
                     * @param {IconType[]|null} icons
                     */
                    const resolve = icons => {
                        _resolve((Array.isArray(icons) && icons.length) ? icons.map(icon => ({
                            key: icon.key,
                            hairStyle: icon.hairStyle,
                            type: icon.type,
                            raw: icon.raw,
                            title: icon.title,
                            image: icon.image,
                        })) : null)
                    }

                    iconPicker = new IconPicker(options);
                    iconPicker.show(resolve, resolve);
                })
            },
            /**
             *
             * @param {IconPickerOptions}   options
             *
             * @return {IconPicker}
             */
            create(options) {
                options = getValuesFromOptions(options)
                return new IconPicker(options)
            },
            faIconsEnabled,
            loadFa6,
            compileEmojiSearchIndex(custom=false) {
                EmojiSearchTree.instance(custom);
            },
            async hasCustomEmoji() {
                const store = await EmojiSearchTree.loadCustomEmojiStore()
                return !!Object.keys(store).length;
            },
            whenLoaded: resolveWhenLoaded,
            getEmojiSearchTree() {
                return EmojiSearchTree
            },
        }
    });

    /**
     * Class used to pick icons; it can either open or close
     */
    class IconPicker {

        /**
         * @type {undefined|string}
         * @private
         */
        _queuedSearch = undefined;
        /**
         * @type {HTMLElement|undefined}
         */
        container = undefined;

        _visible= false;

        /**
         * @type {HTMLFormElement}
         * @private
         */
        _base;
        /**
         * @type {null|IconType[]}
         */
        defaultValue= null;

        /**
         * @type {'fa'|'emoji'}
         */
        defaultTab = 'fa';

        /** @type {string|undefined} */
        defaultSearch = undefined;

        /** @type {boolean} */
        submitOnClick = false;

        /** @type {boolean} */
        panelMode = false;

        _searchString='';
        /**
         *
         * @type {AllowedIconType[]}
         * @private
         */
        allowedTypes = ['fa', 'emoji'];

        /**
         * @type {null|Number}  The skin tone used for the selector
         * @private
         */
        get _emojiSkinTone() {
            return Number(ips.utils.db.get('emoji', 'skinTone')) || null;
        }

        get _emojiHairStyle() {
            return Number(ips.utils.db.get('emoji', 'hairStyle')) || null;
        }

        /**
         * Whether to use SVG icons instead of <i class=""></i>
         * @type {boolean}
         */
        svgIcons = false;

        /**
         * @type {null|Element}
         */
        anchor = null;

        _resultsCount = 0


        /**
         *
         * @type {{emoji: Object.<string, IconType>, fa: Object.<string, IconType>}}
         * @private
         */
        _selected = {emoji: {}, fa: {}}

        /**
         * @type {Element|null}
         * @private
         */
        rootElement;

        /**
         * @type {function(IconType[]|null)|null|undefined}
         * @private
         */
        _onClose;

        /**
         * @type {function(IconType[]|null)|null|undefined}
         * @private
         */
        _onSubmit;

        /**
         * Called after this is opened
         * @type {undefined|Function}
         */
        afterOpen = undefined;

        /**
         * Called after this is closed
         * @type {undefined|Function}
         */
        afterHide = undefined;

        _customEmoji = undefined;
        /**
         * Whether custom emoji are allowed
         * @returns {boolean}
         */
        get customEmoji() {
            if (this._customEmoji === undefined) {
                const allowed = this.allowedTypes.includes('emoji') && (this.panelMode || this.anchor || this.container);
                if (this._options) { // if this has already been setup, save the value
                    this._customEmoji = allowed;
                }
                return allowed;
            }

            return this._customEmoji;
        }

        /**
         *
         * @param allowed
         */
        set customEmoji(allowed) {
            this._customEmoji = !!allowed;
        }

        /**
         *
         * @param {IconPickerOptions} options
         */
        constructor(options) {
            Object.assign(this, options)
            if (options.defaultSearch) {
                this._searchString = options.defaultSearch;
            }
            this._options = options;
            if (this.allowedTypes.includes('emoji') && !this.customEmoji && this.nativeEmoji === false) {
                this.allowedTypes = this.allowedTypes.filter(type => type !== 'emoji');
                this._options.allowedTypes = this.allowedTypes;
            }

            if (!this.allowedTypes.length) {
                throw new RangeError(`Need either emoji or fa tab to use the icon picker`);
            }

            if (!this.allowedTypes.includes('emoji') && this.defaultTab === 'emoji') {
                this.defaultTab = 'fa';
                this._options.defaultTab = 'fa';
            }

            this.selected = this.defaultValue
        }

        /**
         * Get selected icons
         *
         * @returns {IconType[]|null}
         */
        get selected() {
            const out = [];
            for (const [key, group] of Object.entries(this._selected)) {
                if (this.allowedTypes.includes(key)) {
                    for (const value of Object.values(group)) {
                        out.push(value);
                    }
                }
            }

            return out.length ? out : null;
        }

        /**
         *
         * @param {IconType[]|null}  items
         */
        set selected(items) {
            if (items !== null && !Array.isArray(items)) {
                Debug.error(new Error(`The items passed is not an array or null.`))
                return
            }
            this._selected.fa = {};
            this._selected.emoji = {};

            if (Array.isArray(items)) {
                for (const item of items) {
                    if (!this.allowedTypes.includes(item.type)) {
                        continue;
                    }

                    this._selected[item.type][item.key] = item;
                }
            }
        }

        /**
         * Show the picker
         *
         * @param {null|function(null|IconType[])} [onSubmit]  A callback, will be called when the selected icons are submitted
         * @param {null|function(null|IconType[])} [onClose]  A callback called when the selector is closed before an icon can be selected. It is passed the default value provided when creating the selector
         *
         * @return {void}
         */
        async show(onSubmit=null, onClose=null) {
            await loadIconPickerUI();
            this._onSubmit = onSubmit;
            this._onClose = onClose;
            if (!this.container) {
                // await EmojiSearchTree.loadEmojiStore() // todo not sure this is ever needed; the search tree loads this ad-hoc
                document.dispatchEvent(new CustomEvent('ipsIconPicker:show', {bubbles: true, detail: {instance: this}}))
                this._visible = true
            }
            await this.getElem()

            try {
                this.afterOpen?.(this)
            } catch (e) {
                e.message = e.message + 'An error occurred when running the after open hook of the icon picker'
                Debug.error(e)
            }
        }

        /**
         * @return {HTMLFormElement|null}
         */
        getElemSync() {
            return this._base instanceof Element ? this._base : null;
        }

        /**
         * Return the HTMLElement that is associated with this instance
         * @return {Promise<HTMLElement>}
         */
        getElem() {
            return this.getEmojiTypes()
                .then(emojiTypes => new Promise(resolve => {
                    if (this._base && this._base.closest('body') !== document.body) {
                        this._closeReactRoot?.();
                        delete this._base;
                    }
                    if (!this._base) {
                        const container = this.container || document.body;
                        let resolved = false;
                        const {close} = ips.ui.iconpicker.getIconPickerUI(container, {
                            ...this._options,
                            searchFaIcons: async (searchString) => {
                                if (typeof searchString !== "string") {
                                    searchString = "";
                                }
                                this._searchString = searchString;
                                return await this.searchFontAwesome();

                            },
                            searchEmojis: async (searchString) => {
                                if (typeof searchString !== "string") {
                                    searchString = "";
                                }
                                this._searchString = searchString;
                                return await this.searchEmojis();
                            },
                            setSelectedIcons: (icons) => {
                                this.selected = icons?.length ? icons : null
                            },
                            hairStyleOptions: emojiTypes.find(type => type.type === "hair").options,
                            skinToneOptions: emojiTypes.find(type => type.type === "skin").options,
                            onRender: ({elem, setSearchString, setOption, incrementHighlight, decrementHighlight}) => {
                                this._base = elem;
                                if (!resolved) {
                                    resolved = true;
                                    resolve(this._base);
                                    try {
                                        this.afterOpen?.(this)
                                    } catch (e) {
                                        Debug.warn(e);
                                    }
                                }
                                this.setSearchString = setSearchString;
                                this.setOption = setOption;
                                this.incrementHighlight = incrementHighlight;
                                this.decrementHighlight = decrementHighlight;
                                if (typeof this._queuedSearch === 'string') {
                                    setSearchString(this._queuedSearch);
                                    delete this._queuedSearch;
                                }
                            },
                            onSubmit: this._onSubmit,
                            onClose: this._onClose,
                            afterHide: () => {
                                // delete this._base;
                                //
                                // if (this.openListener instanceof Function) {
                                //     document.removeEventListener('ipsIconPicker:open', this.openListener)
                                // }

                                try {
                                    this.afterHide?.(this)
                                } catch (e) {
                                    Debug.warn(e)
                                }
                            },
                        });
                        this._closeReactRoot = close;
                    } else {
                        resolve(this._base);
                    }
                }));
        }

        /**
         *
         * @param {string}  query
         * @return {Promise<void>|void}
         */
        updateSearch(query) {
            if (typeof query !== 'string') {
                throw new TypeError(`The search query for the icon picker must be a string, got a ${typeof query}`);
            }
            if (this.setSearchString instanceof Function) {
                this.setSearchString(query);
            } else {
                this._queuedSearch = query;
            }
        }

        /**
         *
         * @return {Promise<Object.<string, IconType[]>>}
         */
        async searchEmojis() {
            let store = await EmojiSearchTree.search(this._searchString, this.customEmoji, this.panelMode ? 20 : null, !!this.panelMode, this.nativeEmoji !== false);
            const out = {};
            for (const category in store) {
                out[category] = [...Object.keys(store[category].emojis)].map(unicode => {
                    const emojiData = store[category].emojis[unicode]
                    let hairStyle = this._emojiHairStyle || '';
                    let skinTone = this._emojiSkinTone || '';

                    return {
                        raw: EmojiSearchTree.codePointsToString(emojiData.unicode, Number(skinTone) || null, Number(hairStyle) || null),
                        skinTone,
                        hairStyle,
                        image: emojiData.image?.image2x || emojiData.image?.image,
                        key: `${unicode}:${emojiData.skinTones ? skinTone : ''}:${emojiData.hairStyles ? hairStyle : ''}`,
                        title: emojiData.description,
                        type: 'emoji'
                    }
                })
            }

            return out
        }

        /**
         * Get the type options (skin tone and hair style) codes of emojis
         *
         * @return {Promise<{current: (Number|string), options: {label: *, value: *}[], type: string}[]>}
         */
        async getEmojiTypes() {
            await EmojiSearchTree.loadEmojiStore(this.panelMode || this.anchor || this.container);
            const stUnicode = EmojiSearchTree.emojiCodepointMap['270B'].unicode;
            const hsUnicode = EmojiSearchTree.emojiCodepointMap['1F9D1'].unicode;
            return [
                {
                    type: 'skin',
                    current: this._emojiSkinTone || '',
                    options: [['', ''], ...Object.entries(EmojiSearchTree.skinTones)].map(i => ({
                        value: i[0].toString(),
                        label: EmojiSearchTree.codePointsToString(
                            stUnicode,
                            i[0] ? `${Number(i[0]).toString(16)}` : null,
                            this._emojiHairStyle
                        ),
                        title: i[1]
                    }))
                },
                {
                    type: 'hair',
                    current: this._emojiHairStyle || '',
                    options: [['', ''], ...Object.entries(EmojiSearchTree.hairStyles)].map(i => ({
                        value: i[0].toString(),
                        label: EmojiSearchTree.codePointsToString(
                            hsUnicode,
                            this._emojiSkinTone,
                            i[0] ? `${Number(i[0]).toString(16)}` : null
                        ),
                        title: i[1]
                    }))
                }
            ];
        }

        /**
         *
         * @return {Promise<Object.<string, IconType[]>>}
         */
        async searchFontAwesome() {
            const icons = [];
            if (await ips.utils.iconpicker.faIconsEnabled()) {
                for (const [_, iconBase] of ips.utils.fontawesome.searchIcons(this._searchString, {limit: this._searchString ? 1500 : null})) {
                    for (const [iconSet, icon] of iconBase) {
                        icons.push({
                            ...icon,
                            raw: ips.utils.fontawesome.renderIcon({iconName: icon.iconName, prefix: iconSet, useSvg: !!this.svgIcons}).outerHTML,
                            title: iconBase.size > 1 ? `${icon.iconName} (${ips.getString('ipsFa__' + iconSet)})` : icon.iconName,
                            key: `${icon.iconName}:${iconSet}`,
                            selected: (`${icon.iconName}:${iconSet}` in this._selected.fa),
                            type: 'fa'
                        })
                    }
                }
            }
            return {'All icons': icons};
        }

        /**
         * Hide the picker
         */
        hide() {
            this._closeReactRoot?.();
        }

        /**
         * This is the method that destroys the instance!
         *
         * @return {void}
         */
        remove() {
            return this.hide();
        }
    }

    class EmojiSearchTree {
        constructor() {
            /** @type {Object.<string, EmojiSearchTree>} */
            this.children = {};

            /** @type {Set<string>} This set contains all the emoji unicode values at this position */
            this.results = new Set();
        }

        /**
         * Fix a key so that it is only alphanumeric for faster searching
         * @param {string} key
         * @return {string}
         */
        static fixKey(key) {
            return key.trim().toLowerCase().replaceAll(/[^\p{L}\p{N}\p{P}\p{S}_]/ugi, '')
        }

        /**
         * Add a term to the search tree
         * @param {string} key
         * @param {string} result
         */
        _addTerm(key, result) {
            key = EmojiSearchTree.fixKey(key)

            if (!key.length) {
                this.results.add(result);
                return;
            }
            if (!this.children[key[0]]) {
                this.children[key[0]] = new EmojiSearchTree();
            }
            this.children[key[0]]._addTerm(key.slice(1), result);
        }

        /**
         * Search the tree
         * @param {string}  key
         * @return {Set<string>}
         */
        _search(key) {
            key = EmojiSearchTree.fixKey(key)
            if (!key.length) {
                const results = new Set();
                for (const result of this.results) {
                    results.add(result);
                }

                for (const child of Object.values(this.children)) {
                    for (const result of child._search('')) {
                        results.add(result);
                    }
                }

                return results;
            } else if (key[0] in this.children) {
                return this.children[key[0]]._search(key.slice(1));
            }

            return new Set();
        }

        /** @type {EmojiSearchTree|undefined} */
        static _root = undefined;

        /**
         * Get the root instance to search emojis
         *
         * @param {boolean}     [custom=false]      Whether to get the instance containing custom ids
         * @param {boolean}     [includeNative=true]      Whether we want this instance to include native emojis
         *
         * @return {Promise<EmojiSearchTree>}
         */
        static async instance(custom=false, includeNative=true) {
            if (!custom && !includeNative) {
                throw new RangeError(`Need to use at least one of custom or native emojis for the emoji search`);
            }
            const key = (custom ? '_rootCustom' : '_root') + (includeNative ? '' : "-no-native")
            if (!this[key]) {
                // this has to be done first
                const store = includeNative ? {...(await this.loadEmojiStore(custom))} : {...(await this.loadCustomEmojiStore())};
                this[key] = new EmojiSearchTree();

                const termMap = {}
                for (const category in store) {
                    const {emojis} = store[category];
                    for (const code in emojis) {
                        emojis[code].indexCode = code;
                        emojis[code].shortcode = this.getShortCode(emojis[code].description);
                        termMap[emojis[code].description] = code;
                    }
                }

                for (const name of [...Object.keys(termMap)].sort()) {
                    const normalizedName = ips.utils.search.stripAccents(name);
                    const code = termMap[name];
                    const added = new Set();
                    // add the raw string for exact matching
                    added.add(normalizedName);

                    // add its shortcode for easy use
                    const shortCode = this.getShortCode(name);
                    if (shortCode) {
                        added.add(ips.utils.search.stripAccents(shortCode))
                    }

                    for (const pattern of [
                        /[^\p{L}\p{N}\p{S}\p{P}_]+/u,
                        /[^\p{L}\p{N}]+/u
                    ]) {
                        const components = normalizedName.trim().toLowerCase().split(pattern);
                        for (let i = 0; i < components.length; i++) {
                            if (!components[i]) {
                                continue;
                            }
                            added.add(components.slice(i).join(''));
                        }
                    }

                    added.forEach(term => {
                        this[key]._addTerm(term, code);
                        if (term.includes('smiling')) {
                            this[key]._addTerm(term.replace('smiling', 'smile'), code)
                        }
                    })
                }
            }

            return this[key];
        }

        static _shortCodeMap = {}
        static getShortCode(term) {
            if (!(term in this._shortCodeMap)) {
                this._shortCodeMap[term] = term
                    .toLowerCase()
                    .trim()
                    .replaceAll(/[^\p{L}\p{N}\s]+/gu, '')
                    .replaceAll(/\s+/g, '_')
                    .replaceAll(/_+/g, '_');
            }

            return this._shortCodeMap[term];
        }

        /**
         *
         * @param key
         * @param {boolean} [custom=false]
         * @param {number|null}     [limit=null]
         * @param {boolean}     [mergeCategories=false]
         * @param {boolean}     [includeNative=true]
         * @return {Promise<{"Search Results": { name: "Search Results", emojis: Object }}>}
         */
        static async search(key, custom=false, limit=null, mergeCategories=false, includeNative=true) {
            const instance = await this.instance(custom, includeNative);
            if (!key) {
                const categories = (!includeNative && custom) ? this.customEmojiStoreUnmerged : {...this.emojiStore, ...(custom ? this.customEmojiStoreMerged : {})}
                const out = {};
                for (const name in categories) {
                    out[name] = {
                        emojis: {},
                    }
                    for (const unicode in categories[name].emojis) {
                        out[name].emojis[unicode] = this.emojiCodepointMap[unicode] || this.customEmojiCodepointMap[unicode];
                    }
                }
                return out;
            }
            key = ips.utils.search.stripAccents(key);
            const results = instance._search(key);
            const ret = mergeCategories ? {
                "Search Results" : {
                    name: 'Search Results',
                    emojis: {}
                }
            } : {};

            let count = 0;
            for (const result of results) {
                if (limit !== null && count++ > limit) {
                    break;
                }
                const emojiData = this.emojiCodepointMap[result] || this.customEmojiCodepointMap[result];
                if (!mergeCategories) {
                    const category = this.emojiCategoryMap[result] || this.customEmojiCategoryMap[result];
                    ret[category] = ret[category] || {
                        name: category,
                        emojis: {}
                    }
                    ret[category].emojis[result] = emojiData;
                } else {
                    ret['Search Results'].emojis[result] = emojiData;
                }
            }

            if (!mergeCategories) {
                // one last sorting
                const sorted = {};
                for (const k in this.emojiStore) {
                    if (k in ret) {
                        sorted[k] = ret[k]
                    }
                }
                if (custom) {
                    for (const k in this.customEmojiStore) {
                        if (k in ret) {
                            delete sorted[k];
                            sorted[k] = ret;
                        }
                    }
                }
                return sorted;
            }

            return ret;
        }


        static emojiStore = undefined;
        static customEmojiStore = undefined;
        static customEmojiStoreMerged = undefined;
        static customEmojiStoreUnmerged = undefined;
        static emojiCodepointMap = {}; // this maps the code point to the emoji details. It is used for faster querying (query by codepoint)
        static customEmojiCodepointMap = {};
        static hairStyles = {};
        static skinTones = {};
        static emojiCategoryMap = {};
        static customEmojiCategoryMap = {};
        static emojiIndices = {};
        static customEmojiIndices = {};


        /**
         * Get the emoji store
         *
         * @param {boolean} [loadCustom=false]      Whether to load custom emojis
         *
         * @return {Promise<Object>}
         */
        static async loadEmojiStore(loadCustom=false) {
            if (this.emojiStore === undefined) {
                try {
                    this.emojiStore = await ips.fetch(ips.getSetting('baseURL') + '/applications/core/interface/static/emoji/emojiIndex.json');
                    for (const [key, {emojis}] of Object.entries(this.emojiStore)) {
                        let idx = 0;
                        for (const unicode in emojis) {
                            const codebase = Number('0x' + unicode.split(/\s+/)[0])
                            if (0x1f46b <= codebase && 0x1f46d >= codebase) {
                                delete this.emojiStore[key].emojis[unicode];
                                continue;
                            }
                            this.emojiCodepointMap[unicode] = emojis[unicode];
                            this.emojiCategoryMap[unicode] = key;
                            this.emojiIndices[unicode] = idx++;
                        }
                    }
                } catch (e) {
                    Debug.error(e)
                }

                try {
                    const skinTones = await ips.fetch(ips.getSetting('baseURL') + '/applications/core/interface/static/emoji/skinTones.json');
                    for (let code in skinTones) {
                        const numeric = this.hex2dec(code);
                        this.skinTones[numeric] = skinTones[code];
                    }
                } catch (e) {
                    Debug.error(e)
                }

                try {
                    const hairStyles = await ips.fetch(ips.getSetting('baseURL') + '/applications/core/interface/static/emoji/hairStyles.json')
                    for (let code in hairStyles) {
                        const numeric = this.hex2dec(code);
                        this.hairStyles[numeric] = hairStyles[code];
                    }
                } catch (e) {
                    Debug.error(e)
                }

            }

            if (loadCustom) {
                await this.loadCustomEmojiStore()
                if (this.customEmojiStoreMerged === undefined) {
                    this.customEmojiStoreMerged = {...this.emojiStore};

                    for (const k in this.customEmojiStore) {
                        let actualKey = k;
                        let i = 1;
                        while (actualKey in this.customEmojiStoreMerged) {
                            actualKey = k + ` ${i++}`
                        }

                        this.customEmojiStoreMerged[actualKey] = {name: actualKey, emojis: this.customEmojiStore[k]}
                    }
                }

                return this.customEmojiStoreMerged
            }

            return this.emojiStore;
        }

        static async loadCustomEmojiStore() {
            if (this.customEmojiStore === undefined || this.customEmojiStoreUnmerged === undefined) {
                try {
                    this.customEmojiStore = await ips.fetch(ips.getSetting('baseURL'), {data: {
                            app: 'core',
                            module: 'system',
                            controller: 'editor',
                            do: 'emoji'
                        }});

                    this.customEmojiStoreUnmerged = {};
                    for (const k in this.customEmojiStore) {
                        this.customEmojiStoreUnmerged[k] = {name: k, emojis: this.customEmojiStore[k]};
                        let idx = 0;
                        for (const [unicode, data] of Object.entries(this.customEmojiStore[k])) {
                            this.customEmojiCodepointMap[unicode] = data;
                            this.customEmojiCategoryMap[unicode] = k;
                            this.customEmojiIndices[unicode] = idx++;
                        }
                    }
                } catch (e) {
                    Debug.error(e)
                }
            }
            return this.customEmojiStoreUnmerged || {};
        }

        /**
         *
         * @return {number}
         */
        static zwj() {
            return this.hex2dec('200D');
        }

        /**
         *
         * @param hex
         * @return {number}
         */
        static hex2dec(hex) {
            return typeof hex === "string" ? Number('0x' + hex) : hex;
        }

        /** @type {Object.<string, string>}  This maps the codepoints & skintone/hairstyle to the rendered emoji string */
        static EMOJI_MAP = {}

        /**
         * Get a rendered emoji based on the code points and the skintone/hair style
         * @param {string|string[]}     codePoints      The codepoints
         * @param skinTone
         * @param hairStyle
         *
         * @return {string}
         */
        static codePointsToString(codePoints, skinTone=null, hairStyle=null) {
            if (!Array.isArray(codePoints)) {
                codePoints = codePoints.split(' ');
            }

            const key = JSON.stringify([codePoints, skinTone, hairStyle]);

            if (!(key in this.EMOJI_MAP)) {
                // If we have a skin color, this gets added to the first emoji component
                if (skinTone) {
                    skinTone = this.hex2dec(skinTone);
                    if (!(skinTone in EmojiSearchTree.skinTones)) {
                        Debug.warn(`A skin tone was given for an emoji that is not a valid supported skin tone`);
                    }
                }

                if (hairStyle) {
                    hairStyle = this.hex2dec(hairStyle);
                    if (!(hairStyle in EmojiSearchTree.hairStyles)) {
                        Debug.warn(`A hair style was given for an emoji that is not a valid supported hair style`);
                    }
                }

                this.EMOJI_MAP[key] = String.fromCodePoint(...codePoints
                    .map(codePoint => {
                        if (codePoint === '[[st]]') {
                            return skinTone
                        }
                        if (codePoint === '[[hs]]') {
                            return hairStyle ? [EmojiSearchTree.zwj(), hairStyle] : null
                        }
                        return this.hex2dec(codePoint)
                    })
                    .flat()
                    .filter(i => !!i)
                )
            }
            return this.EMOJI_MAP[key]
        }
    }
}(jQuery));