/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * app.js - Our main app script
 *
 * Author: Rikki Tissier
 */

// Our namespace
var ips = ips || {};

( function($){

	class CustomSubmitEvent extends Event {
		/** @type {Element|undefined}*/
		submitter = undefined;
		/** @type {SubmitEvent} */
		originalEvent = undefined;

		/**
		 * @param {SubmitEvent}	originalEvent
		 */
		constructor(originalEvent) {
			super('submit', {bubbles: true});
			this.submitter = originalEvent.submitter;
			this.originalEvent = originalEvent;
		}
	}

	"use strict";
	let logTimeIndent = 0;
	ips = ( function () {

		var _settings,
			_strings = {},
			_graphData = {},
			uid = 1,
			urand = Math.ceil( Math.random() * 10000 ),
			elemContainer,
			_location = 'front';

		/**
		 * Boot methods - sets up the app
		 *
		 * @returns 	{void}
		 */ 
		var boot = function (config) {
			_settings = config;

			// Set our ajax handler default
			_setAjaxConfig();

			_setAjaxEventListeners();
			document.addEventListener('submit', e => {
				const form = e.target;
				if (e instanceof SubmitEvent && form instanceof HTMLFormElement && form.method.toUpperCase() === 'POST' && !getSetting('memberID') && getCsrfKeyExpiry() < Date.now() / 1000) {
					Debug.log(`Intercepted form submission... fetching fresh CSRF key`);
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					getFreshCsrfKey()
						// .then(() => new Promise(resolve => setTimeout(resolve, 2000))) // DEBUG - wait a couple seconds so I can read the logs
						.then(() => {
							Debug.log(`Got a new CSRF key, resuming the form submission`);
							let submitButton = (e instanceof SubmitEvent || e.submitter instanceof Element) ? e.submitter : form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
							if (submitButton) {
								submitButton.click();
							} else {
								// the click() causes the native submit event to fire. However, if there was no submitter (e.g. the user pressed 'Enter'), we need to dispatch our own submit event and see if they call prevent default.
								const ev = new CustomSubmitEvent(e);
								form.dispatchEvent(ev);
								if (ev.defaultPrevented) {
									return;
								}
								form.submit();
							}
						});
				}
			}, {capture: true});

				// Add a little jQuery plugin that allows us to add callbacks
			// to CSS animations
			$.fn.animationComplete = function (callback) {
				// Use native JS DOM APIs and promises to handle animationComplete, rather than waiting for an animation event.
				if ('getAnimations' in Element.prototype) {
					const elements = [...this];
					
					// .animationComplete() is usually called before animations begin, so we wait for a full event loop cycle
					(new Promise(resolve => setTimeout(resolve, 0)))
						.then(() => Promise.allSettled((elements.map(el => el.getAnimations()).flat()).map(anim => anim.finished)))
						.then(() => callback.apply(this));

					return $(this);
				}

				// fallback to the jquery system.
				return $( this ).one('webkitAnimationEnd animationend', function (e) {
					// Important fix: ignore bubbled transition events
					if( e.target == this ){
						callback.apply( this );
					}
				});
			};

			// In case we already have ips_uid elements on the page, start at the highest found

			// jQuery plugin that adds a unique id to an element if an ID doesn't
			// already exist. Based on jQueryUI method.
			$.fn.identify = function () {
				return this.each( function () {
					if( !this.id ) {
						this.id = 'ips_uid_' + urand + '_' + (++uid);
					}
				});
			};

			// Redefine .prop() so that we can observe events when properties are changed
			// See: http://stackoverflow.com/questions/16336473/add-event-handler-when-checkbox-becomes-disabled
			var oldProp = $.fn.prop;
			var newProp = function () {
				var retFunc = oldProp.apply( this, arguments );
				this.trigger( 'propChanged', this );
				return retFunc;
			};

			$.fn.prop = newProp;

			// Add a utility function for easily adding
			// methods to a prototype. 
			// From "Javascript: The Good Parts" by Douglas Crockford
			Function.prototype.method = function (name, func) {
				this.prototype[name] = func;
				return this;
			};
											
			// Warn users about pasting stuff into the console
			if( !Debug.isEnabled() && window.console ){
				window.console.log("%cThis is a browser feature intended for developers. Do not paste any code here given to you by someone else. It may compromise your account or have other negative side effects.", "font-weight: bold; font-size: 14px;");
			}

			// Signal that we're ready to begin
			$( document )
				.trigger('doneBooting')
				.ready( function () {
					// Set our location
					_location = $( 'body' ).attr('data-pageLocation') || 'front';
				});
		},

			/**
			 * Allows us to use mock ajax objects if necessary, and fetches a fresh CSRF token if we're on a guest page before sending the request
			 *
			 * @returns 	{object} 	Ajax object (jQuery's $.ajax by default)
			 */
			getAjax = function () {
				const wrap = method => (...args) => {
					let options = {}, url;
					if (typeof args[0] === 'string') {
						url = args[0];
						options = args[1] || {};
					} else if (typeof args[0] === 'object' && args[0]) {
						options = args[0];
					}

					// In this case, we completely skip redirects on both the front and back end
					if (options?.bypassRedirect === 'none') {
						options.headers = options.headers || {};
						options.headers['x-bypass-ajax-redirect'] = '1';
					}

					if ((options.method || options.type)?.toLowerCase() !== 'post' || getSetting('memberID') || getCsrfKeyExpiry() >= Date.now() / 1000) {
						return method(...args);
					}

					// Guest with an expired CSRF key? Oh boy, we need to return a proxy object for an api encompassing its own polyfill (our polyfill > $.ajax > XMLHttpRequest)
					let requestInstance;
					const decoratorQueues = {};
					const properties = {};
					let thenResolve,
						thenReject,
						mimeTypeOverride;
					const uploadEventListeners = new Map();
					const uploadDispatchedEvents = [];
					const proxyXHRObject = {
						_promise: new Promise((resolve, reject) => {
							thenResolve = resolve;
							thenReject = reject
						}),
						then(cb) {
							this._promise.then(cb);
						},
						catch(...args) {
							this._promise.catch(...args)
						},
						finally(...args) {
							this._promise.finally(...args);
						},
						_aborted: false,
						get aborted() {
							return this._aborted;
						},
						_abortedStatusText: undefined,
						get abortedStatusText() {
							return this._abortedStatusText;
						},
						abort(statusText) {
							this._aborted = true;
							this._abortedStatusText = statusText;
							requestInstance?.abort(statusText);
						},
						getAllResponseHeaders() {
							return requestInstance?.getAllResponseHeaders() || null;
						},
						getResponseHeader(header) {
							return requestInstance?.getResponseHeader(header) || null;
						},
						overrideMimeType(mimeType) {
							if (requestInstance) {
								requestInstance.overrideMimeType(mimeType);
								return;
							}
							mimeTypeOverride = mimeType;
						},
						get readyState() {
							return requestInstance ? requestInstance.readyState : 0;
						},
						get response() {
							return requestInstance ? ('response' in requestInstance ? requestInstance.response : null) : null;
						},
						get responseText() {
							if (typeof requestInstance?.responseText === 'string') {
								return requestInstance.responseText;
							}
							return "";
						},
						get responseType() {
							if (typeof requestInstance?.responseType === 'string') {
								return requestInstance.responseType;
							}
							return "";
						},
						get responseURL() {
							return requestInstance ? requestInstance.responseURL : (url || options.url || window.location.href);
						},
						get responseXML() {
							return requestInstance ? requestInstance.responseXML : null;
						},
						get status() {
							return requestInstance ? requestInstance.status : 0;
						},
						get statusText() {
							return requestInstance ? requestInstance.statusText : "";
						},
						get timeout() {
							return properties.timeout || 0;
						},
						set timeout(val) {
							properties.timeout = val;
							if (requestInstance) {
								requestInstance.timeout = val;
							}
						},
						get withCredentials() {
							return !!(requestInstance ? requestInstance.withCredentials : properties.withCredentials);
						},
						set withCredentials(val) {
							val = !!val;
							properties.withCredentials = val; // track this in case it was set before the request instance was defined
							if (requestInstance) {
								requestInstance.withCredentials = val;
							}
						},
						_upload: {
							_getEventCollection(event, options) {
								const path = [
									event,
									(options && options.capture) ? "true" : "false"
								];

								let collection = uploadEventListeners;
								for (let i = 0; i < path.length; i++) {
									const cmp = path[i];
									collection.set(cmp, collection.get(cmp) || new Map());
									collection = collection.get(cmp);
								}

								return collection;
							},
							addEventListener(event, cb, options={}) {
								requestInstance?.upload?.addEventListener?.(event, cb, options);
								this._getEventCollection(event, options).set(cb, {options, event});
							},
							removeEventListener(event, cb, options={}) {
								requestInstance?.upload?.removeEventListener?.(event, cb, options);
								this._getEventCollection(event, options).delete(cb);
							},
							dispatchEvent(...args) {
								if (requestInstance?.upload?.dispatchEvent instanceof Function) {
									requestInstance.upload.dispatchEvent(...args);
									return;
								}
								uploadDispatchedEvents.push(args);
							},
							set onabort(cb) {
								this.addEventListener('abort', cb);
							},
							set onerror(cb) {
								this.addEventListener('error', cb);
							},
							set onload(cb) {
								this.addEventListener('load', cb);
							},
							set onloadend(cb) {
								this.addEventListener('loadend', cb);
							},
							set onloadstart(cb) {
								this.addEventListener('loadstart', cb);
							},
							set onprogress(cb) {
								this.addEventListener('progress', cb);
							},
							set ontimeout(cb) {
								this.addEventListener('timeout', cb);
							}
						},
						get upload() {
							return requestInstance ? requestInstance.upload : this._upload;
						}
					}

					for (const chainableMethod of ['done','always', 'fail', 'success', 'error', 'complete']) {
						proxyXHRObject[chainableMethod] = (function(...args) {
							decoratorQueues[chainableMethod] = decoratorQueues[chainableMethod] || [];
							decoratorQueues[chainableMethod].push(args);
							requestInstance?.[chainableMethod]?.(...args);
							return this;
						}).bind(proxyXHRObject);
					}

					for (const simpleMethod of ['getAllResponseHeaders', 'getResponseHeader']) {
						proxyXHRObject[simpleMethod] = (function(...args) {
							return requestInstance?.[simpleMethod]?.(...args);
						}).bind(proxyXHRObject);
					}


					getFreshCsrfKey()
						.then(() => {
							Debug.log(`Intercepted Fetch request and get fresh CSRF Key`);
							requestInstance = method(url, options);
							if (requestInstance.upload) {
								if (Object.keys(uploadEventListeners).length) {
									function evalCollection(collection) {
										for (const [key, childCollection] of collection.entries()) {
											if (key instanceof Function) {
												requestInstance.upload.addEventListener(childCollection.event, key, childCollection.options);
											} else {
												evalCollection(childCollection);
											}
										}
									}
									evalCollection(uploadEventListeners);
								}

								for (const args of uploadDispatchedEvents) {
									requestInstance.upload.dispatchEvent(...args);
								}
							}
							if (mimeTypeOverride) {
								requestInstance.overrideMimeType(mimeTypeOverride);
							}

							for (const queue in decoratorQueues) {
								requestInstance[queue](...decoratorQueues[queue]);
							}

							for (const property in properties) {
								requestInstance[property] = properties[property];
							}

							requestInstance
								.then((...result) => {
									thenResolve(...result);
								}).catch(err => {
								thenReject(err);
							});

							if (proxyXHRObject.aborted) {
								proxyXHRObject.abortedStatusText ? requestInstance.abort(proxyXHRObject.abortedStatusText) : requestInstance.abort();
							}
						});

					return proxyXHRObject;
				}

				if( getSetting('mock_ajax') ){
					return wrap(getSetting('mock_ajax'));
				}

				return wrap($.ajax);
			},
		/**
		 * Async wrapper for our getAjax method to act like fetch. Resolves the response data or throws an error on reject
		 *
		 * @typedef ajaxOptions
		 * @property {string}		[accepts='depends on dataType']		The content type accpeted in a response
		 * @property {Function}		[beforeSend] An optional callback which modifies the jqXHR request before sending it out; see http://api.jquery.com/Types/#jqXHR
		 * @property {boolean}		[cache=true]	Whether to allow the browser to cache the response of this request
		 * @property {string}		[contentType='application/x-www-form-urlencoded; charset=UTF-8'|false] The content type of the data being sent out, or false to not send a content type request header
		 * @property {boolean}		[crossDomain=false] Whether to force a cross domain request. NOTE this is automatically set when the url is cross domain, and rarely if ever should be set manually
		 * @property {object|string|array} [data]		The request body
		 * @property {"html"|"xml"|"script"|"json"|"jsonp"|"text"|string}		[dataType]	The content type you are expecting in the response; This is usually not needed and will be interpreted by the mime type. You can also pass a space delimited list of types
		 *@property  {Object.<string, string>}	[headers]	Additional request headers to send
		 * @property {boolean}	[ifModified=false]	Only treat the response as successful if the response changed since the last request, determined by the lastModified response header
		 * @property {"GET"|"POST"|"PUT"|"DELETE"|"PATCH"|string}	[method="GET"]	The HTTP Request method
		 * @property {string}		[mimeType]		A string to overload the XHR mimetype
		 * @property {string}		[password]		A password to use for HTTP basic auth
		 * @property {boolean}		[processData=false]	Whether to process data passed in the `data` property before sending it to the server to match the content type (e.g. an object is converted to a query string)
		 * @property {string}		[scriptCharset]	If you are using script transport (e.g. appending a <script> element and setting the source), this will set the charset of the script element before requesting the script
		 * @property {number}		[timeout]		The timeout of the request; `0` means the request never times out
		 * @property {string}		[username]      A username to use for HTTP Basic Auth
		 *
		 * @param {string|ajaxOptions}		url		The url being requested
		 * @param {ajaxOptions}		[settings={}]		Additional settings to use for the request
		 *
		 * @returns {Promise<object>}
		 */
		fetch = function(url, settings={}) {
			return new Promise((resolve, reject) => {
				const options = {};
				if (typeof settings === 'object') {
					Object.assign(options, settings)
				} else if (settings) {
					return resolve(new TypeError(`Could not generate an ajax request because the settings is supposed to be of type object. Got a(n) ${typeof settings}`));
				}

				if (typeof url === 'string') {
					options.url = url;
				} else if (typeof url === 'object') {
					Object.assign(options, url)
				} else {
					return reject(new TypeError(`Could not generate an ajax request because url is supposed to be a string or an object. Got a ${typeof url}`));
				}

				options.async = true
				const getXHRHook = options.getXHRHook;
				delete options.getXHRHook;
				delete options.error
				delete options.success
				delete options.complete
				delete options.contents
				delete options.context
				delete options.converters
				delete options.dataFilter
				delete options.global
				delete options.isLocal
				delete options.jsonp
				delete options.jsonpCallback
				delete options.scriptAttrs
				delete options.statusCode
				delete options.traditional
				delete options.xhr
				delete options.xhrFields

				if (options.type && !options.method) {
					options.method = options.type;
					delete options.type;
				}
				let jqxhr;
				jqxhr = getAjax()(options).done(resolve).fail((e,...args) => {
					try {
						if (e instanceof Error || typeof e === 'object') {
							e.jqxhr = jqxhr;
							e.additionalArgs = args;
							reject(e);
						} else {
							throw new Error("Expected the first argument of the fail method to be an Error or a writable Object");
						}
					} catch (anotherError) {
						let finalError = new Error("Got a really weird type passed to the fail method of a jquery ajax call");
						finalError.additionalArgs = args;
						finalError.jqxhr = jqxhr;
						finalError.additionalError = anotherError;
						Debug.error(anotherError);
						reject(anotherError);
					}
				});

				if (getXHRHook instanceof Function) {
					try {
						getXHRHook(jqxhr);
					} catch (e) {
						e.message = `Something went wrong when assigning the jqxhr hook - ${e.message}`;
						Debug.error(e);
					}
				}
			})
		},

		/**
		 * Returns our main wrapper (body by default)
		 * With custom skins, sometimes inserting into the body can cause styling issues.
		 * With the container setting, we can choose to insert them somewhere else.
		 *
		 * @returns 	{element} 	The container
		 */ 
		getContainer = function () {
			var tryThis = $( getSetting('container') );
			return ( tryThis.length ) ? tryThis : $('body');
		},

		/**
		 * Refresh teh csrf key if needed
		 * @return {Promise<void>}
		 * @private
		 */
		_refreshCsrfKey = async function() {

			// we do this before refreshing to prevent any infinite loops.
			setSetting('csrfKeyExpiry', Math.floor(Date.now() / 1000 + 20));
			try {
				// we use fetch() directly to not use the existing csrf key that getAjax uses
				const response = await window.fetch(getSetting('baseURL').toString().replace(/\/+$/, '') + '/?app=core&module=system&controller=ajax&do=getCsrfKey&path=' + window.location.pathname );
				const data = await response.json();

				Debug.log(`Got new CSRF Key: ${data.key}`);
				setSetting('csrfKey', data.key);
				setSetting('csrfKeyExpiry', typeof data.expiry === "number" ? data.expiry : Math.floor(Date.now() / 1000 + 500));
				_setAjaxConfig();

				// All csrfKey inputs
				document
					.querySelectorAll(`form input[name="csrfKey"]`)
					.forEach(input => {
						input.value = data.key;
					});


				// Make sure the form's action is updated
				document.querySelectorAll(`form:is([action*="?csrfKey="],[action*="&csrfKey="])`)
					.forEach(form => {
						const url = new URL(form.action);
						if ((url.toString().startsWith('https:' + ips.getSetting('baseURL')) || url.toString().startsWith('http:' + ips.getSetting('baseURL'))) && (url.searchParams.has('csrfKey') || form.method.toLowerCase() !== 'get')) {
							url.updateSearchParams({param: 'csrfKey', value: data.key});
							form.action = url.toString();
						}
					});

				// Any links need updating too
				document.querySelectorAll(`[href*="?csrfKey="], [href*="&csrfKey="]`)
					.forEach(linkLikeEl => {
						const url = new URL(linkLikeEl.href || linkLikeEl.getAttribute('href'));
						if ((url.toString().startsWith('https:' + ips.getSetting('baseURL')) || url.toString().startsWith('http:' + ips.getSetting('baseURL'))) && url.searchParams.has('csrfKey')) {
							url.updateSearchParams({param: 'csrfKey', value: data.key});
							linkLikeEl.setAttribute('href', url.toString());
						}
					});

				// Dispatch an event so third party code can listen
				document.dispatchEvent(new CustomEvent('ips:csrfKeyUpdated'));
			} catch (e) {
				Debug.warn(e);
			}
		},


		/**
		 * Get the time the csrf key should expire. If there is no current csrf key, we return null
		 *
		 * @return {number}
		 */
		getCsrfKeyExpiry = function() {
			const setting = getSetting('csrfKeyExpiry');
			if (typeof setting === "number" && !Number.isNaN(setting) && getSetting('csrfKey')) {
				return setting;
			}

			return 0; // in this case, we assume it's expired
		},

		/**
		 * Refresh the csrf key on the page to make sure it's valid
		 *
		 * @returns {Promise<string>}
		 */
		getFreshCsrfKey = async function() {
			// Logged In and we know the key? Return it now
			if (getSetting('memberID') && getSetting('csrfKey')) {
				return getSetting('csrfKey');
			}

			if (Date.now() / 1000 >= getCsrfKeyExpiry()) {
				await _refreshCsrfKey();
			}

			return getSetting('csrfKey');
		},

		/**
		 * Sets up our global ajax handlers
		 *
		 * @returns 	{void}
		 */ 
		_setAjaxConfig = function () {
			var data = {
				csrfKey: getSetting('csrfKey')
			};

			$.ajaxSetup({
				data: data,
				cache: true
			});
		},

		/**
		 * Set up the event listeners for ajax requests
		 * @private
		 */
		_setAjaxEventListeners = function() {

			// Add global loading indicator ability
			var count = 0;

			$( document )
				.ajaxSend( function (event, request, settings) {
					if( settings !== undefined && settings.showLoading === true ){
						if( !$('#elAjaxLoading').length ){
							getContainer().append( templates.render('core.general.ajax') );
						}

						count++;
						ips.utils.anim.go( 'fadeIn fast', $('#elAjaxLoading') );
					}
				})
				.ajaxComplete( function (event, request, settings) {
					if( settings !== undefined && settings.showLoading === true ){
						count--;

						if( count === 0 ){
							ips.utils.anim.go( 'fadeOut fast', $('#elAjaxLoading') );
						}
					}

					// Check for redirect response
					if( settings !== undefined && !settings.bypassRedirect ){
						var responseJson = null;

						if( request.responseJSON !== undefined && request.responseJSON.redirect !== undefined )
						{
							responseJson = request.responseJSON;
						}
						else if( request.responseText !== undefined )
						{
							try
							{
								var jsonResponse = JSON.parse( request.responseText );

								if( jsonResponse && jsonResponse.redirect !== undefined )
								{
									responseJson = jsonResponse;
								}
							}
							catch( err ){}
						}

						if( responseJson ){
							// Do we have a flash message to show?
							if( responseJson.message !== undefined && responseJson.message != '' ){
								ips.utils.cookie.set( 'flmsg', responseJson.message );
							}
							
							if ( responseJson.redirect.match( /#/ ) ) {
								window.location.href = responseJson.redirect;
								window.location.reload();
							} else {
								window.location = responseJson.redirect;
							}
						}
					}

					// Re-parse cookies
					ips.utils.cookie.init();
				});
		},

		/**
		 * Config getter
		 *
		 * @param 	{string} 	key 	Setting key to return
		 * @returns {*} 	Config setting, or undefined if it doesn't exist
		 */ 
		getSetting = function (key) {
			return _settings[ key ];
		},

		/**
		 * Return full settings object
		 *
		 * @returns 	{object} 	Settings object
		 */
		getAllSettings = function () {
			return _settings;
		},

		/**
		 * Config setter
		 *
		 * @param 	{string} 	key 	Key to set
		 * @param 	{mixed} 	value	Setting value
		 * @returns {void}
		 */
		setSetting = function (key, value) {
			_settings[ key ] = value;
		},

		/**
		 * Adds strings to our language object
		 *
		 * @param 	{mixed} 	strings 	Either an {object} of key/values, or a {string} as a key
		 * @param 	{string} 	[...]		If strings is a string, this param is the value
		 * @returns {void}
		 */
		setString = function (strings) {

			if( strings != null && typeof strings.valueOf() === "string" && arguments.length == 2 && arguments[1] != null && typeof arguments[1].valueOf() === "string" ){
				strings = {};
				strings[ arguments[0] ] = arguments[1];
			} else if( typeof strings !== "object" ){
				Debug.warn("Invalid strings object passed to addString");
				return;
			}

			$.each( strings, function (key, value ){
				_strings[ key ] = value;
			});
		},
		
		/**
		 * Detect if a language string exists
		 *
		 * @param 	{string} 	key		The key
		 * @returns {boolean}
		 */	
		haveString = function (key) {
			return _strings[ key ] !== undefined;
		},

		/**
		 * Retrieves a string from storage, and interpolates values if needed
		 *
		 * @param 	{string} 	key 		The key of the string
		 * @param 	{?Object.<string, string|number|boolean>} 	[values]		The values to interpolate into the string
		 * @param	{boolean}	[showMissingError=true]		Whether to return an error message when the string is missing and debug mode is enabled. Only disable this when a lang string is intentionally missing
		 *
		 * @returns {string}	The interpolated string ('' if the key does not exist)
		 */	
		getString = function (key, values, showMissingError=true) {

			if (!(key in _strings)) {
				Debug.warn("The string '" + key + "' doesn't exist");
				return Debug.isEnabled() && showMissingError ? `[${key}]` : '';
			}

			/**
			 * @type {string}
			 */
			let thisString = _strings[ key ];
			values = values || {};

			// Do we have special values to parse?
			if (thisString.indexOf('{{') === -1) {
				return thisString;
			}

			// Add some vars into the values
			Object.assign(values, {
				baseURL: ips.getSetting('baseURL')
			});

			try {
				return thisString.replace(/\{\{(.+?)\}\}/g, (match, keyName) => {
					keyName = keyName.trim();

					// If value exists, replace it
					if (Object.prototype.hasOwnProperty.call(values, keyName)) {
						return values[keyName];
					}

					// Otherwise keep placeholder for easier debugging
					return match;

				});
			} catch (err) {
				Debug.error(err);
				return Debug.isEnabled() ? "[Error using language string " + key + "]" : "";
			}
		},

		/**
		* GraphQL Response setter
		*
		* @param 	{string} 	key 	Key to set
		* @param 	{mixed} 	value	Response value
		* @returns {void}
		*/
		setGraphQlData = function (key, value) {
			_graphData[ key ] = value;
		},

		/**
		 * GraphQL Responses getter
		 *
		 * @param 	{string} 	key 	Key to return
		 * @returns {mixed} 	Data, or undefined if it doesn't exist
		 */
		getGraphQlData = function (key) {
			return _graphData[ key ];
		},

		/**
		 * Returns the location in which we're running
		 *
		 * @returns {string} 	Location key
		 */
		getLocation = function () {
			return _location;
		},

		/**
		 * Create a module, checking that each namespace is ready to accept
		 * modules. If the init method exists on the given module, it is added
		 * to the document.ready queue.
		 *
		 * @param	{string} 	name 	The full module path to create
		 * @param 	{function} 	fn 		The module definition
		 * @returns {void}
		 */
		createModule = function (name, fn) {
			
			var bits = name.split('.'),
				currentPath = window;

			// Loop through the path pieces and ensure they exist
			if( bits.length ){
				for( var i = 0; i < bits.length; i++ ){

					if( currentPath[ bits[i] ] === undefined ){
						currentPath[ bits[i] ] = {};
					}

					currentPath = currentPath[ bits[i] ];
				}
			} else {
				return false;
			}

			// Assign our module to the path
			currentPath = Object.assign( currentPath, fn.call( currentPath ) );

			// Set up init if it exists
			if( typeof currentPath.init === "function" ){
				// support external loading. If the script is embedded in another webpage after it loads, the document is already 'ready'. We will instead listen for a 'ipsScriptsReady' event
				if (window.ipsScriptsExternallyLoaded) {
					$(document.body).on('ipsScriptsReady', function () {
						currentPath.init.call(currentPath);
					})
				} else {
					$(document).ready(function () {
						currentPath.init.call(currentPath);
					});
				}
			}

			$( document ).trigger( 'moduleCreated', [ name ] );
		},

		/**
		 * Provides a pluralized version of a string based on the supplied value
		 *
		 * @param	{string} 	stringKey 	The key of the language string containing the pluralization tag
		 * @param 	{number} 	value 		The value to be pluralized
		 * @returns {string}
		 */
		pluralize = function (stringKey, params) {
			// Get the string we'll work with
			var word = stringKey;

			// Get the pluralization tags from it
			var i = 0;

			if( !Array.isArray( params ) ){
				params = [ params ];
			}
			
			word = word.replace( /\{(!|\d+?)?#(.*?)\}/g, function (a,b,c,d) {
				// {# [1:count][?:counts]}
				if( !b || b == '!' ){
					b = i;
					i++;
				}

				var value;
				var fallback;
				var output = '';
				var replacement = params[ b ] + '';

				c.replace( /\[(.+?):(.+?)\]/g, function (w,x,y,z) {
					var xLen = x.length * -1;
					
					if( x == '?' ){
						fallback = y.replace( '#', replacement );
					} 
					else if( x.charAt(0) == '%' && x.substring( 1 ) == replacement.substring( 0, x.substring( 1 ).length ) ){
						value = y.replace( '#', replacement );
					}
					else if( x.charAt(0) == '*' && x.substring( 1 ) == replacement.substr( -x.substring( 1 ).length ) ){
						value = y.replace( '#', replacement );	
					}
					else if( x == replacement ) {
						value = y.replace( '#', replacement );
					}
				});

				output = a.replace( /^\{/, '' ).replace(/\}$/, '' ).replace( '!#', '' );
				output = output.replace( b + '#', replacement ).replace( '#', replacement );
				output = output.replace( /\[.+\]/, value == null ? fallback : value ).trim();

				return output;
			});

			return word;
		},

		testConsole = function () {
			if( window.atob && window.console ){
				console.log( window.atob("ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgd293ICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
CAgIAogICAgICAgICAgICAgICAgICAgICAgICBzdWNoIGZvcnVtICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAga\
G93IGFqYXggICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICB2ZXJ5IGNvbW11bml0eSAgICAgIC\
AgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWNoIG1lbWJlcgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\
ICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCg==")
				);
			}

			return '';
		};

		var templates = function () {
			var _templateStore = {};
			const _defaults = {};

			/**
			 * Sets a mustache template
			 *
			 * @param	{string} 	key 		Key name for this template
			 * @param 	{string|function():string} 	template 	Template, as string or function which returns a string
			 * @param 	{Object}					[defaults]	Default template params
			 * @returns {void}
			 */
			var set = function (key, template, defaults={}) {
				_templateStore[ key ] = template;
				_defaults[key] = defaults;
			},

			/**
			 * Return a mustache template
			 *
			 * @param	{string} 	key 		Key name for the template to retrieve
			 * @returns {string}	Template contents
			 */
			get = function (key) {
				if( _templateStore[ key ] ){
					if( typeof _templateStore[ key ] === "function" ){
						return _templateStore[ key ]();
					} else {
						return _templateStore[ key ];
					}
				}

				return '';
			},

			/**
			 * Renders a mustache template
			 *
			 * @param	{string} 	key 		Key name for this template
			 * @param 	{?Object} 	[obj] 		Object of values with which to render the template
			 * @returns {string} 	The rendered contents
			 */
			render = function (key, obj) {
				obj = (obj && typeof obj === 'object') ? obj : {};
				const defaults = _defaults[key] || {};
				const options = {
					...defaults,
					...obj,
					baseURL: ips.getSetting('baseURL'),
					lang: _lang,
					blankImg: ips.getSetting('blankImg') || ''
				};

				return Mustache.render( get( key ), options );
			},

			/**
			 * Returns a compile mustache template ready for us
			 *
			 * @param	{string} 	key 		Key name for this template
			 * @returns {function} 	A compiled template function
			 */
			compile = function (key) {
				if( _templateStore[ key ] ){
					const compiled = Mustache.parse(get(key));
					return (options, ...otherArgs) => {
						options = (options && typeof options ==='object') ? options : {};
						const defaults = _defaults[key] || {};
						options = {...defaults, ...options};
						return compiled(options, ...otherArgs);
					};
				}

				return $.noop;
			},

			/**
			 * Returns a function that Mustache can use to swap out language strings
			 * Allows {{#lang}}key{{/lang}} to be used in the templates
			 *
			 * @returns {function} 	A closure
			 */
			_lang = function () {
				return function (text, render) {
					return ips.getString(render(text));
				}
			};

			return {
				set,
				get,
				render,
				compile
			};
		}();

		/**
		 * Clean the contents of an element.
		 *
		 * @param elem
		 */
		function cleanContentsOf(elem) {
			elem = $(elem)
			if (!elem.length) {
				Debug.log(`Skipped the cleaning of IPS modules and controllers from an empty content selection`)
				return
			}
			Debug.log('Cleaning up IPS modules and controllers from content');

			// Clean the controllers from this element
			window.ips.controller.cleanContentsOf(elem, false)

			// Remove any widgets that exist in this elem
			window.ips.ui.destructAllWidgets( $( elem ) );

			elem.each(function() {
				const elem = $(this)
				for (const group of ['ui', 'utils']) {
					for (const module in window.ips[group]) {
						if (window.ips[group][module].onCleanup instanceof Function) {
							try {
								window.ips[group][module].onCleanup(elem);
							} catch (e) {
								e.message = `An error occurred when calling ips[${JSON.stringify(group)}][${JSON.stringify(module)}].onCleanup() an an element`
								e.cleanupTarget = elem
								Debug.error(e)
							}
						}
					}
				}
			})

			$(document).trigger('contentCleanup', [elem])
		}

		return {
			boot,
			createModule,
			getSetting,
			getAllSettings,
			setSetting,
			getGraphQlData,
			setGraphQlData,
			getAjax,
			fetch,
			getContainer,
			setString,
			haveString,
			getString,
			pluralize,
			getLocation,
			templates,
			testConsole,
			cleanContentsOf,
			/**
			 * Create a unique ID
			 * @return {string}
			 */
			uid() {
				return `${Math.round(Math.random() * Math.pow(16, 5)).toString(16)}-${Math.round(Math.random() * Math.pow(16, 5)).toString(16)}-${Math.round(Math.random() * Math.pow(16, 5)).toString(16)}-${Math.round(Math.random() * Math.pow(16, 5)).toString(16)}`
			},
			/**
			 * Log the time that a callback takes to execute to the console, while JS debug mode is enabled.
			 *
			 * @template {*} T
			 * @param {function():T}	cb
			 * @param {string|(function(number):string|*)|*} [message='Done timing code']
			 * @param {{threshold?:number}} [options={threshold:0}]
			 * @param {number}	[options.threshold=0]		A threshold for logging. If the execution time does not exceed the threshold, the log will not be logged.
			 *
			 * @return {T}
			 */
			logTime(cb, message="Done timing code", {threshold=0}={}) {
				const stack = (new Error()).stack;
				const lastLine = stack.split('\n').slice(0,3).pop().trim().replace(/^at\s*/, '');
				logTimeIndent++;
				const now = window.performance.now instanceof Function ? () => window.performance.now() : Date.now;
				const start = now();
				const doneExecuting = () => {
					const end = now();
					if (message instanceof Function) {
						try {
							message = message(end - start);
						} catch (e) {
							e.message = "\t".repeat(Math.max(0, logTimeIndent - 1)) + e.message;
							Debug.warn(e);
							message = "Done timing code, but a message generator failed";
						}
					}
					if ((end - start >= threshold) && Debug.isEnabled()) {
						if (typeof message === "string") {
							console.log(`${"\t".repeat(Math.max(0, logTimeIndent - 1))}${end - start}ms: ${message}\n${"\t".repeat(Math.max(1, logTimeIndent))}${lastLine}`);
						} else {
							console.log(`${"\t".repeat(Math.max(0, logTimeIndent - 1))}${end - start}ms: `, message, `\n${"\t".repeat(Math.max(1, logTimeIndent))}${lastLine}`);
						}
					}
					logTimeIndent--;
				}
				const res = cb();
				if (res instanceof Promise) {
					return res.then((result) => {
						doneExecuting();
						return result;
					})
				}

				doneExecuting();
				return res;
			}
		};

	}());
	
	ips.boot( ipsSettings );

    // Load Polyfills
    const loadStaticScript = path => {
        const script = document.createElement('script');
        const url = new URL(
            window.location.protocol + ips.getSetting('baseURL').replace(/\/+$/, '') + "/" + path.replace(/^\/+/, '')
        );

        url.searchParams.set('antiCache', ips.getSetting('jsAntiCache'));

        script.src = url.toString();
        const target = document.body || document.head || document.documentElement;
        target.appendChild(script);
    };

    // Polyfill: command/commandfor attributes (Safari < 26.2, Chrome < 135, Firefox < 144)
    if (!('command' in HTMLButtonElement.prototype)) {
        Debug.log(`Loading command/commandfor polyfill`);
        loadStaticScript('/applications/core/interface/static/polyfill/invokers.js');
    }

    // Polyfill: Add popover support to old browsers
    if (!(HTMLElement.prototype.showPopover instanceof Function)) {
        Debug.log(`Loading popover polyfill`);
        loadStaticScript('/applications/core/interface/static/polyfill/popover/popover.min.js');
    }

    // Polyfill: Fix a few popover quirks in Safari (Fixed in 26.5)
    if (
        CSS.supports("(-webkit-hyphens: none)") &&
        (
            typeof ToggleEvent === 'undefined' ||
            !('source' in ToggleEvent.prototype) ||
            !CSS.supports("selector(::details-content)") ||
            !CSS.supports("text-box-edge: auto")
        )
    ) {
        Debug.log(`Loading Safari popover polyfill`);
        loadStaticScript('/applications/core/interface/static/polyfill/safariPopover.js');
    }

	// Polyfill: event.submitter doesn't exist in Safari (Fixed in 15.4)
	const submitEventProto = (typeof SubmitEvent !== 'undefined') ? SubmitEvent.prototype : Event.prototype;
	if (!('submitter' in submitEventProto)) {
		Debug.log(`Loading Safari e.submitter polyfill`);
		loadStaticScript('/applications/core/interface/static/polyfill/safariSubmitter.js');
	}

	// Trigger [aria-expanded] on [popovertarget] triggers
	document.addEventListener('beforetoggle', popoverAriaExpanded, true);
	function popoverAriaExpanded(e){
		const popover = e.target;
		if (!popover.matches('[popover]')) return;
		document.querySelectorAll('[popovertarget="' + popover.id + '"]').forEach((t) => {
			t.setAttribute('aria-expanded', e.newState === 'open');
		});
	}

}(jQuery));