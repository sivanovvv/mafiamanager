/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.editorv5.js - Editor widget
 *
 * Author: Matt Finger
 */
;( function($){
    "use strict";


    /**
     * @type {"unloaded"|"loaded"|"loading"}
     */
    let state = 'unloaded'

    /**
     * @type {"unloaded"|"loaded"|"loading"|"error"}
     */
    let pluginsState = 'unloaded'
    const pluginsCallbacks = new Set()
    const resolveCallbacks = new Set()

    const _thirdPartyExtensions = {};
    const _thirdPartyNodes = {};
    const _thirdPartyMarks = {};
    const pluginTimeouts = new Set();

    document.addEventListener('ips:editorPluginsReady', () => {
        pluginsState = 'loaded'
        pluginsCallbacks.forEach(cb => cb())
        pluginsCallbacks.clear()

        pluginTimeouts.forEach(clearTimeout)
        pluginTimeouts.clear()
    });

    document.addEventListener('ips:editorPluginsError', () => {
        pluginsState = 'error'
        pluginsCallbacks.forEach(cb => cb())
        pluginsCallbacks.clear()

        pluginTimeouts.forEach(clearTimeout)
        pluginTimeouts.clear()
    });


    document.addEventListener('ipsTiptapLoaded', () => {
        resolveCallbacks.forEach(cb => cb())
        resolveCallbacks.clear()
    })

    /**
     * Load 3rd party tiptap plugin files
     */
    function loadTiptapPlugins() {
        pluginsState = 'loading'
        const pluginURL = ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/editor/index.php'
        const script = document.createElement('script');
        script.setAttribute("src", pluginURL)
        document.body.appendChild(script)
        script.dataset.ipsEditorPlugins = ''

        // We quit after 5 seconds
        pluginTimeouts.add(setTimeout(() => document.dispatchEvent(new CustomEvent('ips:editorPluginsError')), 5000))
    }

    /**
     * Load the core tiptap files
     */
    function loadTiptap() {
        state = "loading";
        Debug.log("Loading the editor from the interface");

        const manifestURL = ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/tiptap/manifest.json?antiCache=' + encodeURIComponent(ips.getSetting('jsAntiCache'))

        ips.fetch(manifestURL).then(response => {
            if (typeof response === 'object') {
                for (const details of Object.values(response)) {
                    if (details.isEntry) {
                        const src = ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/tiptap/' + details.file + `?antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`
                        const scriptElem = document.createElement('script')
                        scriptElem.type = 'module'
                        document.head.appendChild(scriptElem)
                        scriptElem.src = src
                        if (Array.isArray(details.css)) {
                            for (const css of details.css) {
                                const src = ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/tiptap/' + css
                                const styleElem = document.createElement('link')
                                styleElem.rel = 'stylesheet'
                                styleElem.setAttribute('href', src)
                                document.head.appendChild(styleElem)
                            }
                        }
                    }
                }
            }
        })
    }

    /**
     * Async function that resolves as soon as the tiptap modules are loaded
     *
     * @param {boolean}     [skipPlugins=true]     Whether to skip the loading of 3rd party customizations
     *
     * @return {Promise<void>}
     */
    function whenLoaded(skipPlugins=true) {
        return new Promise((resolve) => {

            // before anything, if we are not skipping the plugins, start loading them now so this is done in parallel
            if (pluginsState === 'unloaded' && !skipPlugins) {
                loadTiptapPlugins()
            }

            const done = () => {
                if (skipPlugins || ['loaded', 'error'].includes(pluginsState)) {
                    resolve()
                } else {
                    pluginsCallbacks.add(resolve)
                }
            }

            if (state === 'loaded' || ips.utils.tiptap) {
                state = 'loaded'
                done()
            } else {
                resolveCallbacks.add(done)
            }

            if (state === 'unloaded') {
                loadTiptap()
            }
        })
    }

    const defaults = {
        postkey: '',
        minimized: false,
        autoSaveKey: null,
        hidebuttons: [],
        autosubmit: true,
        giphyenabled: false,
        stockrepliesenabled: false,
        minimizeAfterReset: false,
        name: undefined,
        restrictions: [],
        restrictionLevel: 0,
        commenteditor: false,
    };

    ips.createModule('ips.ui.editorv5', function() {
        ips.ui.registerWidget(
            'editorv5',
            ips.ui.editorv5,
            [
                'postkey',
                'minimized',
                'autoSaveKey',
                'giphyenabled',
                'stockrepliesenabled',
                'hidebuttons',
                'name',
                'loadplugins', // When this is true, we load extra plugins from the backend
                'restrictions',
                "restrictionLevel",
                'commenteditor'
            ]
        );

        return {

            /**
             * Respond method, sets up the editor widget.
             * Loads the Tiptap libraries, then boots the editor
             *
             * @param	{element} 	elem 		The element this widget is being created on
             * @param	{object} 	options 	The options passed into this instance
             * @returns {void}
             */
            respond(elem, options) {
                if ($(elem).data('_editor') !== undefined) {
                    return;
                }
                $(elem).data('_editor', null)

                if (!('loadplugins' in options)) {
                    pluginsState = 'loaded';
                    document.dispatchEvent(new CustomEvent('ips:editorPluginsReady'))
                }
                delete options.loadplugins;

                const instance = editorObj(elem, options)
                $(elem).data('_editor', instance)
                instance.init()
            },

            /**
             * Retrieve the editor instance (if any) on the given element
             *
             * @param	{element} 	elem 		The element to check
             *
             * @returns {editorObj|undefined} 	The editor instance or undefined
             */
            getObj(elem) {
                if( $( elem ).data('_editor') ){
                    return $( elem ).data('_editor');
                }

                return undefined;
            },

            /**
             * Retrieve the editor instance (if any) on the given element, initiating it if it isn't already. The instance is passed to a callback
             *
             * @param	{element} 	                        elem 		The element to check
             * @param   {function(editorObj|undefined)}     callback    If the instance exists, it will be passed to this callback. Leave callback null to return a promise which resolves to the instance
             *
             * @returns {Promise<editorObj|undefined>|void}
             */
            getObjWithInit( elem, callback ) {
                let obj = this.getObj( elem );
                if ( obj ) {
                    if (callback) {
                        callback(obj);
                    } else {
                        return new Promise(resolve => resolve(obj));
                    }
                } else {
                    let initFunction = $( elem ).data('_editorInit');
                    if ( initFunction ) {
                        if (callback) {
                            initFunction( callback );
                        } else {
                            return new Promise(resolve => initFunction(resolve))
                        }
                    }
                }

                // still here in async mode? return a void promise
                if (!callback) {
                    return new Promise(resolve => resolve(undefined))
                }
            },

            /**
             * Destruct the editor
             *
             * @param	{element} 	elem 		The element to check
             * @returns {void}
             */
            destruct(elem) {
                this.getObj( elem )?.destruct();
                $(elem).data('_editor', undefined)
            },

            whenLoaded,

            registerExtension(name, definition) {
                definition.name = `ipsCustomExtension__${name}`;
                if (name in _thirdPartyExtensions) {
                    Debug.log(`Replacing tiptap third party extension: ${name}`);
                }

                _thirdPartyExtensions[name] = definition;
            },

            registerNode(name, definition) {
                definition.name = `ipsCustomNode__${name}`;
                if (name in _thirdPartyNodes) {
                    Debug.log(`Replacing tiptap third party node: ${name}`);
                }

                _thirdPartyNodes[name] = definition;
            },

            registerMark(name, definition) {
                definition.name = `ipsCustomMark__${name}`;
                if (name in _thirdPartyMarks) {
                    Debug.log(`Replacing tiptap third party mark: ${name}`);
                }

                _thirdPartyMarks[name] = definition;
            },

            /**
             * Get all registered extension restrictions
             *
             * @param {boolean}     includeDefaults=false       Whether to include defaults. When set to true, this method will return a 2d array of restriction key/default pairs
             *
             * @return {Promise<string[]|([string, number])[]>}
             */
            async getExtensionRestrictions(includeDefaults=false) {
                await whenLoaded(false);
                const restrictions = {};
                for (const collection of [_thirdPartyMarks, _thirdPartyExtensions, _thirdPartyNodes]) {
                    for (const name in collection) {
                        const definition = {...collection[name]};
                        if (Array.isArray(definition.restrictions)) {
                            const restrictions = {};
                            for (const restriction of definition.restrictions) {
                                restrictions[restriction] = -1;
                            }
                            definition.restrictions = restrictions;
                        }

                        if (typeof definition.restrictions !== 'object' || !Object.keys(definition.restrictions).length) {
                            continue;
                        }

                        const [_, type] = definition.name.match(/^ipsCustom(Node|Mark|Extension)__/);
                        if (!type) {
                            continue;
                        }

                        for (const [restriction, defaultValue] of Object.entries(definition.restrictions)) {
                            if (![-1,0,1,2].includes(defaultValue)) {
                                Debug.warn(`The restriction ${JSON.stringify(restriction)} from the extension ${definition.name} has an invalid default value (got ${defaultValue}, expected one of -1,0,1,2), so the restriction is being skipped!`);
                                continue;
                            }

                            const langString = definition.name + '__' + restriction;

                            if (!langString?.match(/^[a-zA-Z_\-0-9]+$/)) {
                                Debug.warn(`Skipping the restriction "${restriction}" because it doesn't match the pattern "/^[a-zA-Z0-9_\\-]+$/. (It consists of one or more characters that are not alphanumeric, an underscore, or a dash)"`);
                                continue;
                            }

                            if (!ips.haveString(langString)) {
                                Debug.warn(`The restriction "${restriction}" of the ${type} "${name}" doesn't have a lang string registered (expected a lang string registered as ${langString})!`);
                                ips.setString(langString, langString);
                            }
                            restrictions[langString] = defaultValue;
                        }
                    }
                }

                return Array.from(includeDefaults ? Object.entries(restrictions) : Object.keys(restrictions));
            },

            /**
             * Build the config based on the passed options
             * @return {Object}
             */
            buildConfig(options) {
                let config = {}
                for (const k in defaults) {
                    config[k] = options[k] !== undefined ? options[k] : defaults[k];
                }
                config.giphyenabled = !!(config.giphyenabled || config.giphyenabled === '');
                config.stockrepliesenabled = !!(config.stockrepliesenabled || config.stockrepliesenabled === "");
                config.commenteditor = !!(config.commenteditor || config.commenteditor === "");

                if (typeof config.hidebuttons === 'string') {
                    config.hidebuttons = config.hidebuttons
                        .split(',')
                        .map(key => key.trim())
                        .filter(key => !!key);
                }



                if (typeof options.restrictions === 'string') {
                    config.restrictions = options.restrictions.split(',')
                } else {
                    config.restrictions = [];
                }

                return config
            }
        };
    });

    /**
     * Editor instance
     *
     * @param	{element} 	elem 		The element this widget is being created on
     * @param	{object} 	options 	The options passed into this instance
     *
     * @returns {{
            init: init,
            focus: focus,
            unminimize: unminimize,
            minimize: minimize,
            insertQuotes: insertQuotes,
            insertHtml: insertHtml,
            reset: reset,
            destruct: destruct,
            saveAndClearAutosave: saveAndClearAutosave,
            getInstance: getInstance,
            getInstanceHTML: getInstanceHTML,
            scrollIntoView: (function(*):void)
      }}
     */
    function editorObj(elem, options) {
        /**
         * @type {Editor|null}
         */
        let instance = null;
        let hiddenAtStart = false;
        let minimized = !!options.minimized;
        let editorLocation;
        let originalContent = '';

        let name = options.name || '';
        let _reactRoot;

        const config = ips.ui.editorv5.buildConfig(options)
        options = {...options, ...config}

        /**
         * This is what actually loads tiptap and creates an instance
         *
         * @return {Promise<void>}
         */
        async function fillTiptapInstance() {
            if (!instance) {
                await whenLoaded(false);


                const throttledComposeEvent = ips.utils.throttle(() => {
                    try {
                        $(elem).trigger('editor.composing', {elem})
                    } catch (e) {
                        Debug.error(e)
                    }
                }, 1000, {leading: false})

                const textArea = getTextarea();
                editorLocation = editorLocation || $(elem).get(0).querySelector('[data-role="reactRoot"]') || document.createElement('div')
                editorLocation.dataset.role = 'reactRoot'
                editorLocation.classList.add('ipsEditor__react-root')
                textArea.parentElement.insertBefore(editorLocation, textArea)
                originalContent = textArea.textContent
                try {
                    const detail = {
                        elem: $(elem).get(0),
                        textArea,
                        content: textArea.textContent,
                        options: config
                    };

                    document.dispatchEvent(new CustomEvent("ips:editorBeforeInit", {
                        bubbles: true,
                        cancelable: false,
                        detail
                    }));
                    textArea.textContent = detail.content;

                } catch (e) {
                    e.message = "An event listener on `ips:editorBeforeInit` failed to run\n\n" + e.message
                    Debug.warn(e)
                }

                // it is possible restrictions were left in for apps that don't exist. Remove those
                if (Array.isArray(config.restrictions)) {
                    const allRestrictions = new Set(await ips.ui.editorv5.getExtensionRestrictions());
                    config.restrictions = config.restrictions.filter(restriction => allRestrictions.has(restriction) || !restriction.match(/^ipsCustom(Node|Mark|Extension)__/))
                } else {
                    config.restrictions = [];
                }

                const currentOnCreate = config.onCreate;
                const self = this;
                config.onCreate = function(...args) {
                    instance = instance || args[0]?.editor;
                    if (currentOnCreate instanceof Function) {
                        (self === this ? currentOnCreate : currentOnCreate.bind(this))(...args);
                    }

                    // After everything else has run on create, we need to sync the contents
                    setTimeout(() => fillTextarea())
                    setTimeout(() => {
                        try {
                            $(elem).get(0).dispatchEvent(new CustomEvent("ips:editorAfterInit", {
                                bubbles: true,
                                cancelable: false,
                                detail: {
                                    elem: $(elem).get(0),
                                    textArea,
                                    content: textArea.innerText,
                                    options: config,
                                    instance
                                }
                            }));
                        } catch (e) {
                            e.meessage = "Something went wrong dispatching ips:editorAfterInit event on the page:\n" + e.message;
                            Debug.error(e);
                        }

                        // One more fillTextarea call for good measure
                        fillTextarea();
                    }, 100)
                }

                // Debounced onTransaction callback because onUpdate doesn't dispatch when the editor is updated programmatically (e.g. via editor.commands.setContent). However, onTransaction is called many times per keystroke so this is why we debounce a bit
                const onTransaction = config.onTransaction;
                config.onTransaction = ips.utils.debounce(function(...args) {
                    instance = instance || args[0]?.editor;
                    fillTextarea();
                    try {
                        onTransaction?.call?.(this, ...args);
                    } catch (e) {
                        e.message = "Something went wrong in an onTransaction call to the editor" + e.message;
                        Debug.error(e);
                    }
                }, 200);

                const onUpdate = config.onUpdate;
                config.onUpdate = function (...args) {
                    try {
                        onUpdate?.call?.(this, ...args);
                    } catch (e) {
                        e.message = "Failed to run the onUpdate event listener:\n" + e.message;
                        Debug.error(e);
                    }
                    instance = instance || args[0]?.editor;
                    // console.log(instance, instance.getJSON()) // leaving this in as it's real handy for debug
                    config.onTransaction?.cancel();
                    setTimeout(() => {
                        let canceled = false;
                        const event = new CustomEvent('ips:editorUpdated', {
                            bubbles: true,
                            cancelable: true,
                            detail: {
                                elem: $(elem).get(0),
                                textArea,
                                instance,
                            }
                        });

                        throttledComposeEvent();

                        const origStopProp = event.stopPropagation;
                        const origStopImmProp = event.stopImmediatePropagation;
                        event.stopPropagation = (function() {
                            canceled = true;
                            origStopProp();
                        }).bind(event)

                        event.stopImmediatePropagation = (function () {
                            canceled = true;
                            origStopImmProp();
                        }).bind(event);

                        $(elem).get(0).dispatchEvent(event)

                        if (canceled) {
                            return;
                        }

                        fillTextarea()
                    })
                }

                const customizedRestrictions = {...(ips.getSetting('editor_restrictions') || {})};
                const filterAndPrepPlugins = extensions => [...Object.values(extensions)]
                    .filter(extension => !config.restrictions.includes(`${extension.name}__`))
                    .filter(extension => {
                        if (typeof extension.restrictions !== 'object') {
                            extension.restrictions = {};
                        } else if (Array.isArray(extension.restrictions)) {
                            extension.restrictions = Object.fromEntries(extension.restrictions.map(r => [r, -1]))
                        }

                        for (const customizedRestriction in customizedRestrictions) {
                            if (customizedRestriction.startsWith(extension.name + "__")) {

                                extension.restrictions[customizedRestriction.replace(new RegExp(`^${extension.name}__`), '')] = customizedRestrictions[customizedRestriction];
                                // don't process again
                                delete customizedRestrictions[customizedRestriction];
                            }
                        }

                        for (const restriction in extension.restrictions) {
                            if (typeof extension.restrictions[restriction] === 'number' && extension.restrictions[restriction] >= (config.restrictionLevel||0) && !config.restrictions.includes(`${extension.name}__${restriction}`)) {
                                config.restrictions.push(`${extension.name}__${restriction}`)
                            }
                        }

                        return typeof extension.restrictions[""] !== "number" || extension.restrictions[""] < (config.restrictionLevel || 0);
                    })
                    .map(extensionDef => ({...extensionDef}));

                const res = await ips.utils.tiptap.editorInstance(
                    editorLocation,
                    {
                        ...config,
                        content: textArea.innerText,
                        jQuery: $,
                        ipsPlugins: {
                            // If, in the definition of the extension, there is the restriction "", it refers to the extension itself
                            extensions: filterAndPrepPlugins(_thirdPartyExtensions),
                            nodes: filterAndPrepPlugins(_thirdPartyNodes),
                            marks: filterAndPrepPlugins(_thirdPartyMarks),
                        },
                    }
                );
                instance = res[0]
                _reactRoot = res[1]

                throttledComposeEvent();

                instance.on('create', () => {
                    fillTextarea();
                })

                instance.on('selectionUpdate', () => {
                    throttledComposeEvent()
                })

                const time = config.autoSaveKey ? ips.utils.db.get('editorSave', config.autoSaveKey)?.time : false;
                if (Number.isInteger(time) && time > (Date.now() / 1000 - 86400 * 3)) {
                    fillTextarea()
                }

                // Focus event handling
                instance.on('focus', () => $(elem).trigger('editor.focused', {elem}));
                instance.on('blur', () => $(elem).trigger('editor.blurred', { elem }));

                if (Debug.isEnabled()) {
                    instance.on('contentError', (...args) => {
                        const err = new Error("Failed to insert content using current editor schema");
                        console.warn(err);
                        console.log(args);
                    })
                }
            }
        }

        /**
         * Get the textarea for this editor instance
         *
         * @return {HTMLTextAreaElement|null|undefined}
         */
        function getTextarea() {
            return $(elem).find('textarea:not(.tiptap *)').get(0);
        }

        /**
         * Get the html of the editor. Accounts for the fact that empty editors are <p></p>
         * @return {string}
         */
        function getInstanceHTML() {
            if (!instance) return "";

            const html = instance.getHTML?.();
            if (typeof html !== 'string' || html === '<p></p>') {
                return "";
            }

            // now let's strip out the box contents wrappers. We wrap the raw HTML in an actual HTML5 document juuust in case
            const parserDoc = (new DOMParser()).parseFromString(`<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`, 'text/html');
            let boxContentElement;
            while ((boxContentElement = parserDoc.querySelector('i-richtext-box-content')) && boxContentElement instanceof Element) {
                boxContentElement.before(...boxContentElement.childNodes);
                boxContentElement.remove();
            }

            return parserDoc.body.innerHTML.trim();
        }

        /**
         * Fill the textarea so that its value matches the value of the current tiptap instance
         */
        const fillTextarea = ips.utils.debounce(function() {
            const textarea = getTextarea();
            if (textarea && instance) {
                textarea.innerHTML = "";
                textarea.appendChild(document.createTextNode(getInstanceHTML())) // we use text node because they will preserve new lines and all non-breaking characters instead of replacing with <br>
            }
        }, 10);

        /**
         * Clear the textarea input for the form
         */
        function clearTextarea() {
            const textarea = getTextarea();
            if (textarea) {
                textarea.innerHTML = '';
                textarea.append(document.createTextNode(originalContent))
            }
        }

        /**
         * @callback init
         * Initializes tiptap, or if it is minimized sets up the minimized view to initialize on unminimize
         *
         * @param {Function|undefined}    [callback]
         * @returns void
         */
        async function init(callback) {
            if (options.minimized) {
                $(elem)
                    .find('.ipsComposeArea_dummy')
                    .show()
                    .on('focus click', function() {
                        $(this).off('focus click'); // Ensure these events only fire once

                        unminimize( function() {
                            focus();
                        });
                    })
                    .end()
                    .find('[data-role="mainEditorArea"]')
                    .hide()
                    .closest('.ipsComposeArea')
                    .addClass('ipsComposeArea_minimized')
                    .find('[data-ipsEditor-toolList]')
                    .prop('hidden', true);

                // Let other controllers initialize us
                $( document ).on( 'initializeEditor', _initializeEditor );
                hiddenAtStart = true;
                minimized = true;
                setTimeout(() => whenLoaded(false), 3000);
            } else {
                const mainEditorArea = $(elem).get(0).querySelector('[data-role="mainEditorArea"]')
                mainEditorArea?.classList.add('ipsLoading');
                await fillTiptapInstance();
                mainEditorArea?.classList.remove('ipsLoading');
                instance.commands.fireVisibilityChange(true)
            }

            // Any other callback?
            if (callback instanceof Function) {
                callback(this);
            }

            // When we delete a file from the uploader, we need to remove it from the editor
            $( document ).on( 'fileDeleted', _deleteFile );

            _cleanUpStaleAutoSaves();
        }


        /**
         * Remove old auto saves if they've been there for more than 3 days
         *
         * @returns void
         */
        function _cleanUpStaleAutoSaves() {
            for (let [k, v] of  Object.entries(ips.utils.db.getByType('editorSave')))
            {
                try{
                    let time = v?.time || v?.[1] // the old v4 version used an array. We still have to clean those up if they exist still
                    if (!time) {
                        continue;
                    }
                    // Older than 3 days, remove.
                    if ( time < Math.round( new Date().getTime() / 1000 ) - ( 86400 * 3 ) ) {
                        ips.utils.db.remove( 'editorSave', k );
                    }
                } catch( err ) {
                    Debug.error("Trying to remove editorSave keys:");
                    Debug.error( err );
                }
            }
        }

        let destroyed = false;

        /**
         * @callback destruct
         * Destructs this object
         *
         * @param {boolean}     [clearAutoSave=true]       Whether to clear the autosave during this process
         *
         * @returns void
         */
        function destruct(clearAutoSave=false) {
            if (destroyed) {
                return;
            }
            destroyed = true;

            try {
                _reactRoot?.unmount()
            } catch (e) { // every once in a blue moon, this throws an error. not 100% sure why; could be a tooltip in the wrong place, or some other thing interrupting react so we try 100ms later
                const r = _reactRoot;
                setTimeout(() => r.unmount(), 100);
            }
            // Tell editor we are resetting
            if (clearAutoSave) {
                instance?.commands?.clearAutosave?.();
            }
            instance?.destroy()
            clearTextarea()
            _reactRoot = undefined;

            _offEvents();
            instance = undefined;
            editorLocation?.remove();
            editorLocation = null;
        }

        /**
         * @callback getInstance
         * Returns this instance of Tiptap
         *
         * @returns {import('@tiptap/core').Editor|null}
         */
        function getInstance() {
            if( instance ){
                return instance;
            }

            return null;
        }

        /**
         * Stop listening to events for this editor
         *
         * @returns void
         */
        function _offEvents() {
            $( document ).off( 'fileDeleted', _deleteFile );
            $( document ).off( 'initializeEditor', _initializeEditor );
        }

        /**
         * @callback focus
         * Focus
         *
         * @returns void
         */
        function focus() {
            scrollIntoView();
            instance.commands.focus();
        }

        /**
         * Scroll the editor into view
         */
        function scrollIntoView(options) {
            const element = $(elem).get(0);
            const container = element.closest('#replyForm,.cTopicPostArea') || element.closest('.ipsComposeArea') || element;
            const rect = container.getBoundingClientRect();
            if (rect.top < 0 || rect.left < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight || rect.left > window.innerWidth) {
                const defaults = {
                    behavior: 'instant',
                    block: rect.top < 0 ? 'start' : 'end',
                    inline: rect.left < 0 ? "start" : "end"
                };

                if (options === true) {
                    Object.assign(defaults, {
                        behavior: 'auto',
                        block: "start",
                        inline: "nearest"
                    });
                } else if (options === false) {
                    Object.assign(defaults, {
                        behavior: 'auto',
                        block: "end",
                        inline: "nearest"
                    });
                } else if (typeof options === 'object') {
                    Object.assign(defaults, options);
                }

                container.scrollIntoView(defaults);
            }
        }

        /**
         * @callback unminimize
         * Unminimize
         *
         * @param	{Function}	callback	Function to run after unminimized
         * @returns void
         */
        function unminimize( callback ) {
            if(typeof callback !== "function"){
                callback = $.noop;
            }

            if (minimized) {

                // this is not async/await because there are 2 requests: one for the editor and one for the uploader. These can process in parallel by using .then() style promise handling
                function _unminimize() {
                    // Hide the dummy area and show the actual editor
                    const element = $(elem).get(0)
                    element.querySelector('.ipsComposeArea_dummy')?.setAttribute('hidden', '')
                    element.closest('.ipsComposeArea')?.classList.remove('ipsComposeArea_minimized')
                    element.closest('.ipsComposeArea')?.querySelectorAll('[data-ipseditor-toollist]').forEach(toolList => toolList.ipsShow())

                    const mainEditorArea = $(elem).get(0).querySelector('[data-role="mainEditorArea"]')
                    mainEditorArea?.ipsShow()
                    mainEditorArea?.classList.add('ipsLoading')

                    fillTiptapInstance()
                        .then(() => {
                            mainEditorArea?.classList.remove('ipsLoading')
                            instance?.commands.fireVisibilityChange(true)
                            // element.querySelector();

                            if (hiddenAtStart) {
                                setTimeout(() => focus(), 1);
                                hiddenAtStart = false;
                            }
                            callback();
                        })

                    minimized = false;

                    // Load the upload area
                    const minimizedUploader = element.querySelector('[data-ipsEditor-toolListMinimized]');

                    if (minimizedUploader) {
                        minimizedUploader.ipsShow();
                        ips.fetch(element.closest('form[action]').getAttribute('action'), {
                            'data': {
                                'getUploader': minimizedUploader.dataset.name
                            }
                        })
                            .then(response => {
                                const responseElement = (new DOMParser()).parseFromString(`${response}`, 'text/html').body
                                for (const el of responseElement.childNodes) {
                                    minimizedUploader.parentElement.insertBefore(el, minimizedUploader)
                                }
                                minimizedUploader.remove();
                                $(document).trigger('contentChange', [elem]);
                            })
                            .catch(e => {
                                e.message = `Failed to unminimize uploader. \n${e.message}`
                                Debug.error(e)
                            })
                    }
                }
                _unminimize();
            } else {
                callback();
            }
        }

        /**
         * @callback minimize
         * Minimize
         *
         * @returns void
         */
        function minimize() {
            if( !minimized ){
                const element = $(elem).get(0)
                element.querySelectorAll('.ipsComposeArea_dummy').ipsShow();
                element.querySelectorAll('[data-role="mainEditorArea"]').ipsHide();
                element.closest('.ipsComposeArea')?.classList.add('ipsComposeArea_minimized')
                element.closest('.ipsComposeArea')?.querySelectorAll('[data-ipseditor-toollist]').ipsHide()

                $(elem).find('.ipsComposeArea_dummy').on('focus click', function() {
                    $( this ).off('focus click'); // Ensure these events only fire once

                    unminimize( function() {
                        focus();
                    });
                })
                instance?.commands.fireVisibilityChange(false)
                minimized = true;
            }
        }

        /**
         * @callback insertQuotes
         * Insert quotes into editor
         *
         * @param 		{array} 	quotes 	Array of data objects (which should contain all of the properties necessary for a quote)
         * @returns void
         */
        function insertQuotes(quotes) {
            let isAutoSave = false, draftContent = '', _minimized = minimized;

            // Wrapper method for inserting quotes into the editor
            const _doInsert = function () {
                /* Now insert the posts. If the instance is empty return now */
                if (!instance) return;
                let toInsert = "";
                for (const data of quotes) {
                    // Remove any lightboxes on the content (they'll be reapplied when viewing the quote)
                    const html = data.quoteHtml.replace(/data-ipsLightbox(-group)?="([\w]+)?"/ig, '').trim();

                    /* Build quote */
                    const quote = $(ips.templates.render('core.editor.quote', {
                        citeurl: data.citeurl || '',
                        citation: ips.utils.getCitation(data),
                        contents: html
                    }));

                    for (let attr of ['timestamp', 'userid', 'username', 'contentapp', 'contenttype', 'contentclass', 'contentid', 'contentcommentid']) {
                        if (data[attr]) {
                            quote.attr('data-ipsQuote-' + attr, data[attr]);
                        }
                    }
                    toInsert += quote.get(0).outerHTML
                }

                if (!toInsert) {
                    return;
                }

                if (isAutoSave && draftContent) {
                    instance
                        .chain()
                        .setContent(draftContent, false)
                        .focus()
                        .run();

                    setTimeout(() => {
                        let pos
                        instance
                            .chain()
                            .command(({tr}) => pos = tr.doc.resolve(0).end())
                            .insertContentAt(pos, toInsert + "<p></p>", {parseOptions: {preserveWhitespace: false}})
                            .setMeta('preventUpdate', true)
                            .showMessage('autosave')
                            .focus()
                            .command(({chain, tr}) => chain().setTextSelection(tr.doc.resolve(0).end() - 1))
                            .run();
                    }, 10);
                    return;
                } else if (_minimized) {
                    // It's odd, but if we insert a new line and move the cursor inside it, then the quote before the new line in a second transaction it works.
                    let to, from;
                    instance
                        .chain()
                        .command(({tr}) => {
                            to = tr.doc.resolve(0).end();
                            from = to;
                            if (tr.doc.lastChild?.inlineContent && ![...tr.doc.lastChild.children].some(desc => desc.nodeSize)) {
                                from = tr.doc.resolve(0).posAtIndex(tr.doc.childCount - 1);
                            }
                            return true;
                        })
                        .insertContentAt(to, "<p></p>")
                        .setTextSelection(to + 1)
                        .focus()
                        .run();

                    instance
                        .chain()
                        .insertContentAt({from,to}, toInsert, {parseOptions: {preserveWhitespace: false}, updateSelection:false})
                        .focus()
                        .run();
                    return;
                }

                instance
                    .chain()
                    .insertContent(toInsert + (instance.state.selection.empty && instance.state.selection.$from.nodeAfter ? "" : "<p></p>"), {parseOptions: {preserveWhitespace: false}})
                    .focus()
                    .run();
            };

            // If we are minimized, we will unminimize, then empty the editor contents, and then insert the quotes
            // If we aren't minimized, keep the existing content.
            if (minimized) {
                const draft = options.autoSaveKey && ips.utils.db.get('editorSave', options.autoSaveKey);
                if (typeof draft?.content === 'string' && draft.time && (Date.now() / 1000 - 86400 * 3) < parseInt(draft.time) && !instance) {
                    draftContent = draft.content;
                    isAutoSave = true;
                }
                unminimize(function() {
                    _doInsert();
                });
            } else {
                _doInsert();
            }
        }

        /**
         * @callback insertHtml
         *
         * Insert arbitrary HTML into editor at the current selection
         *
         * @param 		{string|object} 	html 	HTML to insert; This can alternatively be a JS Object meeting the Tiptap/Prosemirror document schema
         * @see https://tiptap.dev/docs/editor/api/commands/insert-content
         *
         * @returns void
         */
        function insertHtml(html) {
            instance
                .chain()
                .insertContent(html, {parseOptions: {preserveWhitespace: false}})
                .focus()
                .run();
        }

        /**
         * @callback reset
         * Reset the editor
         *
         * @returns void
         */
        function reset() {
            // Tell editor we are resetting
            instance
                .chain()
                .setContent(originalContent || '<p></p>', {emitUpdate: true})
                .clearAutosave()
                .run();

            $(elem).find('[data-ipsUploader]').trigger('resetUploader');

            if (options.minimized && options.minimizeAfterReset) {
                minimize();
            }
            clearTextarea();
        }

        /**
         * @callback saveAndClearAutosave
         *
         * Save and clear autosave
         *
         * @returns void
         */
        function saveAndClearAutosave() {
            if (instance) {
                instance?.commands.clearAutoSave?.()
            } else {
                ips.utils.db.remove('editorSave', options.autoSaveKey);
            }
        }

        /**
         * Determines whether the provided editor ID matches this widget
         *
         * @param 		{object} 	 data   A generic data object requires editorID key which is the editor name to check
         * @returns 	boolean
         */
        function _belongsToThisEditor(data) {
            return data.editorID !== undefined && data.editorID === name;
        }

        /**
         * Allows other JS to initialize the editor
         *
         * @returns void
         */
        function _initializeEditor(e, data) {
            if( !_belongsToThisEditor( data ) ){
                return;
            }

            unminimize(	function () {
                focus();
            });
        }

        /**
         * Remove a file from the editor
         *
         * @param	{event} 	e 		Event object
         * @param	{object} 	data 	Data object from the event
         * @returns {void}
         */
        function _deleteFile(e, data) {
            // This runs from a listener on the document itself, so make sure the event is for this editor
            if (options.postkey && options.postkey !== data.postkey) {
                return;
            }

            // If this isn't unminimized, don't do anything
            if (!instance) {
                Debug.warn(new Error(`An attachment was deleted for an editor that has not been initialized. This will cause the editor's content to retain the attachment if it is unminimized or initialized`));
                return;
            }

            const fileId = parseInt(data?.fileElem?.attr?.('data-fileid'));
            if (!fileId || Number.isNaN(fileId)) {
                Debug.log(`Could not delete a file in the editor because no file id was passed`);
                return;
            }

            // Wrap in try catch so as to not block the rest of the event listeners
            try {
                instance
                    .chain()
                    .removeAttachment(fileId)
                    .focus()
                    .run();
            } catch (e) {
                Debug.warn(e);
            }
        }

        return {
            init,
            focus,
            unminimize,
            minimize,
            insertQuotes,
            insertHtml,
            reset,
            destruct,
            saveAndClearAutosave,
            getInstance,
            getInstanceHTML,
            scrollIntoView
        };

    }
}(jQuery));