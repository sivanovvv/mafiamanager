/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.controller.js - Base controller handling
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";

	ips.createModule('ips.controller', function(){

		let _controllers = {},
			_autoMixins = {},
			_manualMixins = {},
			_mixins = {},
			_beingLoaded = [],
			_queue = {},
			_prototypes = {},
			instanceID = 1,
			_controllerCaseMap = {
				'core.front.core.autosizeiframe': 'core.front.core.autoSizeIframe'
			};

		/**
		 * Registers a controller
		 *
		 * @param	{string} 	id 			ID of this controller; used to auto-init on dom nodes
		 * @param	{object} 	definition 	Object containing the methods for the controller
		 * @returns {void}
		 */
		function register(id, definition) {
			_controllers[ id ] = definition;
			_checkQueue( id );
		}

		/**
		 * Returns boolean denoting whether a controller has been registered
		 *
		 * @param	{string} 	id 		ID of controller to check
		 * @returns 	{boolean}
		 */
		function isRegistered(id) {
			return _controllers[id] !== undefined;
		}

		/**
		 * Initializes controllers by looking at the dom tree for data-controller attributess
		 *
		 * @param	{element} 	node 		Root node to search in (defaults to document)
		 * @returns {void}
		 */
		function init() {
			// And also listen for the contentChange event
			$( document ).on('contentChange', function(e, newNode){
				initializeControllers( newNode );
			});

			// Do our initial search
			initializeControllers();
		}

		/**
		 * Registers a controller mixin
		 *
		 * @param 		{string} 	Controller ID this mixin works with
		 * @param 		{boolean} 	Automatically apply mixin to all instances of controller?
		 * @param 		{function} 	Function definition to apply
		 * @returns 	{void}
		 */
		function mixin(mixinName, controller, auto, mixinFunc) {
			if( (typeof auto === "function" ) ){
				mixinFunc = auto;
				auto = false;
			}

			var obj = ( auto ) ? _autoMixins : _manualMixins;
			
			if( obj[ controller ] === undefined ){
				obj[ controller ] = {};
			}

			obj[ controller ][ mixinName ] = mixinFunc;
		}

		/**
		 * Given a node, will find all controllers on the node, initialize the ones that are
		 * available, and instruct the others to be loaded remotely
		 *
		 * @param 		{jQuery}  [node] to initialize on
		 * @returns 	{void}
		 */
		function initializeControllers(node) {
			var controllers = _findControllers( node );
			var needsLoading = {};

			for( var controller in controllers ){

				// If the controller is already registered, we'll init it immediately
				if( isRegistered( controller ) ){
					for( var i = 0; i < controllers[ controller ].length; i++ ){
						
						var elem = controllers[ controller ][i]['elem'];
						var mixins = controllers[ controller ][i]['mixins'];

						initControllerOnElem( elem, controller, mixins );
					}
				// If not, we'll load it then init
				} else {
					needsLoading[ controller ] = controllers[ controller ];
				}
			}
			
			if( Object.keys( needsLoading ).length ){
				_loadControllers( needsLoading )
			}
		}

		/**
		 * Checks queued controllers to see if the given controller ID is needed
		 *
		 * @param 		{string} 	id 		Controller ID being checked
		 * @returns 	{void}
		 */
		function _checkQueue(id) {

			if( _queue[ id ] && _queue[ id ].length ){
				for( var i = 0; i < _queue[ id ].length; i++ ){
					initControllerOnElem( _queue[ id ][ i ]['elem'], id, _queue[ id ][ i ]['mixins'] );
				} 

				delete _queue[ id ];
			}

			if( ( _beingLoaded ).indexOf( id ) ){
				delete _beingLoaded[ ( _beingLoaded ).indexOf( id ) ];
			}
		}

		/**
		 * Loads the specified controllers, providing they aren't already being loaded
		 *
		 * @param 		{object} 	needsLoading 	Object of key/value pairs of controllers to load 
		 * @returns 	{void}
		 */
		function _loadControllers(needsLoading) {
			// Build include paths
			var filePaths = [];
			var deferred = $.Deferred();

			// CHeck whether our controllers are already being loaded
			for( var controller in needsLoading ){
				if( ( _beingLoaded ).indexOf( controller ) !== -1 ){
					delete needsLoading[ controller ];
					continue;
				}

				_beingLoaded.push( controller );
				filePaths.push( _buildFilePath( controller ) );
			}

			if( !Object.keys( needsLoading ).length ){
				// All are being loaded, so we're done here
				deferred.resolve();
				return deferred.promise();
			}

			// Add to the queue
			Object.assign( _queue, needsLoading );

			ips.loader.get( filePaths ).then( function () {
				deferred.resolve();
			});

			return deferred.promise();
		}

		/**
		 * Builds a controller file path from the provided controller ID
		 *
		 * @param 		{string} 	controllerName 	 Controller ID
		 * @returns 	{string}	File path
		 */
		function _buildFilePath(controllerName) {
			const bits = controllerName.split('.');

			// Get the URL for this controller
			// The URL will vary depending on whether we're in_dev or not.
			if( ips.getSetting('useCompiledFiles') === false ){
				// If we're in_dev, we can build the URL simply by appending the pieces of the controller ID
				return bits[0] + '/' + bits[1] + '/controllers/' + bits[2] +
						'/ips.' + bits[2] + '.' + bits[3] + '.js';
			} else {
				// If we're not indev, we need to locate the bundle the controller exists in
				try {
					let url;
					// Load from static folders if ipsApps
					if( ( ips.getSetting('ipsApps') ).indexOf( bits[0] ) !== -1 ) {
						url = ips.getSetting('baseURL') + 'static/js/' + bits[0] + '/' + bits[1] + '_' + bits[1] + '_' + bits[2] + '.js';
					} else {
						// Third party stuff
						url = ipsJsFileMap[bits[0]][bits[1] + '_' + bits[2]];
					}

					if (url.indexOf('?') != -1) {
						return url + '&v=' + ips.getSetting('jsAntiCache');
					} else {
						return url + '?v=' + ips.getSetting('jsAntiCache');
					}
				} catch (err) {
					Debug.log(err);
					return '';
				}
			}
		}

		/**
		 * Searches the provided node for any controllers specified on elements
		 *
		 * @param 		{element} 	node 	Optional node to search on. Defaults to document.
		 * @returns 	{object}	Found controllers, with the key being controller ID, value being array of elements
		 */
		function _findControllers(node) {
			// 02/03/16 - Allow either dom nodes or jquery objects here.
			// Previously only dom elements were allowed, which meant in most cases
			// we reverted to checking the whole document again, causing some odd behavior.
			if ( !(node instanceof Element) && !(node instanceof jQuery) ) {
				node = document;
			}

			var controllersToLoad = {};
				
			$( node ).find('[data-controller]').addBack().each( function (idx, elem){

				if( !$( elem ).data('_controllers') ){
					$( elem ).data('_controllers', []);
				}

				var controllerString = $( elem ).data('controller'),
					controllerList = $( elem ).data('_controllers');

				if( controllerString )
				{
					_getControllersAndMixins( controllerString );

					var controllers = _getControllersAndMixins( controllerString );

					// Loop through each controller on this element
					if( Object.keys( controllers ).length ){
						for (const [key, val] of Object.entries(controllers)){

							if( controllerList.length && ( controllerList ).indexOf( key ) !== -1 ){
								// Already initialized on this element
								continue;
							}

							if( controllersToLoad[ key ] ){
								controllersToLoad[ key ].push( { elem: elem, mixins: val } );
							} else {
								controllersToLoad[ key ] = [ { elem: elem, mixins: val } ];
							}
						};
					}
				}
			});
			
			return controllersToLoad;
		}

		/**
		 * Returns controllers and mixins found in the string
		 * Given <pre>controllerOne( mixin1; mixin2 ), controllerTwo, controllerThree</pre>, returns:
		 * <pre>
		 * {
		 * 	controllerOne: [ mixin1, mixin2 ],
		 *	controllerTwo: [],
		 * 	controllerThree: []
		 * }
		 * </pre>
		 *
		 * @returns 	{string}
		 */
		function _getControllersAndMixins(controllerString) {
			var controllers = {};
			var pieces = controllerString.split(',');

			for( var i = 0; i < pieces.length; i++ ){
				
				pieces[i] = pieces[i].trim();

				// Fix case issues on user-submitted content
				if( _controllerCaseMap[ pieces[i] ] !== undefined ){
					pieces[i] = _controllerCaseMap[ pieces[i] ];
				}

				if( pieces[i].indexOf('(') === -1 ){
					controllers[ pieces[i] ] = [];
					continue;
				}

				var p = pieces[i].match( /([a-zA-Z0-9.]+)\((.+?)\)/i );
				var mixinPieces = [];

				p[2].split(';').forEach(function (val) {
					mixinPieces.push( val.trim() );
				});

				controllers[ p[1] ] = mixinPieces;
			}

			return controllers;
		}

		/**
		 * Returns an incremental controller ID
		 * Controller IDs are used to enable controllers to identify events that they
		 * emitted themselves.
		 *
		 * @returns 	{string}
		 */
		function getInstanceID() {
			return 'ipscontroller' + (++instanceID);
		}

		/**
		 * Allows an element to be cleaned externally. If the element passed is not a controller scope,
		 * it'll search down one level of the DOM to find controllers.
		 *
		 * @param 	{element} 	elem 					The element to clean
		 * @param	{boolean}	[destroyWidgets]        Destroy the widgets along with the controllers?
		 *
		 * @returns {void}
		 */
		function cleanContentsOf(elem, destroyWidgets=true) {
			if (destroyWidgets) {
				ips.cleanContentsOf(elem)
				return;
			}

			Debug.log('Cleaning controllers from content');
			
			$( elem ).find('[data-controller]')
				.each( function () {
					var loopController = $( this );
					var controllers = loopController.data( '_controllerObjs' ) || [];

					if( controllers.length ){
						loopController.data('_controllerObjs', []);
						
						for( var i = 0; i < controllers.length; i++ ){
							controllers[i]._destroy.apply( controllers[i] );
							delete controllers[i];
						}
					}
				});
		}

		/**
		 * Initializes a controller instance by creating a new function, extending it with
		 * the controller methods then initializing it on the relevant dom node
		 *
		 * @param	{element} 	elem 			The element that will form the scope of this controller
		 * @param	{string} 	controllerID 	ID of this controller
		 * @returns {void}
		 */
		function initControllerOnElem(elem, controllerID, mixins) {

			if( !_controllers[ controllerID ] ){
				Debug.error("Controller '" + controllerID + "' has not been registered");
				return;
			}

			if( $( elem ).data('_controllers') === undefined ){
				$( elem ).data('_controllers', []);
			}

			$( elem ).data('_controllers').push( controllerID );

			if( _prototypes[ controllerID ] === undefined ){
				// Fetch our controller prototype
				_prototypes[ controllerID ] = getBaseController();
				// Extend with our specific controller methods
				$.extend( true, _prototypes[ controllerID ].prototype, _controllers[ controllerID ] );	
			}
			
			// And init
			if( $( elem ).data( '_controllerObjs' ) === undefined ){
				$( elem ).data( '_controllerObjs', [] );
			}

			var controllers = $( elem ).data( '_controllerObjs' );
			var obj = new _prototypes[ controllerID ](elem, controllerID);
			controllers.push( obj );

			// Any mixins?
			// Auto mixins first
			var _autoMixinsControllerID = _autoMixins[ controllerID ];
			if (_autoMixinsControllerID !== undefined && Object.keys(_autoMixinsControllerID).length) {
				Object.keys(_autoMixinsControllerID).forEach(function (key) {
					_autoMixins[ controllerID ][ key ].call( obj );
				});
			}

			// Then the manually-specified ones
			if( mixins.length ){
				for( var i = 0; i < mixins.length; i++ ){
					if( _manualMixins[ controllerID ] !== undefined && _manualMixins[ controllerID ][ mixins[i] ] !== undefined ){
						_manualMixins[ controllerID ][ mixins[i] ].call( obj );
					}
				}
			}

			if( (typeof obj.initialize === "function" ) ){
				// Don't stop all other controllers from initializing because of one bad controller
				try {
					obj.initialize.call(obj);
				} catch (e) {
					Debug.error(`Failed to setup the controller '${controllerID}' on an element`);
					Debug.error(e);
					$(elem).data('_controllerObj', controllers.filter(inst => inst !== obj));
					return;
				}
			}

			$( elem ).removeData( '_controller' + controllerID );
			
			$( document ).trigger( 'controllerReady', {
				controllerID: obj.controllerID,
				controllerType: obj.controllerType,
				controllerElem: elem
			});
		}

		/**
		 * Finds controllers within a node that have an ID matching the provided name
		 * Wildcard character * supported at the front or end of the controller parameter
		 *
		 * @param 		{string} 		controller 		Controller name to find
		 * @param 		{element} 		node 			Optional node to search in (document by default)
		 * @returns 	{function}
		 */
		function _findSubControllers(controller, node) {
			var results = [];

			node = ( node && ( (node.nodeType === 1) || node.jquery ) ) ? node : document;

			if( controller.indexOf('*') === -1 ){
				results = $( node ).find('[data-controller*="' + controller + '"]');
			} else {
				var pieces = controller.split('.');

				if( pieces[0] === '*' ){
					pieces.shift();
					results = $( node ).find('[data-controller$="' + pieces.join('.') + '"]');
				} else if( pieces[ pieces.length - 1 ] === '*' ){
					pieces.pop();
					results = $( node ).find('[data-controller^="' + pieces.join('.') + '"]');
				}
			}

			return results;
		}

		class BaseController {
			/**
			 * @type {jQuery}
			 */
			scope;

			/**
			 * @type {Element}
			 */
			elem;

			constructor(scope, type) {
				this.controllerType = type;
				this.controllerID = getInstanceID();
				this.scope = $( scope );

				// In 2023 and later, we use a native HTMLElement rather than a jQuery selector
				this.elem = this.scope.get(0);
				this._eventListeners = [];

				// Advice methods - inspired by http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/
				// and Twitter Flight
				const adviceFuncs = {
					before: function (baseFn, newFn) {
						return function () {
							newFn.apply(this, arguments);
							return baseFn.apply(this, arguments);
						};
					},
					after: function (baseFn, newFn) {
						return function () {
							const toReturn = baseFn.apply(this, arguments);
							newFn.apply(this, arguments);
							return toReturn;
						}
					},
					around: function (baseFn, newFn) {
						return function (...args) {
							args.unshift(baseFn.bind(this));
							return newFn.apply(this, args);
						}
					}
				};

				for (const [type, generator] of Object.entries(adviceFuncs)) {
					this[type] = (base, fn) => {
						if (!(this[base] instanceof Function)) {
							Debug.log( "Method '" + base + '" is not present in controller ' + this.controllerID );
						}

						this[base] = generator(this[base], fn)
					}
				}
			}

			/**
			 * Destroy this instance
			 * @private
			 */
			_destroy() {

				Debug.log( 'Destroyed instance ' + this.controllerID + ' of ' + this.controllerType );

				// Remove each event listener that was created in this controller
				if( this._eventListeners.length ){
					for( var i = 0; i < this._eventListeners.length; i++ ){
						var data = this._eventListeners[i];

						if( data['delegate'] ){
							data['elem'].off( data['ev'], data['delegate'], data['fn'] );
						} else {
							data['elem'].off( data['ev'], data['fn'] );
						}
					}
				}

				if( (typeof this.destroy === "function" ) ){
					this.destroy.call( this );
				}

				// Remove reference to scope so that GC can do its thing
				this.scope = null;
			}

			/**
			 * Clean the contents of this controller
			 */
			cleanContents() {
				Debug.log('Cleaning contents of controller');

				this.scope.find('[data-controller]')
					.each( function () {
						var loopController = $( this );
						var controllers = loopController.data( '_controllerObjs' ) || [];

						if( controllers.length ){
							loopController.data('_controllerObjs', []);

							for( var i = 0; i < controllers.length; i++ ){
								controllers[i]._destroy.apply( controllers[i] );
								delete controllers[i];
							}
						}
					});

				// Remove any widgets that exist in this elem
				ips.ui.destructAllWidgets( this.scope );
			}

			/**
			 * trigger an event
			 *
			 * @param {mixed} 		elem
			 * @param {string}		ev
			 * @param {object}		[data]
			 */
			trigger(...args) {

				let elem = ( !args[0] || (args[0].nodeType !== 1 && !args[0].jquery) ) ? this.scope : $(args.shift());
				let ev = args.shift();
				let data = args.shift() || {};

				// Add our origin to the event
				if( !data.stack ){
					data.stack = [];
				}

				data.stack.push( 'controllers.' + this.controllerType + '.' + this.controllerID );

				elem.trigger( ev, data );

			}

			/**
			 * Register an 'on' event
			 *
			 * @param elem
			 * @param ev
			 * @param delegate
			 * @param fn
			 */
			on(elem, ev, delegate, fn) {

				// Convert silly arguments object to an array
				var args = ips.utils.argsToArray( arguments );

				// Reconfigure our args as necessary
				elem = ( !(elem && elem.nodeType === 1) && elem != document && elem != window ) ? this.scope : $(args.shift());
				ev = args[0];
				fn = ( args.length == 3 ) ? args[2] : args[1];
				delegate = ( args.length == 3 ) ? args[1] : undefined;

				if( (typeof fn !== "function" ) ){
					Debug.warn("Callback function for " + ev + " doesn't exist in " + this.controllerType
						+ " (" + this.controllerID + ")");
					return;
				}

				// Bind our callback to the controller
				fn = fn.bind(this);

				// Set up the event
				if( delegate ){
					elem.on( ev, delegate, fn );
					this._eventListeners.push({
						elem: elem,
						event: ev,
						delegate: delegate,
						fn: fn
					});
				} else {
					elem.on( ev, fn );
					this._eventListeners.push({
						elem: elem,
						event: ev,
						fn: fn
					});
				}
			}

			/**
			 * Trigger an 'on' event that is registered by a controller nested inside this one. For example, say controller ips.foo.bar is inside this one and registered `this.on('baz', this.doStuff)`. To trigger this method directly, you'd call this.triggerOn('ips.foo.bar', 'baz', {...allTheData});
			 * @param 	{string} 	controller	The controller that we're targeting
			 * @param 	{string}	ev			The 'on' event.
			 * @param	{Object}	[data]
			 *
			 * @memberOf baseController
			 */
			triggerOn (controller, ev, data) {
				const toTrigger = _findSubControllers(controller, this.scope);

				if( !toTrigger.length ){
					return;
				}

				data = data || {};

				// Add our origin to the event
				if( !data.stack ){
					data.stack = [];
				}

				data.stack.push( 'controllers.' + this.controllerType + '.' + this.controllerID );

				toTrigger.trigger( ev, data );
			}
		}

		/**
		 * Returns a mock subclass of the basecontroller. An instance of this subclass will serve as the base for each controller
		 *
		 * @returns 	{function}
		 */
		function getBaseController() {
			class BaseControllerClone extends BaseController {}
			return BaseControllerClone
		}

		return {
			initControllerOnElem,
			register,
			mixin,
			isRegistered,
			init,
			cleanContentsOf
		};
	});

}(jQuery));
