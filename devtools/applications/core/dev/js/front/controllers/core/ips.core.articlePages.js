/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.articlePages.js - Turns content using the page bbcode into paginated content
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.articlePages', {

		_currentPage: 1,
		_pages: null,
		_articleID: '',

		initialize() {
			this.on( 'paginationClicked', this.paginationClicked );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup() {
			this._articleID = this._getArticleID();

			// Primary event that watches for URL changes
			this.on( window, `historychange:article-${this._articleID}`, this.stateChange );
			this._setupPages();
		},

		/**
		 * stateChange event
		 *
		 * @returns {void}
		 */
		stateChange() {
			if (!(('article-' + this._articleID) in ips.utils.history.getState())) {
				return;
			}

			const state = ips.utils.history.getState(`article-${this._articleID}`)

			const newPage = parseInt(state?.['page' + this._articleID]);

			if (!Number.isInteger(newPage) || this._pages[newPage - 1] === undefined) {
				return;
			}

			this._pages.hide();
			this._currentPage = newPage;

			ips.utils.anim.go( 'fadeIn', $( this._pages[ newPage - 1 ] ) );

			this._checkButtons();
		},

		/**
		 * Event handler for the pagination widget being clicked
		 *
		 * @param	{Event} 	e 		Event object
		 * @param	{object} 	data 	Event data object
		 * @returns {void}
		 */
		paginationClicked(e, data) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
				data.originalEvent.stopPropagation();
			}

			// Don't allow these pagination events to bubble up to main comment feed pagination
			e.stopPropagation();

			const urlData = {
				controller: 'article-' + this._articleID
			};

			if( data.pageNo == 'next' ){
				urlData[ 'page' + this._articleID ] = this._currentPage + 1;
			} else {
				urlData[ 'page' + this._articleID ] = this._currentPage - 1;
			}

			const url = this._buildURL(urlData['page' + this._articleID]);

			ips.utils.history.pushState(urlData, `article-${this._articleID}`, url);
		},

		/**
		 * Determines an appropriate article ID for this controller
		 * If data-articleID isn't specified, it'll try and find a comment ID,
		 * or default to the sequential dom element ID.
		 *
		 * @returns {string}
		 */
		_getArticleID() {
			if( this.scope.attr('data-articleID') ){
				return this.scope.attr('data-articleID');
			} else if( this.scope.closest('[data-commentID]') ) {
				return 'comment' + this.scope.closest('[data-commentID]').attr('data-commentID');
			} else {
				// This isn't great because it'll change for each user, but if we've
				// got nothing else to go on...
				return this.scope.identify().attr('id');	
			}			
		},

		/**
		 * Builds a URL that is a link to this particular page of the document
		 *
		 * @param 	{number} 	pageNo 		Page number to include in the URL
		 * @returns {void}
		 */
		_buildURL(pageNo) {
			// Get URL object first
			var urlObj = ips.utils.url.getURIObject();
			// Build the base URL
			var url = urlObj.protocol + '://' + urlObj.host + ( urlObj.port ? ( ':' + urlObj.port ) : '' ) + urlObj.path + '?';

			// Add or replace our page number param
			urlObj.queryKey[ 'page' + this._articleID ] = pageNo;

			var params = { ...urlObj.queryKey };

			// If we're using index.php? urls, the keys may be /forum/forum-2/ style
			// The /../ part will have an empty value, so we add those to the URL manually first
			if( urlObj.file == 'index.php' ){
				for (const [key, val] of Object.entries( params )){
					if( key.startsWith('/') ){
						url += key;
						delete params[ key ];
					}
				};

				url += '&';
			}

			// If we still have other params, add those to the URL
			if( Object.keys( params ).length !== 0 ){
				url += $.param( params );
			}

			return url;
		},

		/**
		 * Checks the next/prev buttons, and shows/hides them as needed
		 *
		 * @returns {void}
		 */
		_checkButtons() {
			const indexedPage = this._currentPage - 1;

			this.scope.find('.ipsPagination__prev').toggle( !( indexedPage <= 0 ) );
			this.scope.find('.ipsPagination__next').toggle( !( indexedPage >= ( this._pages.length - 1 ) ) );
		},

		/**
		 * Sets up the content, showing pagination
		 *
		 * @returns {void}
		 */
		_setupPages() {
			// Find the pages
			this._pages = this.scope.find('[data-role="contentPage"]');

			if( this._pages.length < 2 ){
				return;
			}

			// Add pagination to the top and bottom
			this.scope.prepend( ips.templates.render('core.pagination') );
			this.scope.append( ips.templates.render('core.pagination') );

			// Hide all pages
			this._pages.hide();

			// Do we have a page in the URL?
			if( ips.utils.url.getParam('page' + this._articleID ) !== undefined ){
				this._currentPage = parseInt( ips.utils.url.getParam('page' + this._articleID ) );
			}

			// Show the right page
			$( this._pages[ this._currentPage - 1 ] ).show();

			// Hide the 'previous'
			this._checkButtons();

			// Hide the breaks
			this.scope.find('[data-role="contentPageBreak"]').hide();

			// And reinit content
			$( document ).trigger( 'contentChange', [ this.scope ] );
		}
	});
}(jQuery));