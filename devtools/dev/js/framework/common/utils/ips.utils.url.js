/**
 * Invision Community
 * @copyright Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.url.js - A module for getting query params from the URL
 */

;( function($, _){
	"use strict";
	
	ips.createModule('ips.utils.url', function () {
		
		/**
		 * Returns the requested parameter from the URL
		 *
		 * @param 	{string} 	name 	Parameter to return
		 * @param 	{string} 	[url] 	Url to parse (uses current url if none specified)
		 * @returns {string|undefined}
		 *
		 * @deprecated
		 * @todo we can replace pretty much all usages of this with (new URL(url||'', location.href)).searchParams.get(name)
		 */
		function getParam(name, url) {
			return parseUri( url || window.location.href ).queryKey[ name ];
		}
		
		/**
		 * Returns the page number from the URL
		 *
		 * @param 	{string} 	param 	Parameter to return
		 * @param 	{string|URL} 	[url] 	Url to parse (uses current url if none specified)
		 *
		 * @returns {number}
		 */
		function getPageNumber(param, url='') {
			const urlObj = url instanceof URL ? url : new URL(url, location.href);
			if (param === 'page') {
				const regex = /\/page\/(\d+)(?:\/|$)/;

				// is the FURL inside the search params component?
				if (urlObj.pathname.includes('/index.php')) {
					/** @todo if someone names a custom page index.php, but isn't using the rewrite URLs option, it will break this logic because index.php is a valid path component. That said, it's probably not worth considering a method to rewrite this. A better solution is likely just checking the first param, and ensuring that the FURL path is always the first component in the search params
					 */
					for (let [key, value] of urlObj.searchParams.entries()) {
						let match;
						if (!value && (match = key.match(regex)) && match) {
							return parseInt(match[1]);
						}
					}
				} else {
					// check this is defined
					let match;
					if ((match = urlObj.pathname.match(regex)) && match) {
						return parseInt(match[1]);
					}
				}
			}
			
			const page = parseInt(urlObj.searchParams.get(param) || "1");
			return Number.isNaN(page) ? 1 : page;
		}

		/**
		 * Moves site.com/forums/topic/123-foo/?page=4&sort=foo to site.com/forums/topic/123-foo/page/4/?sort=foo
		 *
		 * @param 	{string} 	url 		URL
		 * @param 	{string} 	name 		Page param to use
		 * @param 	{string|number} 	number 		Page number
		 *
		 * @returns {string}	new URL as a string
		 */
		function pageParamToPath(url, name, number) {
			const urlObj = new URL(url||"", location.href);
			number = parseInt(number);
			if (isNaN(number)) {
				Debug.warn(`Setting the page param in the pageThe number parameter`);
				number = 1;
			}

			removeParam(name, urlObj);

			// regex to find the /page/<number>/ component in the path. todo \d+ might need to actually be \d*; the v4 code used \d+? but +? only matches if there's at least one; I think the intention was \d*, so /page//rest/of/url would be found just in case
			const regex = new RegExp(`(^.*)(\\/${name.replaceAll('\\', '\\\\')}\\/\\d+)($|\\/.*$)`);
			const pageEnding  = number > 1 ? `/${name}/${number}` : '';
			if (urlObj.pathname.includes("/index.php")) {
				const params = {
					[name]: number > 1 ? number.toString() : null, // just in case no path is in the search string, we set this as a query param directly
				};
				for (const [key,value] of urlObj.searchParams.entries()) {
					if (value) {
						continue;
					}

					if (key.startsWith('/')) {
						delete params[name];
						const newPath = key.match(pageEnding) ? key.replace(regex, `$1${pageEnding}$3`) : key.replace(/\/$/, '') + pageEnding + '/';
						removeParam(key, urlObj);
						const currentSearch = urlObj.search.replace(/^\?/, '')
						urlObj.search = '?' + newPath + (currentSearch ? `&${currentSearch}` : '');
						break;
					}
				}

				if (Object.keys(params).length) {
					urlObj.updateSearchParams({params});
				}
			} else {
				// is it in the path?
				urlObj.pathname = urlObj.pathname.match(regex) ? urlObj.pathname.replace(regex, `$1${pageEnding}$3`) : urlObj.pathname.replace(/\/$/, '') + pageEnding + '/';
			}

			return urlObj.toString();
		}

		/**
		 * Strips the requested parameter from the URL and returns the URL
		 *
		 * @param 	{string} 	name 	Parameters to strip
		 * @param 	{string|URL} 	[url] 	Url to parse (uses current url if none specified)
		 *
		 * @returns {string}
		 * @note This is just a shortcut to removeParams
		 */
		function removeParam (name, url) {
			return removeParams( [ name ], url );
		}

		/**
		 * Strips the requested parameters from the URL and returns the URL
		 *
		 * @param 	{array} 	name 	Parameters to strip
		 * @param 	{string|URL} 	[url] 	Url to parse (uses current url if none specified)
		 *
		 * @returns {string}
		 */
		function removeParams(name, url) {
			if (typeof url === 'string') {
				url = new URL(url, location.href);
			}
			if (!(url instanceof URL)) {
				url = new URL(window.location.href);
			}

			const paramList = new Set([...name, ...name.map(name=>encodeURIComponent(name))]);
			let search = (url.search || "")
				.replace(/^\?/, "")
				.split('&')
				.filter(component => !paramList.has(component.split('=',2)[0]))
				.join('&');

			url.search = search.length ? "?" + search : "";
			return url.href;
		}
		
		/**
		 * Rebuilds a parseUri object back into a URL string
		 * @todo the URL standard has been a web standard for almost a decade now; we should be able to remove all usages of this and just use the native string cast URL.prototype.toString()
		 * @deprecated
		 *
		 * @param 	{parseUriObject} 	[uriObject] 	Result of parseUri
		 * @returns {string}
		 */
		function rebuildUriObject(uriObject) {
			let returnUrl = uriObject.protocol + '://' + uriObject.host + ( ( uriObject.port !== '' ) ? ':' + uriObject.port : '' ) + uriObject.path;

			if( Object.keys( uriObject.queryKey ).length )
			{
				var qsParam = '?';

				for (const [key, value] of Object.entries( uriObject.queryKey )){
					if( value )
					{
						returnUrl = returnUrl + qsParam + key + '=' + value;
					}
					else
					{
						// This is here for older style furls, e.g. /index.php?/app/path/ so that we don't end up with /index.php?/app/path/=
						returnUrl = returnUrl + qsParam + key;
					}
					qsParam = '&';
				}
			}

			return returnUrl;
		}

		/**
		 * Returns the parsed URL object from parseUri
		 * @deprecated
		 * @todo this method returns an object from the old polyfilled parseUri function. We need to remove all usages of it, and simply use `new URL()` and `window.location` instead.
		 *
		 *
		 * @param 	{string} 	[url] 	Url to parse (uses current url if none specified)
		 * @returns {parseUriObject}
		 */
		function getURIObject(url) {
			return parseUri( url || window.location.href );
		}


		let _origin;
		/**
		 * Returns an origin for use in window.postMessage. Note that this value is instantiated when the method is first invoked, then never updated again.
		 * @deprecated
		 * @todo any usages of this should be replaceable with location.origin directly
		 *
		 * @returns {string}
		 */
		function getOrigin() {
			if (!_origin) {
				_origin = location.origin;
			}
			
			return _origin;
		}

		/**
		 * @typedef {{
				[key: "source"|"protocol"|"authority"|"userInfo"|"user"|"password"|"host"|"port"|"relative"|"path"|"directory"|"file"|"query"|"anchor"] : string,
				queryKey: {[p:string]: string}
			 }}	parseUriObject
		 *
		 */

		/**
		 * parseUri 1.2.2
		 * Parses a string into a parseUriObject
		 *
		 * @deprecated
		 * @todo URL interface has been web standard for well over a decade, and a lot URL dependent JS will break anyway without supporting it. Usages of this method need to be removed in favor of the native URL object. Obviously, we cannot write to the URL.prototype.searchParams object, however it is very useful, performant, and guaranteed to parse URLs accurately
		 *
		 *
		 * @param {string}	 str
		 *
		 * @returns {parseUriObject}
		 *
		 * @copyright Steven Levithan <stevenlevithan.com>
		 * @license MIT License
		 */
		function parseUri (str) {
			let o, uri;
			// If we have the modern 'URL' API, use that definitely
			if( 'URL' in window ) {
				try {
					// Fix protocol-relative URLs as the URL API does not like them
					if( str.indexOf('//') === 0 )
					{
						str = location.protocol + str;
					}

					o = new URL( str );

					// We need to reformat the returned URL object keys
					uri = {
						'source': o.href,
						'protocol': o.protocol.substring( 0, ( o.protocol.length - 1 ) ),
						'userInfo': ( o.username ? o.username : '' ) + ( ( o.username && o.password ) ? ':' : '' ) + ( o.password ? o.password : '' ),
						'user': o.username,
						'password': o.password,
						'host': o.hostname,
						'port': o.port,
						'relative': o.pathname + ( o.search ? o.search : '' ),
						'path': o.pathname,
						'directory': '',  // The URL class does not give us just the path
						'file': '',  // The URL class does not give us just the filename
						'query': o.search.substring(1),
						'anchor': o.hash,
						'queryKey': {}
					};

					// Set the authority using shortcuts we just set
					uri.authority = uri.userInfo + ( uri.userInfo ? '@' : '' ) + uri.host;

					// Set the queryKey object
					o.searchParams.forEach( function( v, k ) {
						uri.queryKey[ k ] = v;
					});

					// Figure out the path and file
					var urlBits		= uri.path.split('/');
					uri.file		= urlBits.pop();
					uri.directory	= urlBits.join('/');

					return uri;
				} catch( err ) {
					// If it failed, likely due to a bad URL, we can let the older polyfill take a stab at it - but log it so we know.
					Debug.log( "Failed to parse URL: " + str + " ; " + err );
				}
			}

			o   = parseUri.options;
			uri = {};
			const m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
			let i = 14;

			while (i--) uri[o.key[i]] = m[i] || "";

			uri[o.q.name] = {};
			uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
				if ($1) uri[o.q.name][$1] = $2;
			});

			return uri;
		}

		parseUri.options = {
			strictMode: false,
			key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
			q:   {
				name:   "queryKey",
				parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
			parser: {
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		};

		/**
		 * @typedef SetParamsOptions
		 * @property {Object<string,string|null>}    	[params={}]        		The params to set on the URL. Alternatively, just one param can be updated using the `param` and `value` options. Each value should be either a string or null; null indicates this parameter should be removed from the URL
		 * @property {string}    						[param]					Optional: you can pass just this and a value if you only need to update one param
		 * @property {string|null}    					[value='']				When updating only one param, use this as the value. If the value is NULL, the param will be deleted.
		 * @property {boolean}    						[encode=true]    		whether to encode the param and value
		 * @property {boolean}    						[removeCurrent=true]    whether to remove existing occurrences of this param in the URL
		 */

		/**
		 * Update the search params of this URL without damaging FURL paths existing in the search query. The URL is returned for optional chaining
		 *
		 * @param {SetParamsOptions|string} options			Either options to update the URL or a param and optional value to update
		 * @param {string|null}				[value]			If the first param is a string and this is set, it will use the second argument as the value.
		 *
		 * @return {URL}
		 */
		URL.prototype.updateSearchParams = function({params={}, param, value="", encode=true, removeCurrent=true}) {
			if (typeof arguments[0] !== 'object') {
				if (typeof arguments[0] !== 'string') {
					throw new TypeError('The first argument must be either an object of options or a string denoting the param');
				}
				param = arguments[0];
				if (arguments.length > 1) {
					value = arguments[1];
				}
			}

			if (typeof param === 'string') {
				params[param] = value !== null ? value : "";
			}

			const paramsToRemove = [];
			let newParamComp = '';
			for (const k of Object.keys(params)) {
				if (params[k] !== null) {
					// todo maybe include some logic to handle array params; for now it isn't needed though
					try {
						params[k] = `${params[k]}`; // use this to cast to a string. This also allows values like false and undefined to become strings, though it could lead to unintended consequences
					} catch (e) {
						Debug.warn(new TypeError(`Could not convert the value for the param ${k} into a string, so the param is being set to an empty string instead`));
						params[k] = '';
					}
				}

				if (typeof params[k] !== "string") {
					paramsToRemove.push(k);
					delete params[k];
					continue;
				} else if (removeCurrent) {
					paramsToRemove.push(k);
				}
				const key = encode ? encodeURIComponent(k) : k;
				const value = encode ? encodeURIComponent(params[k]) : params[k];
				newParamComp += `${key}=${value}&`
			}
			newParamComp = newParamComp.replace(/&$/, '');

			if (paramsToRemove.length) {
				removeParams(paramsToRemove, this);
			}

			const search = (this.search || "").replace(/^\?/, "");
			if (search || newParamComp) {
				this.search = "?" + search + (search.length && newParamComp.length ? `&` : '') + newParamComp;
			} else {
				// no remaining search params NOR new ones? remove the search
				this.search = "";
			}

			return this;
		};
	
		return {
			getPageNumber,
			getParam,
			removeParam,
			removeParams,
			getURIObject,
			getOrigin,
			rebuildUriObject,
			pageParamToPath,
		};
	});
}(jQuery));