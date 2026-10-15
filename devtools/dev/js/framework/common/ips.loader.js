/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.loader.js - Loader module
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";

	ips.createModule('ips.loader', function(){

		var _loadedScripts = [],
			_loadingScripts = [];

		const LOADER_STATES = {};

		/**
		 * Figures out the scripts that have already been inserted into the page
		 *
		 * @returns {void}
		 */
		var init = function () {
			var scripts = $('script[src][data-ips]');

			scripts.each( function () {
				var scriptInfo = ips.utils.url.getURIObject( $( this ).attr('src') );

				if ( scriptInfo.queryKey.src ){
					var paths = _getPathScripts( scriptInfo.queryKey.src );

					for (const value of paths){
						_loadedScripts.push( value );
					};
				} else if( scriptInfo.path.indexOf('interface/') !== -1 ) {
					var interfaces = _getInterfaceScript( scriptInfo.path );

					if( interfaces ){
						_loadedScripts.push( interfaces );
					}	
				} else {
					var other = _getOtherScript( scriptInfo.source );

					if( other ){
						_loadedScripts.push( other );
					}
				}
			});
		},

		/**
		 * Parses a script URL. If the script is local, returns the path from /applications/, otherwise, the whole url.
		 *
		 * @returns {string} 
		 */
		_getOtherScript = function (path) {
			path = path.replace( ips.getSetting('baseURL'), '' );

			if( path.startsWith('/') ){
				path = path.substring(1);
			}

			if( path.startsWith('applications/') ){
				path = path.replace(/^applications\//i, '')
			}

			return path;
		},

		/**
		 * Parses a script URL for the relative path to an interface script
		 *
		 * @returns {mixed} 	Path as a string if an interface file, or false if not
		 */
		_getInterfaceScript = function (path) {
			// Split the path
			var pieces = path.split('/').reverse().filter(Boolean);
			var path = [];

			for( var i = 0; i < pieces.length; i++ ){
				if( pieces[i] == 'interface' ){
					path.push('interface');
					path.push( pieces[ i+1 ] );
					break;
				}

				path.push( pieces[i] );
			}

			if( ( path ).indexOf( 'interface' ) !== -1 ){
				return path.reverse().join('/');
			}

			return false;
		},

		/**
		 * Splits a comma-separated list of paths into individual paths
		 *
		 * @returns {array}
		 */
		_getPathScripts = function (src) {
			return src.split(',').filter(Boolean);
		},

		/**
		 * Loads a script file. Calls the internal _doLoad method, wrapped in jQuery's when method for deferred
		 *
		 * @param 	{array} 	filePaths 	Array of relative file paths to load
		 * @returns {Promise}
		 */
		get = function (toLoad) {
			return $.when( _doLoad( [...new Set( toLoad )].filter(Boolean) ) );
		},

		/**
		 * Loads a script file remotely
		 *
		 * @param 	{array} 	filePaths 	Array of relative file paths to load
		 * @returns {$.Deferred}
		 */
		_doLoad = function (filePaths) {
			const deferred = $.Deferred();

			if( !Array.isArray( filePaths ) ){
				filePaths = [ filePaths ];
			}

			var done = [];
			var loading = [];
			var toLoad = [];

			// Step 1: Sort each file into done, loading or toLoad
			for( var i = 0; i < filePaths.length; i++ ){
				if( ( _loadedScripts ).indexOf( filePaths[ i ] ) !== -1 ){
					done.push( filePaths[ i ] );
					continue;
				}

				if( ( _loadingScripts ).indexOf( filePaths[ i ] ) !== -1 ){
					loading.push( filePaths[ i ] );
					continue;
				}

				toLoad.push( filePaths[ i ] );
			}

			// Step 2: If we've already loaded everything, short circuit and resolve the deferred
			if( done.length === filePaths.length ){
				deferred.resolve();
				return deferred.promise();
			}

			// Step 3: If we've got any files to watch (either loading, or toLoad), set an event handler
			if( loading.length || toLoad.length ){
				$( document ).on( 'scriptLoaded', function (e, files) {

					for( var i = 0; i < files.length; i++ ){
						if( ( filePaths ).indexOf( files[ i ] ) === -1 ){
							continue;
						}

						done.push( files[ i ] );
					}

					if( done.length === filePaths.length ){
						setTimeout( function () {
							deferred.resolve();	
						}, 100);						
					}
				});
			}

			// Step 4: Load the files that haven't been loaded yet
			// Split them into local and global files and do separate requests for each
			if( toLoad.length ){
				var localFiles = [];
				var remoteFiles = []

				for( var i = 0; i < toLoad.length; i++ ){
					if( toLoad[ i ].match( /^(http|\/\/)/i ) ){
						remoteFiles.push( toLoad[ i ] );
					} else {
						localFiles.push( toLoad[ i ] );
					}
				}

				if( localFiles.length ){
					_insertScript( localFiles );	
				}

				if( remoteFiles.length ){
					for( var i = 0; i < remoteFiles.length; i++ ){
						_insertScript( [ remoteFiles[ i ] ] );
					}
				}				
			}

			return deferred.promise();
		},

		/**
		 * Loads a script file via ajax
		 *
		 * @param 	{array} 	filePaths 	Array of file paths to load
		 * @param 	{boolean} 	[cached]	Whether to allow the browser to use a cached file (default: true)
		 * @returns {void}
		 */
		_insertScript = function (toLoad, cached) {

			// Add URLs to the loading array
			for( var i = 0; i < toLoad.length; i++ ){
				_loadingScripts.push( toLoad[ i ] );
			}

			Debug.log( "Loading: " + toLoad.join(', ') );

			// Figure out the URL
			var url = '';

			if( toLoad[0].match( /^(http|\/\/)/i ) ){
				url = toLoad[0].match( /^http/ ) ? toLoad[0].replace( /^.+?\/\/(.*)$/, '//$1' ) : toLoad[0];
			} else {
				url = ips.getSetting('jsURL') + '?src=' + encodeURIComponent( toLoad.join(',') );
			}

			// Now fetch the script(s) by calling our JS url.
			// On success, we add the script(s) to the _loadedScripts array, and trigger an event so that other methods are aware
			// And we always remove it from the _loadingScripts array when the ajax finishes.
			// In a settimeout so that this happens on the next tick.
			setTimeout( function () {
				$.ajax( {
					dataType: 'script',
					cache: ( cached === undefined ) ? true : cached,
					url: url,
					data: {
						antiCache: ips.getSetting('jsAntiCache'),
						csrfKey: null, // Ensure the CSRF key is empty when fetching JS
					}
				})
					.fail( function (jqXHR, textStatus, errorThrown) {
						Debug.error( "Failed to load: " + toLoad.join(', ') );
						Debug.log( textStatus );
					})
					.always( function () {
						for( var i = 0; i < toLoad.length; i++ ){
							var index = ( _loadingScripts ).indexOf( toLoad[ i ] );

							if( index !== -1 ){
								_loadingScripts.splice( index, 1 );
							}
						}
					})
					.done( function () {
						
						// Remove from loading, add to loaded
						for( var i = 0; i < toLoad.length; i++ ){
							_loadedScripts.push( toLoad[ i ] );
						}

						// Trigger event to let observers know
						$( document ).trigger( 'scriptLoaded', [ toLoad ] );
						Debug.log( "Loaded: " + toLoad.join(', ') );
					})
			}, 500);
			
		};

		return {
			init: init,
			get: get,
			/**
			 * Same as get, but loads the paths "statically".
			 *
			 * @param {string|string[]}	paths
			 * @return {Promise<Awaited<void>[]>}
			 */
			getStatic(paths) {
				if (!Array.isArray(paths)) {
					paths = [paths];
				}

				const uniquePaths = new Set();
				for (let path of paths) {
					if (path.startsWith('http://') || path.startsWith("https://")) {
						uniquePaths.add(path);
					} else {
						path = window.location.protocol + ips.getSetting('baseURL').replace(/\/+$/, '') + "/" + path.replace(/^\/+/, '');
						uniquePaths.add(path);
					}
				}

				return Promise.all([...uniquePaths].map(path => new Promise((resolve, reject) => {
					LOADER_STATES[path] = LOADER_STATES[path] || {
						state: 'unloaded',
						resolvers: new Set(),
						rejectors: new Set(),
						err: undefined,
					}

					const {state, resolvers,rejectors,err} = LOADER_STATES[path];
					if (state === 'loaded') {
						return resolve();
					}

					if (state === 'error') {
						return reject(err);
					}

					resolvers.add(resolve);
					rejectors.add(reject);

					if (state === 'unloaded') {
						LOADER_STATES[path].state = 'loading';
						const script = document.createElement('script');
						const url = new URL(path);
						url.updateSearchParams({
							param: 'antiCache',
							value: ips.getSetting('jsAntiCache')
						});
						script.src = url;
						script.addEventListener('load', () => {
							Debug.log(`Loaded static script ${path}`);
							LOADER_STATES[path].state = 'loaded';
							resolvers.forEach(resolver => resolver());
							resolvers.clear();
							rejectors.clear();
						}, {once: true});

						script.addEventListener('error', () => {
							LOADER_STATES[path].state = 'error';
							LOADER_STATES[path].err = new Error(`Failed to load ${path}`);
							Debug.error(LOADER_STATES[path].err);
							rejectors.forEach(rejector => rejector(LOADER_STATES[path].err));
							rejectors.clear();
							resolvers.clear();
						}, {once: true});

						document.body.appendChild(script);
					}
				})));
			}
		}
	});
}(jQuery));