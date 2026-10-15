/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.search.main.js - Main search JS controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.search.main', {

		_content: null,
		_formData: {},
		_loadingDiv: null,
		_initialURL: '',
		_initialData: {},

		initialize() {
			this.on( 'initialData.search', this.initialData );
			this.on( 'formSubmitted.search', this.submittedSearch );
			this.on( 'paginationClicked paginationJump', this.paginationClicked );

			// Primary event that watches for URL changes
			this.on( window, 'historychange:search', this.stateChange);
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup() {
			this._content = this.scope.find('#elSearch_main');
			this._baseURL = this.scope.attr('data-baseURL');

			if ( this._baseURL.match(/\?/) ) {
				this._baseURL += '&';
			} else {
				this._baseURL += '?';
			}

			// If the last character is &, we can remove that because it'll be added back later
			if( this._baseURL.slice(-1) === '&' ){
				this._baseURL = this._baseURL.slice( 0, -1)
			}

			this._initialURL = window.location.href;
		},

		/**
		 * Filters have sent up their initial data
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		initialData(e, data) {
			this._formData = this._getFormData( data.data );
			this._initialData = { ...this._formData };
		},

		/**
		 * Main state change event handler that responds to URL changes
		 *
		 * @returns 	{void}
		 */
		stateChange() {
			const state = {
				data: ips.utils.history.getState('search'),
				url: window.location.href
			};

			if (this._initialURL === state.url && !Object.keys(state.data).length) {
				// If our URLs match but we have no state data, we can assume we've gone back to the intital search form, so let's reset
				this._cancelSearch();
			} else if (this._initialURL === state.url && state.data.url === undefined) {
				// If we don't have a URL, get it from our initial data
				this._loadResults( this._getUrlFromData( this._initialData ) );
			} else {
				// Otherwise use the state url
				this._loadResults( state.data.url );
			}
		},

		/**
		 * Responds to event from filters indicating the filter form has been submitted
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		submittedSearch(e, data) {
			this._formData = this._getFormData( data.data );
			const url = this._getUrlFromData(this._formData);

			/* DataLayer event */
			try {
				if ( IpsDataLayerContext && !window.IpsDataLayerContext ) {
					let unique = '';
					let self = this;
					Object.keys( this._formData ).sort().forEach(function (index) {
						let value = self._formData[index];
						if (value.join) {
							value = value.join();
						}
						if (value.toString) {
							value = value.toString();
						}
						if (value && (typeof value === 'string')) {
							unique += value;
						}
					});

					$('body').trigger('ipsDataLayer', {
						_key: 'search',
						_properties: {
							query: this._formData.q || null
						},
						_uniquekeys: {'key':unique}
					});
				}
			} catch (e) {}

			ips.utils.history.pushState( {
				controller: 'core.front.search.main',
				url: url,
				filterData: this._formData
			}, 'search', url );
			document.title = this._getBrowserTitle();
		},

		/**
		 * Cancel the search results and reset the form
		 *
		 * @returns 	{void}
		 */
		_cancelSearch() {
			var results = this.scope.find('[data-role="filterContent"]');
			var blurb = this.scope.find('[data-role="searchBlurb"]');

			// Remove controller/widgets in results area before we empty it
			ips.controller.cleanContentsOf( results );

			// Tell filters to reset
			this.triggerOn( 'core.front.search.filters', 'cancelResults.search' );

			// Empty relevant elements
			results.html('');
			blurb.html('').hide();
		},

		/**
		 * Builds a search URL from the provided data
		 *
		 * @param 		{object} 	data 	Object containing search data
		 * @returns 	{string} 	url
		 */
		_getUrlFromData(data) {
			var params = [];

			// Basic params
			for (const val of ['q', 'type', 'page', 'quick']) {
				if( data[ val ] !== undefined && data[ val ] !== '' ){
					params.push( val + '=' + encodeURIComponent( data[ val ] ) );
				}
			};

			// Are we searching content or members?
			if( data['type'] === 'core_members' ){

				// Joined date
				if( data['joinedDate'] !== undefined){
					if( data['joinedDate'] !== 'custom' ){
						params.push( 'joinedDate=' + data['joinedDate'] );
					} else {
						if( data['joinedDateCustom[start]'] !== undefined ){
							params.push( 'start_after=' + encodeURIComponent( new Date( data['joinedDateCustom[start]'] ).getTime() / 1000 ) );	
						}
						if( data['joinedDateCustom[end]'] !== undefined ){
							params.push( 'start_before=' + encodeURIComponent( new Date( data['joinedDateCustom[end]'] ).getTime() / 1000 ) );	
						}						
					}
				}

				// Member group
				if( data['group'] !== undefined ){
					if( !Array.isArray( data['group'] ) ){
						data['group'] = [ data['group'] ];
					}

					for( var i = 0; i < data['group'].length; i++ ){
						params.push( 'group[' + data['group'][ i ] + ']=1' );
					}
				}

				// Custom profile fields
				for (const [key, val] of Object.entries( data )){
					if( !key.startsWith('core_pfield') || val === 0 || val === '' ){
						continue;
					}

					params.push( key + '=' + val );
				};
				
			} else {
				// Content-specific basic params
				for (const val of ['item', 'author', 'search_min_replies', 'search_min_views', 'search_min_comments', 'search_min_reviews']) {
					if( data[ val ] !== undefined && data[ val ] !== '' && parseInt( data[ val ] ) !== 0 ){
						if( val === 'author' )
						{
							// Author names need treating slightly differently, since they may contain some HTML entities
							params.push( val + '=' + encodeURIComponent( data[ val ] ) );
							continue;
						}
						params.push( val + '=' + data[ val ] );
					}
				};

				if( data['tags'] !== undefined ){
					params.push( 'tags=' + encodeURIComponent(data['tags'].replace(/\n/g, ',') ));
				}

				// Are we searching nodes?
				if( data[ data['type'] + '_node' ] !== undefined ){
					params.push( 'nodes=' + data[ data['type'] + '_node' ] );
				}
				else if( data['nodes'] !== undefined ){
					params.push( 'nodes=' + data['nodes'].replace(/\n/g, ',') );
				}
				if( data['club[]'] !== undefined ){
					if ( Array.isArray( data['club[]'] ) ) {
						params.push( 'club=' + data['club[]'].filter(function(v){
							return v !== '__EMPTY';
						}));
					} else if ( data['club[]'].replace( '__EMPTY', '' ) ) {
						params.push( 'club=' + data['club[]'].replace( '__EMPTY', '' ) );
					}
				}

				// Only include eitherTermsOrTags if there's a term AND some tags
				if( data['eitherTermsOrTags'] !== undefined ){
					if( data['q'] !== undefined && data['q'].trim() !== '' && data['tags'] !== undefined && data['tags'].trim() !== '' ){
						params.push( 'eitherTermsOrTags=' + data['eitherTermsOrTags'] );
					}
				}

				// Only include search_and_or if its 'or' or 'and'
				if( data['search_and_or'] !== undefined && ( data['search_and_or'] === 'or' || data['search_and_or'] === 'and' ) ){
					params.push( 'search_and_or=' + data['search_and_or'] );
				}
				
				// Only include search_in if its 'title'
				if( data['search_in'] !== undefined && data['search_in'] === 'titles' ){
					params.push( 'search_in=' + data['search_in'] );
				}

				// Date params
				var datesSet = { startDate: false, updatedDate: false };
				for (const val of [ ['startDate', 'start_after'], ['updatedDate', 'updated_after'] ]){
					if( data[ val[0] ] !== undefined ){
						if( data[ val[0] ] !== 'any' && data[ val[0] ] !== 'custom' ){
							params.push( val[1] + '=' + data[ val[0] ] );

							datesSet[ val[0] ] = true;
						} else if( data[ val[0] ] === 'any' ) {
							datesSet[ val[0] ] = true;
						}
					}
				};

				// Custom date param
				for (const val of [ ['startDateCustom[start]', 'start_after'], ['startDateCustom[end]', 'start_before'], ['updatedDateCustom[start]', 'updated_after'], ['updatedDateCustom[end]', 'updated_before'] ]){
					var thisType = ( val[0].indexOf('startDate') !== -1 ) ? 'startDate' : 'updatedDate';
					if( data[ val[0] ] !== undefined && !datesSet[ thisType ] ){
						// If we have selected 'any' for dates', do not add these
						if ( ( val[0] === 'startDateCustom[start]' || val[0] === 'startDateCustom[end]' ) && data['startDate'] !== undefined && data['startDate'] === 'any' ) {
							// Do nothing
						} else if ( ( val[0] === 'updatedDateCustom[start]' || val[0] === 'updatedDateCustom[end]' ) && data['updatedDate'] !== undefined && data['updatedDate'] === 'any' ) {
							// Do nothing
						} else {
							// We have to pass the form field to getDateFromInput() to account for polyfill
							params.push( val[1] + '=' + encodeURIComponent( ips.utils.time.getDateFromInput( $('[name="' + val[0] + '"]') ).getTime() / 1000 ) );
						}
					}
				};
			}
			
			// Sort
			if( data['sortby'] !== undefined ){
				params.push( 'sortby=' + data['sortby'] );
			}
			
			if( data['sortdirection'] !== undefined ){
				params.push( 'sortdirection=' + data['sortdirection'] );
			}

			return this._baseURL + '&' + params.join('&');
		},

		/**
		 * Main method to load new results from the server
		 *
		 * @param 		{string} 	url 				URL to load
		 * @returns 	{Promise<void>}
		 */
		async _loadResults(url ) {
			this.triggerOn( 'core.front.search.filters', 'resultsLoading.search' );
			this._setContentLoading( true );

			try {
				const response = await ips.fetch(url)
				if (typeof response !== 'object') {
					window.location = url;
				}

				if (response.css) {
					this._addCSS(response.css);
				}

				// Hide filters
				this.triggerOn('core.front.search.filters', 'resultsDone.search', {
					contents: response.filters,
					hints: response.hints
				});

				// Update content
				this._content.html(response.content);
				$(document).trigger('contentChange', [this._content]);

				// Update title
				this.scope.find('[data-role="searchBlurb"]').show().html(response.title);

				// Make sure cancel button is shown
				this.scope.find('[data-action="cancelFilters"]').show();

				// Animate new items
				const newItems = this.scope.find('[data-role="resultsArea"] [data-role="activityItem"]').css({
					opacity: "0"
				});
				const delay = 100;

				// Slide down to make space for them
				newItems.slideDown(function () {
					// Now fade in one by one, with a delay
					newItems.each(function (index) {
						var d = (index * delay);
						$(this).delay((d > 1200) ? 1200 : d).animate({
							opacity: "1"
						});
					});
				});
			} catch (e) {
				window.location = url;
			}
			this._setContentLoading( false );
		},

		/**
		 * Responds to pagination event in conversation
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		paginationClicked(e, data){
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			this._formData['page'] = data.pageNo;

			const url = this._getUrlFromData(this._formData);
			ips.utils.history.pushState( {controller: 'core.front.search.main', url}, 'search', url );

			const elemPosition = ips.utils.position.getElemPosition(this.scope);
			$('html, body').animate( { scrollTop: elemPosition.absPos.top + 'px' } );
		},

		/**
		 * Returns form data, converting jquery serializedArray objects into
		 * simple key/value pairs
		 *
		 * @param 		{object} 	data 	Form data object
		 * @returns 	{object}
		 */
		_getFormData(data) {
			if(typeof data !== 'object' || data === null){
				return;
			}

			var returnData = {};
			var skipData = [ 'page', 'csrfKey' ];

			for( var i = 0; i < data.length; i++ ){
				if( ( skipData ).indexOf( data[ i ].name ) === -1 && data[ i ].value !== '' ){

					// If we already have a value set for this param and it isn't an array, juggle it
					// so that it is an array and push the existing value into it
					if( returnData[ data[ i ].name ] !== undefined && !Array.isArray( returnData[ data[ i ].name ] ) ){
						var tmp = returnData[ data[ i ].name ];
						returnData[ data[ i ].name ] = [];
						returnData[ data[ i ].name ].push( tmp );
					}

					// If we're an array, push it into it, otherwise just set the value
					if( returnData[ data[ i ].name ] !== undefined ){
						returnData[ data[ i ].name ].push( data[ i ].value );
					} else {
						returnData[ data[ i ].name ] = data[ i ].value;	
					}
					
					// Unlimited checkbox? Overwrite value
					if ( data[i].name !== 'club[]' ) {
						if ( $('#' + data[i].name + '-unlimitedCheck').length )
						{
							if ( ! $('#' + data[i].name + '-unlimitedCheck:checked').length )
							{
								returnData[ data[ i ].name ] = $('input[type=number][name=' + data[ i ].name + ']').val();
							}
							else
							{
								delete( returnData[ data[ i ].name ] );
							}
						}
					}
				}
			}
			
			if( data['type'] !== undefined && data['type'] !== 'core_members' ){
				if ( data['sortby'] !== undefined ){
					delete( data['sortby'] );
				}
				
				if ( data['sortdirection'] !== undefined ){
					delete( data['sortdirection'] );
				}
			}

			return returnData;
		},

		/**
		 * Builds a string to use in the browser titlebar
		 *
		 * @returns 	{string}
		 */
		_getBrowserTitle() {
			var title = ips.getString('searchTitle');
			var currentType = this.scope.find('input[type="radio"][name="type"]:checked');
			var q = this._formData['q'];
			if ( q === undefined ) {
				q = '';
			}
			
			if( q !== '' && !currentType.length ){
				title = ips.getString('searchTitleTerm', {
					term: q
				});
			} else if( q !== '' && currentType.length ){
				title = ips.getString('searchTitleTermType', {
					term: q,
					type: currentType.next('[data-role="searchAppTitle"]').text()
				});
			} else if( q === '' && this._currentType !== '' ){
				title = ips.getString('searchTitleType', {
					type: currentType.next('[data-role="searchAppTitle"]').text()
				});
			}
			
			return title;
		},

		/**
		 * Adds css files to the page header
		 *
		 * @param 		{array} 	css 	Array of CSS urls to add
		 * @returns 	{void}
		 */
		_addCSS(css) {
			var head = $('head');

			if( css && css.length ){
				for( var i = 0; i < css.length; i++ ){
					head.append( $('<link/>').attr( 'href', css[i] ).attr( 'type', 'text/css' ).attr('rel', 'stylesheet') );
				}
			}
		},

		/**
		 * Toggles the loading state on the main search body area
		 *
		 * @param 		{boolean} 	showLoading 		Enable loading state?
		 * @returns 	{void}
		 */
		_setContentLoading(state) {
			var results = this.scope.find('[data-role="resultsContents"]');

			if( !results.length ){
				if( this._loadingDiv ){
					this._loadingDiv.hide();
				}

				return;
			}

			var dims = ips.utils.position.getElemDims( results );
			var position = ips.utils.position.getElemPosition( results );
			

			if( !this._loadingDiv ){
				this._loadingDiv = $('<div/>').append( 
					$('<div/>')
						.css({
							height: Math.min(200, results.outerHeight()) + 'px'
						})
						.addClass('ipsLoading')
				);

				ips.getContainer().append( this._loadingDiv );
			}

			this._loadingDiv
				.show()
				.css({
					left: position.viewportOffset.left + 'px',
					top: position.viewportOffset.top + $( document ).scrollTop() + 'px',
					width: dims.width + 'px',
					height: dims.height + 'px',
					position: 'absolute',
					zIndex: ips.ui.zIndex()
				})
				

			if( state ){
				results
					.animate({
						opacity: "0.6"
					})
					.css({
						height: results.height() + 'px'
					});				
			} else {
				results.css({
					height: 'auto',
					opacity: "1"
				});

				this._loadingDiv.hide();
			}	
		}
	});
}(jQuery));