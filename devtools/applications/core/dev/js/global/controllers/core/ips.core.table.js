/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.table.js - Basic table controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.table', {

		_urlParams: {},
		_baseURL: '',
		_otherParams: [],
		_pageParam: 'page',
		_updateURL: true,
		_currentPage: 1,
		_seoPagination: false,
		_initialURL: '',
		_ajax: null,

		initialize: function () {
			this.on( 'paginationClicked paginationJump', this.paginationClicked );
			this.on( 'refreshResults', this.refreshResults );
			this.on( 'buttonAction', this.buttonAction );
			this.on( 'click', '[data-action="tableFilter"]', this.changeFiltering );
			this.on( 'menuItemSelected', '[data-role="tableFilterMenu"]', this.changeFilteringFromMenu );
			this.on( 'click', 'tr[data-tableClickTarget]', this.rowClick );

			this.setup();
		},

		setup: function () {
			if( this.scope.attr('data-pageParam') && this.scope.attr('data-pageParam') != 'page' ){
				this._pageParam = this.scope.attr('data-pageParam');
			}

			this._otherParams.push( this._pageParam );
			this._baseURL = this.scope.attr('data-baseurl');
			const safeURL = [...(new TextEncoder()).encode(this.scope.attr('data-baseurl') ? ips.utils.url.pageParamToPath(this._cleanUpURL(this.scope.attr('data-baseurl')), this._pageParam, 1) : '')]
				.map(char => String.fromCodePoint(char))
				.join('');

			this._stateKey = `table${btoa(safeURL)}`;
			this._originalBaseURL = this._baseURL;
			this._currentPage = ips.utils.url.getPageNumber( this._pageParam, window.location.href );
			this._cleanUpBaseURL();

			if( this._baseURL.match(/\?/) ) {
				if( this._baseURL.slice(-1) != '?' ){
					this._baseURL += '&';
				}
			} else {
				this._baseURL += '?';
			}

			this._urlParams = this._getUrlParams();
			this._urlParams[ this._pageParam ] = parseInt(this._currentPage);
			this._initialURL = window.location.href;

			if( this.scope.closest('[data-disableTableUpdates]').length ){
				this._updateURL = false;
			}

			// Replace the current state to store our params object. Probably redundant at this point but may as well cover our bases
			if (!(this._stateKey in ips.utils.history.getState())) {
				ips.utils.history.replaceState({...this._urlParams, controller: this.controllerID}, this._stateKey, window.location.href);
			}

			this.on( window, `historychange:${this._stateKey}`, this.stateChange );

			/* Data Layer Stuff */
			try {
				if ( IpsDataLayerConfig && !window.IpsDataLayerConfig ) {
					/* Data Layer Page Number Property */
					this.scope.find( '[data-role="tablePagination"] [data-page]' ).on('click', function (e) {
						let target = e.currentTarget;
						if ( target.parentNode.classList.contains('ipsPagination_active') ) {
							return;
						}
						let page = Number( e.currentTarget.dataset['page'] );

						if ( isNaN(page) ) return;

						$('body').trigger('ipsDataLayerProperties', { _properties: {page_number: page} });
					});
				}
			} catch (e) {}
		},

		/**
		 * Responds to state changes triggered by user navigation OR by programmatically pushing a new state (URL changes without redirecting)
		 *
		 * @returns {void}
		 */
		stateChange(e) {
			if (e.detail?.type === 'replace') {
				return
			}

			const data = {
				...this._urlParams,
				...(ips.utils.history.getState(this._stateKey) || {})
			}

			// make sure there are actual changes
			if (!Object.keys(this._filterParamsForChanges(data)).length) {
				return;
			}

			e.stopImmediatePropagation?.()
			e.stopPropagation?.()

			// This must be called BEFORE the state changes are applied to the current url params
			this._handleStateChanges({data, url: window.location.href, title: document.title});

			// Update data
			this._urlParams = {...data}
			delete this._urlParams.bypassStateAdjustment

			// Gallery for instance stores a state change when closing the lightbox to adjust the URL, but this should not cause the table to reload
			if (data.bypassStateAdjustment) {
				return;
			}
			this._getResults();
		},

		/**
		 * Refresh table contents
		 *
		 * @returns {void}
		 */
		buttonAction: function () {
			this._getResults();
		},

		/**
		 * Refresh table contents
		 *
		 * @returns {void}
		 */
		refreshResults: function () {
			this._getResults();
		},

		_filterParamsForChanges(params) {
			const out = {};
			for (const k in params) {
				if (['controller'].includes(k)) {
					continue
				}

				if (!(params[k] || this._urlParams[k])) {
					continue;
				}

				if (k === this._pageParam && parseInt(params[k]) !== parseInt(this._urlParams[k])) {
					out[this._pageParam] = parseInt(params[k])
				} else if (params[k] != this._urlParams[k]) {
					out[k] = params[k]
				}
			}
			return out;
		},

		/**
		 * Update the current URL
		 *
		 * @param	{Object} 	newParams 		New values to use in the search
		 * @returns {void}
		 */
		updateURL(newParams) {
			// Only update if there are actual changes
			newParams = this._filterParamsForChanges(newParams)
			if (!Object.keys(newParams).length) {
				return;
			}

			const tmpStateData = {...this._urlParams, ...newParams, controller: this.controllerID};
			let newUrl			= (this._baseURL + this._getURL(tmpStateData)).replace(/^([^?]*)?$/, '$1').replace(/&$/, '');

			if (this._seoPagination) {
				newUrl = ips.utils.url.pageParamToPath( newUrl, this._pageParam, newParams[ this._pageParam ] );
			}
			ips.utils.history.pushState(tmpStateData, this._stateKey, newUrl);
		},

		/**
		 * Event handler for pagination widget
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data	Event data object
		 * @returns {void}
		 */
		paginationClicked (e, data) {
			e.stopPropagation?.();
			e.stopImmediatePropagation?.();

			data.originalEvent?.preventDefault()

			this._seoPagination = data.seoPagination;
			this.updateURL({
				[this._pageParam]: parseInt(data.pageNo)
			});
		},

		/**
		 * Event handler for choosing a new filter
		 *
		 * @param	{Event} 	e 		Event object
		 * @returns {void}
		 */
		changeFiltering(e) {
			e.preventDefault();

			let newTableFilter = $(e.currentTarget).attr('data-filter');

			if(newTableFilter){
				this.updateURL( {
					filter: newTableFilter,
					[this._pageParam]: 1
				});
			}
		},


		/**
		 * Updates element classnames for filtering
		 *
		 * @param	{string} 	newFilter 		Filter ID of new filter to select
		 * @returns {void}
		 */
		_updateFilter(newFilter) {
			// This space left intentionally blank, is overridden by the admin mixin, data layer mixin, and possibly 3rd party mixins
		},

		/**
		 * Updates the sorting order classnames
		 *
		 * @param 	{Object}	data
		 * @param 	{string} 			data.by 			Key name of sort by value
		 * @param 	{'asc'|'desc'} 		data.direction		asc or desc order value
		 *
		 * @returns {void}
		 */
		_updateSort(data) {
			// left intentionally blank, used by mixins and 3rd party code to do things
		},

		/**
		 * Called after the page is updated
		 *
		 * @param	{number} 	newPage 		New active page number
		 * @returns {void}
		 */
		_updatePage(newPage) {
			if (newPage === this._currentPage) {
				return;
			}
			// scroll to the top of the box
			const boundingBox = this.scope.get(0).getBoundingClientRect();
			let padding = parseInt(ips.getSetting('tableScrollTopPadding'));
			if (!Number.isInteger(padding)) {
				padding = 30;
			}

			if (boundingBox.top < padding) {
				window.scrollBy({top: boundingBox.top - padding, behavior: 'smooth'});
			}

			this._currentPage = newPage;
		},

		/**
		 * Event handler for choosing a new filter from a dropdown menu
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		changeFilteringFromMenu(e,data = e.detail) {
			data.originalEvent?.preventDefault();
			if (!('selectedItemID' in data)) {
				return;
			}

			this.updateURL( {
				filter: data.selectedItemID,
				[this._pageParam]: 1
			});
		},

		/**
		 *
		 * @param url
		 * @return {string}
		 * @private
		 */
		_cleanUpURL(url) {
			const urlObj = ips.utils.url.getURIObject(url);
			const params = { ...urlObj.queryKey };

			url = urlObj.protocol + '://' + urlObj.host + ( urlObj.port ? ( ':' + urlObj.port ) : '' ) + urlObj.path + '?';

			// If we're using friendly URLs *without* rewriting, we need to
			if( urlObj.file === 'index.php' ){
				let hasFURL = false;
				for (const key of Object.keys(params)) {
					if (key.startsWith('/') ) {
						hasFURL = true;
						url += encodeURIComponent( key ).replace( /%2f/ig, '/' ); // We don't want '/' being encoded or it breaks URLs
						delete params[ key ];
					}
				}

				if (hasFURL) {
					url += '&';
				}
			}

			// Remove our default URL params
			for (const param of ['sortby', 'sortdirection', 'filter', ...this._otherParams]) {
				delete params[param]
			}

			// Decode params as $.param() will encode it again (double encode)
			for (const [k, v] of Object.entries(params)){
				delete params[k];
				params[ decodeURIComponent( k ).replace( /\+/g, ' ') ] = v.replace(/\+/g, ' ');
			};

			// When using index.php? URLs, a param key is the path /forums/2-forum/ but as the value is empty, params.length returns false
			if( Object.keys( params ).length !== 0 ){
				url += decodeURIComponent( $.param( params ) );
			}

			// If the last character is & or ?, we can remove that because it'll be added back later
			url = url.replace(/[?&]$/, '')

			return url;
		},

		/**
		 * Cleans the base url of our default params
		 *
		 * @returns {void}
		 */
		_cleanUpBaseURL() {
			this._baseURL = this._cleanUpURL(this._baseURL);
		},

		/**
		 * Checks whether any values in the provided state are different and need updating; called by stateChange before the new state is applied
		 *
		 * @param 	{Object} 	state 	State from ips history
		 * @param 	{Object}	state.data	 	The state actually stored in the history object
		 * @param 	{string}	state.url		The URL of the table, in almost all cases, it should be the same as window.location.href
		 * @param 	{string}	state.title		The title of the document. Like the url, it is virtually always the same as window.location.href
		 * @returns {void}
		 */
		_handleStateChanges(state) {
			// See what's changed so we can update the display
			if ('filter' in state.data && state.data.filter != this._urlParams.filter) {
				this._updateFilter(state.data.filter);
			}

			for (const field of ['sortby', 'sortdirection']) {
				if (field in state.data && state.data[field] != this._urlParams[field]) {
					this._updateSort({
						by: state.data.sortby,
						order: state.data.sortdirection
					})
					break;
				}
			}

			if (this._pageParam in state.data && state.data[this._pageParam] != this._urlParams[this._pageParam]) {
				this._updatePage(parseInt(state.data[this._pageParam]))
			}
		},

		/**
		 * Fetches new results from the server, then calls this._updateTable to update the
		 * content and pagination. Simply redirects to URL on error.
		 *
		 * @param {string|undefined}		[forceURL]		Optional: A url to get the table contents from
		 *
		 * @returns {void}
		 */
		_getResults(forceURL) {
			const urlBits = this._getURL();
			let url = '';

			try {
				if( this._ajax && (typeof this._ajax.abort === "function" ) ){
					this._ajax.abort();
					this._ajax = null;
				}
			} catch(err) {}

			// Figure out which URL we should be using
			if( forceURL ){
				url = forceURL;
			} else {
				if(urlBits) {
					url = this._baseURL + this._getURL() + '&';
				} else {
					url = this._baseURL;
				}

				// If SEO pagination is enabled, we need to include the page in the URL and then
				// append other URL bits.
				if ( this._seoPagination ) {
					url = ips.utils.url.pageParamToPath( url, this._pageParam, this._urlParams[ this._pageParam ] );
				}
			}

			if (this.scope.attr('data-resort') !== undefined) {
				url += `${url.includes('?') ? '&' : '?'}${this.scope.attr('data-resort')}=1`;
			}
			url = url.replaceAll( /\+/g, '%20');

			this._ajax = ips.getAjax()( url , {
				dataType: 'json',
				showLoading: this._showLoading()
			})
				.done(response => this._getResultsDone(response))
				.fail((jqXHR, textStatus, errorThrown) => this._getResultsFail(jqXHR, textStatus, errorThrown, url))
				.always((...args) => this._getResultsAlways(...args));
		},

		/**
		 * Should the default loading throbber be used?
		 *
		 * @returns {boolean}
		 */
		_showLoading() {
			return true;
		},

		/**
		 * Callback when the results ajax is successful
		 *
		 * This is intentionally just a wrapper, but it is overridden by third party code and other mixins
		 *
		 * @param	{Object} 	response 		JSON object containing new HTML pieces
		 * @returns {void}
		 */
		_getResultsDone(response) {
			this._updateTable( response );
		},

		/**
		 * Callback when the results ajax fails
		 *
		 * @param 	{object} 	jqXHR			jQuery XHR object
		 * @param	{string} 	textStatus		Error message
		 * @param 	{string}	errorThrown
		 * @returns {void}
		 */
		_getResultsFail: function (jqXHR, textStatus, errorThrown, url) {
			if( Debug.isEnabled() || textStatus == 'abort' ){
				Debug.error( `Ajax request to '${url}' failed (` + textStatus + "): " + errorThrown );
				Debug.error( jqXHR.responseText );
			} else {
				// rut-roh, we'll just do a manual redirect
				window.location = this._baseURL + this._getURL();
			}
		},

		/**
		 * Update the content and pagination elements
		 *
		 * @param	{object} 	response 		JSON object containing new HTML pieces
		 * @returns {void}
		 */
		_updateTable (response) {
			const rows = this.scope.find('[data-role="tableRows"]');
			const pagination = this.scope.find('[data-role="tablePagination"]');
			const extra = this.scope.find('[data-role="extraHtml"]');
			const autoCheck = this.scope.find('[data-ipsAutoCheck]');

			// Check the required elements are in the page
			if (!rows.length) {
				const url = this._baseURL + this._getURL();
				if (url === window.location.href) {
					window.location.reload();
				} else {
					window.location.href = url;
				}
				return;
			}

			// Table body
			ips.cleanContentsOf(rows)
			rows.html( response.rows ).trigger('tableRowsUpdated');

			// Pagination
			// If there's pagination content to show, make sure pagination container is shown
			pagination
				.toggle( ( response.pagination && response.pagination.trim() !== "" ) || pagination.attr('data-showEmpty') !== undefined )
				.html( response.pagination || "" )
				.trigger('tablePaginationUpdated');

			// Extra
			extra.html( response.extraHtml );
			// Autocheck
			autoCheck.trigger('refresh.autoCheck');

			// New content loaded, so trigger contentChange event
			this.scope.get(0)
				.querySelectorAll(':scope > *')
				.forEach(
					child => $(document).trigger('contentChange', [$(child)])
				)

			/* Data Layer page property */
			try {
				if ( IpsDataLayerConfig && !window.IpsDataLayerConfig ) {
					this.scope.find( '[data-role="tablePagination"] [data-page]' ).on('click', function (e) {
						let target = e.currentTarget;
						if ( target.parentNode.classList.contains('ipsPagination_active') ) {
							return;
						}
						let page = Number( e.currentTarget.dataset['page'] );

						if ( isNaN(page) ) return;

						$('body').trigger('ipsDataLayerProperties', { _properties: {page_number: page} });
					});
				}
			} catch (e) {}
		},

		/**
		 * Builds a param string from values in this._urlParams, excluding empty values
		 *
		 * @returns {object}	[params]	Param object
		 */
		_getURL(params) {

			params = params || this._urlParams

			const tmpUrlParams = {};

			for (const i in params) {
				if (['', 'controller', 'app', 'module', 'bypassState'].includes(i) || (i === this._pageParam && parseInt(params[i]) === 1) || !params[i]) {
					continue
				}
				tmpUrlParams[ i ] = params[i];
			}

			return $.param(tmpUrlParams);
		},

		/**
		 * Returns current parameters to be used in URLs
		 *
		 * @returns {object}
		 */
		_getUrlParams: function () {
			var sort = this._getSortValue();
			var obj = {
				filter: this._getFilterValue() || '',
				sortby: sort.by || '',
				sortdirection: sort.order || '',
			};

			obj[ this._pageParam ] = ips.utils.url.getParam( this._pageParam ) || 1

			return obj;
		},

		/**
		 * Event handler for clicking a clickable row
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		rowClick: function (e) {
			var target = $( e.target );

			// Ignore if we clicked something clickable (besides the row)
			if ( target.is('a') || target.is('button') || target.is('i') || target.is('input') || target.is('textarea') || target.is('code') || target.closest('a').length || target.closest('.ipsMenu').length ) {
				return;
			}

			// Ignore if we didn't use the left mouse button. 1 is left mouse button, 2 is middle
			// We allow 2 through here because we'll treat it differently shortly
			if( e.which !== 1 && e.which !== 2 ){
				return;
			}

			// Ignore if special keys are pressed
			if( e.altKey || e.shiftKey ){
				return;
			}

			// If we clicked into a cell with a checkbox, check that checkbox rather than redirect
			if ( target.is('td') ) {
				var checkbox = target.find('input[type="checkbox"]');
				if ( checkbox.length ) {
					checkbox.prop( 'checked', !checkbox.prop( 'checked' ) );
					return;
				}
			}

			var link = $( e.currentTarget )
				.find('[data-ipscontrolstrip]').parent()
				.find( '[data-controlStrip-action="' + $( e.currentTarget ).attr('data-tableClickTarget') + '"]' );

			// If we are using the meta key or middle mouse button, we're going to adjust the link
			// to include _blank, so that it opens in a new tab
			if( e.metaKey || e.ctrlKey || e.which == 2 ){
				link.attr('target', '_blank');
				link.get(0).click();
				link.attr('target', '');
			} else {
				// Okay, we can go...
				link.get(0).click();
			}
		},


		/**
		 * Abstract
		 */
		_getSortValue: $.noop,
		_getFilterValue: $.noop,
		_getResultsAlways: $.noop
	});
}(jQuery));