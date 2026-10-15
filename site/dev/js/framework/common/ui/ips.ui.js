/* global ips, _, Debug */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.js - UI widget parent
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui', function(){

		let widgets = {}, // Registry for our widgets
			doneInitialInit = false, // Have we done the initial DOM setup on page load yet?
			ziCounter = ips.getSetting('zindex_start') || 5000, // Counter for zIndex incrementing
			ziIncrement = ips.getSetting('zindex_inc') || 50; // Increment for zindex

		/**
		 * Symbol to represent a widget that has yet to be loaded
		 * @type {symbol}
		 */
		const COMPONENT_LAZY_LOAD_SYMBOL = Symbol('i-component-unloaded');

		/**
		 * Symbol to represent a widget that is a web component but should only load on a certain event
		 * @type {symbol}
		 */
		const COMPONENT_LAZY_LOAD_ON_EVENT_SYMBOL = Symbol('i-component-load-on-event');

		// Set some keycodes as 'constants'
		// Todo this is deprecated. If code is found referencing these, it should be replaced to just use e.key instead of e.keyCode. See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
		const key = {
			BACKSPACE: 8,
			ESCAPE: 27,
			TAB: 9,
			LEFT: 37,
			RIGHT: 39,
			UP: 38,
			DOWN: 40,
			ENTER: 13,
			COMMA: 188,
			SPACE: 32
		};

		const LOADING_COMPONENTS = new Set();
		/**
		 * Map of the widgetID to the web component name
		 * @type {Object<string, string|function():RangeError>}
		 */
		const WEB_COMPONENT_NAMES = {};
		/**
		 * @type {Object<string, string|function():RangeError>}
		 */
		const WEB_COMPONENT_NAMES_REVERSE = {};

		/**
		 * Register a widget module. Widget modules are for interface items, and work with
		 * a dataAPI that looks for data- options in HTML.
		 *
		 * @param	{string} 	widgetID 		The ID of this widget, which also forms its dataAPI key
		 * @param	{boolean|string[]|FunctionConstructor<HTMLElement>|(function():(Object|{respond:(function(elem:jQuery,options:array|null))}))}	handler				A handler that returns the widget constructor. If a boolean is provided, it indicates this widget is a Web Component, and will lazy-load then register the custom element as `i-${widgetID}`. Alternatively, if a class that extends HTMLElement is provided, it will be immediately registered as the custom element `i-${widgetID}`. Lastly, an array of strings can be passed as the events that should trigger the loading of the web component
		 * @param 	{array} 	[acceptedOptions]	Array of option keys that will be accepted by this widget
		 * @param 	{object}	[widgetOptions] 	Options to change the way this widget is registered/executed
		 * @param 	{function} 	[fnCallback]		The callback function when a widget is found on the page
		 * @returns {void}
		 */
		var	registerWidget = function (widgetID, handler, acceptedOptions, widgetOptions, fnCallback) {

			if( widgets[ widgetID ] ){
				Debug.warn( "'" + widgetID + "' is already registered as a widget. Skipping..."); // todo investigate whether this log really matters. It says "skipping" but then does not skip the process
			}

			if (typeof handler === 'boolean' || isElementConstructor(handler) || Array.isArray(handler)) {
				const name = webComponentName(widgetID);
				if (widgetID in widgets) {
					Debug.warn(new RangeError(`Cannot define a web component, <${name}/>, from the UI widget system because the widget ID ${widgetID} is already in use.`));
				} else {
					widgets[widgetID] = COMPONENT_LAZY_LOAD_SYMBOL;
					if (isElementConstructor(handler)) {
						if (customElements.get(name)) {
							Debug.warn(new RangeError(`Cannot define the web component <${name}/> because it is already registered.`));
							return;
						}
						customElements.define(name, handler);
						widgets[widgetID] = handler;
					} else if (Array.isArray(handler)) {
						widgets[widgetID] = COMPONENT_LAZY_LOAD_ON_EVENT_SYMBOL;
						const listener = e => {
							if (e.target instanceof HTMLElement && e.target.tagName?.toLowerCase() === name) {
								handler.forEach(eventType => document.removeEventListener(eventType, listener, {capture: true}));
								setTimeout(() => loadWebComponent(name));
							}
						}
						handler.forEach(eventType => document.addEventListener(eventType, listener, {capture: true}));
					} else if (handler) { // if handler === true, we register right away
						setTimeout(() => loadWebComponent(name))
					} else if (handler === false) { // add the ability to instantly load this component
						document.addEventListener(`ips:loadComponent#${widgetID}`, () => {
							if (widgets[widgetID] === COMPONENT_LAZY_LOAD_SYMBOL) {
								setTimeout(() => loadWebComponent(name));
							}
						}, {once: true, capture: true});
					}

					customElements.whenDefined(name)
						.then(() => {
							widgets[widgetID] = customElements.get(name);
							document.querySelectorAll(name).forEach(el => customElements.upgrade(el));
							Debug.log(`Registered the web component <${name}/>`)
						});
				}
				return;
			}

			widgetOptions = {
				'lazyLoad': false, // Whether to only init this widget when necessary
				'lazyEvents': '', // The event to watch for to trigger lazy init
				'makejQueryPlugin': true,
				...(widgetOptions || {})
			};

			widgets[ widgetID ] = { handler: handler, callback: fnCallback,
				acceptedOptions: acceptedOptions || [], widgetOptions: widgetOptions || {} };

			if( widgetOptions.makejQueryPlugin !== false ){
				buildjQueryPlugin( widgetID, handler, acceptedOptions, widgetOptions, fnCallback );
			}

			//Debug.info("Registered widget " + widgetID);
		},

		/**
		 * Returns an array of the options accepted for the given widget
		 *
		 * @param	{string} 	widgetId 		The ID of this widget, which also forms its dataAPI key
		 * @returns {array}
		 */
		getAcceptedOptions = function (widgetID) {
			return widgets[ widgetID ]['acceptedOptions'] || [];
		},

		/**
		 * Adds the provided widget as a jQuery plugin, enabling it to be instantiated programatically
		 * e.g. $('selector').ipsMenu({ options });
		 *
		 * @param	{string} 	widgetId 		The ID of this widget, which also forms its dataAPI key
		 * @param 	{array} 	acceptedOptions	Array of option keys that will be accepted by this widget
		 * @param 	{object}	widgetOptions 	Options to change the way this widget is registered/executed
		 * @param 	{function} 	fnCallback		The callback function when a widget is found on the page
		 * @returns {void}
		 */
		buildjQueryPlugin = function ( widgetID, handler, acceptedOptions, widgetOptions ) {

			const jQueryKey = widgetOptions.jQueryKey || 'ips' + widgetID.charAt(0).toUpperCase() + widgetID.slice(1),
				dataID = 'ips' + widgetID;

			if( $.fn[ jQueryKey ] ){
				Debug.warn("jQuery plugin '" + jQueryKey + "' already exists.");
				return;
			}

			$.fn[ jQueryKey ] = function (providedOptions) {

				this.each( function () {
					let elem = $( this );

					// This is code Rikki had in here, but the function removeExistingWidget() doesn't exist anywhere in the repo (do a project search, you'll see). Left it here commented out just in case
					// if( elem.attr( dataID ) ){
					// 	removeExistingWidget( widgetID, this );
					// }

					// Add the main widget attr
					elem.attr('data-' + dataID, '');

					// Add each option
					for (let [key, value] of Object.entries(providedOptions)) {
						if (acceptedOptions.includes(key)) {
							elem.attr(`data-${dataID}-${key}`, value);
						}
					}

					if( widgetOptions.lazyLoad === false ){
						_callWidget( widgetID, elem, _getWidgetOptions( widgetID, elem ) );
					}
				});

			};
		},

		/**
		 * Register a widget module. Widget modules are for interface items, and work with
		 * a dataAPI that looks for data- options in HTML.
		 *
		 * @param	{Element|Document} 	context 	The dom node that will be searched for widgets
		 * @returns {void}
		 */
		_initializeWidgets = function (context) {

			const immediateWidgets = [],
				lazyWidgets = [],
				componentWidgets = [];

			context = context instanceof Element ? context : document;

			// Get all the widgets we'll attempt to load now
			for (const [key, item] of Object.entries(widgets)){
				if (item === COMPONENT_LAZY_LOAD_ON_EVENT_SYMBOL || isElementConstructor(item)) {
					continue; // there's nothing we need to do when this is a web component and defined
				}

				if (item === COMPONENT_LAZY_LOAD_SYMBOL) {
					componentWidgets.push(key)
				} else if( item.widgetOptions.lazyLoad === undefined || item.widgetOptions.lazyLoad === false ){
					immediateWidgets.push( key );
				} else {
					lazyWidgets.push( key );
				}
			};

			_doImmediateWidgets( immediateWidgets, context );
			if (componentWidgets.length) {
				_doComponentWidgets(componentWidgets, context)
			}

			// Lazy widgets only get set up once since they use delegated events
			if( !doneInitialInit && context === document ){
				_doLazyWidgets( lazyWidgets, context );
				doneInitialInit = true;
			}
		},

		destructAllWidgets = function (context) {
			const widgetIDs = Object.entries(widgets)
				.filter(([key, widget]) => !(widget === COMPONENT_LAZY_LOAD_SYMBOL || isElementConstructor(widget)))
				.map(([key]) => key);

			// Builds a selector that finds all of our widgets
			var selector = widgetIDs.map( item => {
				return "[data-ips" + item + "]";
			});

			// This is an expensive selector, so only do it once if possible.
			// We get all dom nodes that match any of our widgets, then we'll match them
			// up and fire off their respond methods
			var foundWidgets = $( context ).find( selector.join(',') );

			// Now we've found our widgets, we can destruct them
			foundWidgets.each( function (idx, elem) {
				elem = $( elem );

				for( var i=0; i < widgetIDs.length; i++ ){
					if( elem.attr( 'data-ips' + widgetIDs[i] ) !== undefined ){
						_destructWidget( widgetIDs[i], elem );
					}
				}
			});
		},

		/**
		 * Calls the destruct method on a widget
		 *
		 * @param	{string} 	widgetID 	ID of the widget to destruct
		 * @param	{element} 	elem 		Element on which the widget exists
		 * @returns {void}
		 */
		_destructWidget = function (widgetID, elem) {
			if( typeof widgets[ widgetID ].handler.destruct === "function" ){
				try {
					widgets[ widgetID ].handler.destruct.call( widgets[ widgetID ].handler, elem );
				} catch (err) {
					Debug.error("Error calling destruct on " + widgetID );
					Debug.error( err );
				}
			}
		},

		/**
		 * Sets up immediately-initialized widgets
		 *
		 * @param	{array} 	widgetsToLoad 	Keys of those widgets to initialize immediately
		 * @param	{element} 	context 		The dom node that will be searched for widgets
		 * @returns {void}
		 */
		_doImmediateWidgets = function (widgetsToLoad, context) {

			if( !widgetsToLoad.length ){
				return;
			}

			// We'll create another var that this time contains the format needed for a css selector
			let selector = widgetsToLoad.map(item => "[data-ips" + item + "]");

			// This is an expensive selector, so only do it once if possible.
			// We get all dom nodes that match any of our widgets, then we'll match them
			// up and fire off their respond methods
			const foundWidgets = $( context ).find( selector.join(',') );

			// Now we've found our widgets, we can set them up
			for(let elem of foundWidgets) {
				elem = $(elem);

				for( var i=0; i < widgetsToLoad.length; i++ ){
					if( elem.attr( 'data-ips' + widgetsToLoad[i] ) !== undefined ){
						_callWidget( widgetsToLoad[i], elem, _getWidgetOptions( widgetsToLoad[i], elem ) );
					}
				}
			}
		},

		/**
		 * Sets up events for lazily-loaded widgets
		 *
		 * @param	{string[]} 	widgetsToLoad 	Keys of those widgets to initialize immediately
		 * @param	{Element} 	[context] 		The dom node that will be searched for widgets
		 * @returns {void}
		 */
		_doLazyWidgets = function (widgetsToLoad, context) {

			if( !widgetsToLoad.length ){
				return;
			}

			context = context instanceof Element ? context : document;

			for( let i=0; i < widgetsToLoad.length; i++ ){
				const widget = widgets[widgetsToLoad[i]];
				const lazyEvents = widget.widgetOptions.lazyEvents || 'click';
				const widgetName = widgetsToLoad[i];

				$( context ).on( lazyEvents, "[data-ips" + widgetName + "]", (e) => {
					_callWidget( widgetName, e.currentTarget, _getWidgetOptions( widgetName, e.currentTarget ), e );
				});
			}

		},


		/**
		 * Load web components if there are any
		 *
		 * @param	{string[]} 	widgetsToLoad 	Keys of those widgets to initialize immediately
		 * @param	{Element} 	[context] 		The dom node that will be searched for widgets
		 * @returns {void}
		 */
		_doComponentWidgets = function(widgetsToLoad, context) {
			context = $(context || document).get(0);
			widgetsToLoad.forEach(widgetID => {
				const widget = widgets[widgetID];
				if (widget !== COMPONENT_LAZY_LOAD_SYMBOL) {
					return;
				}
				try {
					const name = webComponentName(widgetID);
					if (context.querySelector(name)) {
						loadWebComponent(name);
					}
				} catch (e) {}
			})
		},

		/**
		 * Calls a widget callback. If a callback is provided, that will be called. If not, we look
		 * for a 'respond' method on the handler and call that instead.
		 *
		 * @param	{string} 	widgetID 	The ID of the widget being processed
		 * @param	{element} 	elem 		The element being passed through
		 * @params 	{object} 	options 	The widget options being passed through
		 * @params 	{event} 	e 			Event object that may be passed for lazy-load widgets
		 * @returns {void}
		 */
		_callWidget = function (widgetID, elem, options, e) {
			if (widgets[ widgetID ].callback instanceof Function) {
				widgets[ widgetID ].callback.call( widgets[ widgetID ].handler, elem, options, e );
			} else if (widgets[ widgetID ].handler.respond instanceof Function) {
				widgets[ widgetID ].handler.respond.call( widgets[ widgetID ].handler, elem, options, e );
			} else {
				Debug.error("No callback method specified for " + widgetID);
			}
		},

		/**
		 * Calls a widget callback. If a callback is provided, that will be called. If not, we look
		 * for a 'respond' method on the handler and call that instead.
		 *
		 * @param	{string} 	widgetID 	The ID of the widget being processed
		 * @param	{element} 	elem 		The element being passed through
		 * @params 	{object} 	options 	The widget options being passed through
		 * @returns {void}
		 */
		_getWidgetOptions = function (widgetID, elem) {

			var options = {},
				optionKeys = widgets[ widgetID ].acceptedOptions;

			elem = $( elem );

			// First let's see there's a full options object waiting for us
			try {
				if( elem.attr('data-ips' + widgetID + '-options') ){
					var optionsObj = JSON.parse( elem.attr('data-ips' + widgetID + '-options') );

					if( typeof optionsObj === "object" && optionsObj !== null ){
						return optionsObj;
					}
				}
			} catch(err) {
				Debug.warn("Invalid options object passed in for a " + widgetID + " widget. Must be valid JSON.");
			}

			// Loop through each option this widget will accept in order to see whether
			// that option exists on this element.
			if( optionKeys.length ){
				for( var i=0; i < optionKeys.length; i++ ){
					var thisOption = elem.attr( 'data-ips' + widgetID + '-' + optionKeys[i] );

					if( thisOption !== undefined ){

						// Try and correct numbers
						if( thisOption.match(/^[1-9][0-9]*$/g) ){
							// Don't match numbers with leading zeros
							// We do this since parsing as an int will strip leading zeros. We'll assume that if a
							// leading zero exists, it's intentional, so skip this to treat it as a string instead.
							thisOption = parseInt( thisOption, 10 );
						}

						// And try and cast booleans
						if( thisOption === 'true' ){
							thisOption = true;
						} else if( thisOption === 'false' ){
							thisOption = false;
						}

						// If no value is supplied, treat it as true
						if( typeof thisOption === 'string' && thisOption.trim() === '' ){
							thisOption = true;
						}

						options[ optionKeys[i] ] = thisOption;
					}
				}
			}

			return options;
		},

		/**
		 * Returns the next zIndex value
		 *
		 * @returns 	{string}
		 */
		zIndex = function () {
			ziCounter += ziIncrement;

			if (document?.body?.style instanceof CSSStyleDeclaration) {
				document.body.style.setProperty('--ips-js-zindex-top', ziCounter.toString());
			}
			return ziCounter.toString();
		},

		/**
 		 * Returns the modal element, building it if necessary
		 *
		 * @returns 	{element}
		 */
		getModal = function () {

			return $('<div/>')
						.addClass( 'ipsModal' )
						.hide()
						.appendTo( $('body') )
						.identify();
		},

		/**
 		 * Initialize ips.ui
		 *
		 * @returns 	{void}
		 */
		init = function () {
			// Listen for content change
			$( document ).on('contentChange', function (e, newContent) {

				// Initialize widgets; if we're passed a jQuery collection, loop through each
				if( newContent instanceof jQuery ){
					newContent.each( function () {
						if( Debug.isEnabled ){
							Debug.info("contentChange event, reinitializing widgets in " + $( this ).identify().attr('id') );
						}
						_initializeWidgets( this );
					});
				} else {
					if( Debug.isEnabled ){
						Debug.info("contentChange event, reinitializing widgets in " + $( newContent ).identify().attr('id') );
					}
					_initializeWidgets( newContent );
				}
			});

			_initializeWidgets( document );

		};

		if (document?.body?.style instanceof CSSStyleDeclaration) {
			zIndex(); // this sets the initial css variable values
		} else {
			window.addEventListener('load', () => {
				zIndex();
			})
		}


		/**
		 * Base widget class that ui modules can use
		 */
		class BaseWidget {
			static _defaults = {};

			/**
			 * @type {WeakMap<Element, BaseWidget>}
			 */
			static instances = new WeakMap();

			/**
			 *
			 * @param {Element|jQuery}	elem
			 * @param {object}	options
			 */
			constructor(elem, options) {
				this.options = options;
				this.elem = $(elem);
			}

			_element = undefined;

			/**
			 * Get the Element instance (rather than a jQuery result)
			 *
			 * @return {Element}
			 */
			get element() {
				if (this._element === undefined) {
					this._element = this.elem.get(0);
				}
				return this._element;
			}

			/**
			 * "Setter" which really just warns the caller than the element is not an allowed field
			 */
			set element(val) {
				Debug.warn(`The field "element" is not settable`);
			}

			/**
			 * Destruct this object
			 */
			destruct() {
				// BaseWidget.instances.get(this.element)?.destroy(this);
				BaseWidget.instances.delete(this.element);
			}

			/**
			 * Reset this object. To be overridden ad-hoc
			 */
			reset() {

			}

			/**
			 * Do something using jquery's event system. The difference is that the function passed will preserve its 'this' value
			 *
			 * If the first argument is not a string, it is treated as the 'base' of the event - the thing the listener is actually attached to. It is not passed to $().on()
			 *
			 * @typedef {Node|jQuery|object|function}	_jq
			 * @param {([_jq, string, function(ev?:Event, data?:object)])|(string, function(ev?:Event, data?:object))|([_jq, string, string, function(ev?:Event, data?:object)])|([string, string, function(ev?:Event, data?:object)])}	args
			 */
			on(...args) {
				const cb = args.pop();
				if (!(cb instanceof Function)) {
					return;
				}

				let base = this.elem;
				if (typeof args[0] !== 'string') {
					base = $(args.shift());
				}

				base.on(...args, (...ev) => cb.call(this, ...ev))
			}

			/**
			 * TO be overridden. This is called before creating an instance to make sure the options are valid. The options are already applied to the defaults, so this would only be post-fixers such as splitting a delimited string into an array
			 *
			 * @param options
			 * @return {*}
			 */
			static fixOptions(options) {
				return options
			}

			/**
			 * Initialize on an element
			 * @param {Element|jQuery|*}	elem
			 * @param options
			 */
			static initializeOnElem(elem, options) {
				elem = elem instanceof Element ? elem : $(elem).get(0)
				if (!(elem instanceof Element)) {
					return;
				}

				if (!this.getInstance(elem)) {
					options = this.fixOptions({...this._defaults, ...options});
					const instance = new this(elem, options);
					this.instances.set(elem, instance);
				}
			}

			/**
			 * Get the instance associated with an element
			 *
			 * @param {jQuery|Element|*}	elem
			 *
			 * @return {undefined|BaseWidget}
			 */
			static getInstance(elem) {
				elem = elem instanceof Element ? elem : $(elem).get(0)
				if (elem && this.instances.has(elem)) {
					return this.instances.get(elem);
				}
				return undefined;
			}

			/**
			 * Register the ips ui module and get some basic methods that ips.ui.* modules use
			 *
			 * @param 	{string}				name				The ips.ui module's name. This is the key that is used in ips.ui; if it is not defined, the widget will not be registered, however make sure you manually register in this case
			 * @param	{string[]}				[options=[]]		The options
			 * @param   {object}    			[widgetOptions]    	Options to change the way this widget is registered/executed
			 * @param   {function}    			[fnCallback]        The callback function when a widget is found on the page
			 *
			 * @return {{destruct: function(Element|jQuery), getObj: (function(Element|jQuery): BaseWidget|undefined), reset: (function(Element|jQuery): *), respond: (function(jQuery|Element, object?):void), finalClass:*}}
			 */
			static buildModuleAndRegisterWidget(name, options=[], widgetOptions=undefined, fnCallback=undefined) {
				if (name) {
					ips.ui.registerWidget(name, ips.ui[name], options, widgetOptions, fnCallback);
				}

				return {
					respond: (elem, options) => this.initializeOnElem(elem, options),
					destruct: (elem) => this.getInstance(elem)?.destruct(),
					getObj: elem => this.getInstance(elem),
					reset: elem => this.getInstance(elem)?.reset(),
					finalClass: this
				}
			}
		}

		/**
		 * Check that a variable is a class/constructor that extends HTMLElement
		 * @param cls
		 * @return {boolean}
		 */
		function isElementConstructor(cls) {
			if (typeof cls !== 'function' || !cls.prototype) {
				return false
			}
			return HTMLElement.prototype.isPrototypeOf(cls.prototype);
		}

		/**
		 * Load a web component file from the server
		 *
		 * @param name
		 * @return {Promise<void>}
		 * @throws {RangeError}		Will throw a range error if the name is not a valid ips ui web component (e.g. /^i(-[a-z][a-z0-9])+$/i)
		 */
		async function loadWebComponent(name) {
			if (!LOADING_COMPONENTS.has(name)) {
				// convert the name up top to fail fast
				const widgetID = webComponentWidgetID(name);
				LOADING_COMPONENTS.add(name);
				let urlPath;

				// Compile the URL path depending on whether we're using compiled files
				if (ips.getSetting('useCompiledFiles') === false) {
					urlPath = "/applications/core/interface/js/webcomponents.php?component=" + widgetID;
				} else {
					urlPath = '/static/js/global/root_component_' + widgetID + ".js";
				}
				const url = window.ips.getSetting('baseURL').replace(/\/+$/, '') + urlPath + (urlPath.includes('?') ? '&' : '?') + 'v=' + ips.getSetting('jsAntiCache');
				const script = document.createElement('script');
				script.defer = true;
				script.src = url;
				script.dataset.ips = '';
				document.body.appendChild(script);
			}
			await customElements.whenDefined(name);
			LOADING_COMPONENTS.delete(name);
		}

		/**
		 * Register a web component
		 *
		 * @param {string} widgetID
		 * @param {CustomElementConstructor}	cls
		 *
		 * @throws RangeError
		 * @throws TypeError
		 */
		function registerWebComponent(widgetID, cls) {
			const name = webComponentName(widgetID);
			// is the constructor valid?
			if (!isElementConstructor(cls)) {
				throw new TypeError(`Cannot register web component because the provided cls is not a subclass of HTMLElement`);
			}

			// Is it already registered
			if (customElements.get(name)) {
				throw new RangeError(`The web component ${name} is already registered`);
			}

			// If it's not yet known as a widget, let's register so the system remembers it
			if (!(widgetID in widgets)) {
				Debug.log(`Registering the web component ${name}, however no widget is currently registered for this component. Registering the widget ${widgetID} now.`);
				registerWidget(widgetID, cls);
			} else {
				customElements.define(name, cls);
			}
		}


		/**
		 * Get or generate the Web Component name for a given widget
		 * @param {string} widgetID
		 * @return {string}
		 * @throws RangeError
		 */
		function webComponentName(widgetID) {
			if (!(widgetID in WEB_COMPONENT_NAMES)) {
				const name = 'i-' + widgetID.replaceAll(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).replace(/^-+/, '');
				try {
					validateWebComponentName(name);
					WEB_COMPONENT_NAMES[widgetID] = name;
					WEB_COMPONENT_NAMES_REVERSE[name] = widgetID;
				} catch (e) {
					WEB_COMPONENT_NAMES[widgetID] = () => new RangeError(`The widgetID ${widgetID} converts to a disallowed Web Component name, ${name}`);
				}
			}

			return WEB_COMPONENT_NAMES[widgetID];
		}

		/**
		 * Get or generate the widgetID for a given web component's name
		 *
		 * @param {string} name
		 * @return {string}
		 * @throws RangeError
		 */
		function webComponentWidgetID(name) {
			if (!(name in WEB_COMPONENT_NAMES_REVERSE)) {
				try {
					validateWebComponentName(name);
					const widgetID = name.replace(/^i-/, '').replaceAll(/-([a-z])/g, (match, $1) => $1.toUpperCase());
					WEB_COMPONENT_NAMES[widgetID] = name;
					WEB_COMPONENT_NAMES_REVERSE[name] = widgetID;
				} catch (e) {
					WEB_COMPONENT_NAMES_REVERSE[name] = () => new RangeError(`${name} is not a valid web component name`);
				}
			}

			if (WEB_COMPONENT_NAMES_REVERSE[name] instanceof Function) {
				throw WEB_COMPONENT_NAMES_REVERSE[name]();
			}

			return WEB_COMPONENT_NAMES_REVERSE[name];
		}

		/**
		 * Validate the name of a web component
		 * @param name
		 * @throws RangeError
		 */
		function validateWebComponentName(name) {
			if (typeof name !== 'string' || !name.match(/^i-[a-z][a-z-0-9\-]*$/i)) {
				throw new RangeError(`${name} is not a valid web component name`);
			}
		}

		return {
			registerWidget,
			init,
			zIndex,
			getModal,
			getAcceptedOptions,
			key,
			destructAllWidgets,
			BaseWidget,
			registerWebComponent,
			loadWebComponent
		};
	});

}(jQuery));
