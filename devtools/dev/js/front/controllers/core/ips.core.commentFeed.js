/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.commentFeed.js - Controller for a stream of comments (e.g. a topic, conversation, etc.)
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.commentFeed', {

		_overlay: null,
		_commentFeedID: 0,
		_newRepliesFlash: null,
		_maximumMultiQuote: 50, // Maximum number of items that can be multiquoted
		_pageParam: 'page',
		_seoPagination: false,
		_urlParams: {},
		_baseURL: '',
		_doneInitialState: false,
		_initialURL: '',

		// Polling vars
		_pollingEnabled: true, // Is polling enabled at all?
		_pollingActive: false, // Is polling running right now?
		_pollingPaused: false, // Have we paused polling?
		_initialPoll: 10000, // Our base polling frequency (1 minute)
		_currentPoll: 10000, // The current interval
		_decay: 20000, // Decay (amount added to interval on each false response)
		_maxInterval: ( 30 * 60 ) * 1000, // Maximum interval possible (30 mins)
		_pollingTimeout: null, // timeout obj
		_pollAjax: null, // ajax obj
		_pollOnUnpaused: false, // If true, when window is focused a poll will fire immediately
		_notification: null,
		_lastSeenTotal: 0,

		initialize () {
			this._containerID = this.scope.closest('[data-commentsContainer]').length ? this.scope.closest('[data-commentsContainer]').attr('data-commentsContainer') : this.scope.identify().attr('id');

			this.on( 'submit', '[data-role="replyArea"]', this.quickReply );
			this.on( 'quoteComment.comment', this.quoteComment );
			this.on( 'addMultiQuote.comment', this.addMultiQuote );
			this.on( 'removeMultiQuote.comment deleteComment.comment', this.removeMultiQuote );
			this.on( 'click', '[data-action="filterClick"]', this.filterClick );
			this.on( 'menuItemSelected', '[data-role="signatureOptions"]', this.signatureOptions );
			this.on( 'editorCompatibility', this.editorCompatibility );
			this.on( 'checkedComment.comment', this.checkedComment );
			if (this.elem?.dataset.pageParam) {
				this._pageParam = this.elem.dataset.pageParam;
			}

			this._boundMQ = this.doMultiQuote.bind(this);
			this._boundCMQ = this.clearMultiQuote.bind(this);
			
			$( document ).on( 'click', '[data-role="multiQuote_' + this._containerID + '"]', this._boundMQ );
			$( document ).on( 'click', '[data-action="clearQuoted_' + this._containerID + '"]', this._boundCMQ );
			$( document ).on( 'moderationSubmitted', this.clearLocalStorage );

			this.on( 'paginationClicked paginationJump', this.paginationClick );

			// Watch events on the document that are actually triggered from within this.quickReply
			this.on( document, 'addToCommentFeed', this.addToCommentFeed );
			this.on( 'deletedComment.comment', this.deletedComment );

			// Event we watch for on flash messages
			this.on( document, 'click', '[data-action="loadNewPosts"]', this.loadNewPosts );

			// Watch for state updates
			this.on(window, 'historychange', this.stateChange);

			// Socket events
			this.on(document, "socket.new_comment", this.handleSocketCommentTrigger);
			this.setup();
		},

		/**
		 * Setup method for comment feeds
		 *
		 * @returns {void}
		 */
		setup: function () {
			const replyForm = this.scope.find('[data-role="replyArea"] form');

			this._commentFeedID = this.scope.attr('data-feedID');
			this._urlParams = this._getUrlParams();
			this._baseURL = this.scope.attr('data-baseURL');
			this._initialURL = window.location.href;
			this._currentPage = ips.utils.url.getPageNumber( this._pageParam );
			this._urlParams[ this._pageParam ] = this._currentPage;

			if (this._baseURL.match(/\?[^?]+$/)) {
				this._baseURL += '&';
			} else {
				this._baseURL += '?';
			}

			if( replyForm.attr('data-noAjax') ){
				this._pollingEnabled = false;
			}

			if (!('commentFeed' in ips.utils.history.getState())) {
				this._updateState({})
				ips.utils.history.replaceState(this.historyState, 'commentFeed', window.location.href)
			}

			if( this.scope.attr('data-lastPage') !== undefined && this._pollingEnabled ){
				this._startPolling();
			}

			$(document).ready(() => {
				this._setUpMultiQuote();
				this._findCheckedComments();
			});

			if (ips.getSetting('relativeDates')) {
				this.on('updateTimestamps', this._updateTimestamps);
			}

			// Prevent empty submissions
			for (const ev of ['ips:editorUpdated', 'ips:editorAfterInit']) {
				this.elem.addEventListener(ev, ips.utils.debounce(e => {
					const {elem, instance} = e.detail;
					const submit = elem.closest(CSS.supports('selector(a:has(b))') ? 'form:has(input[type="submit"],button[type="submit"])' : 'form').querySelectorAll(':is(button, input)[type="submit"]');
					if (!submit.length) {
						return;
					}


					/**
					 * Recursively check to see if a node has actual content
					 * @param	node		A node in the Prose Mirror Document Tree
					 * @return {boolean}
					 */
					function nodeHasContent(node) {
						if (node.textContent?.trim()?.length) {
							return true;
						}

						if (node.isAtom && !node.isText) {
							return true;
						}

						if (node.children && Symbol.iterator in node.children) {
							for (const child of node.children) {
								if (nodeHasContent(child)) {
									return true;
								}
							}
						}

						return false;
					}

					const empty = !nodeHasContent(instance.state.doc);
					submit.forEach(item => {
						if (empty) {
							item.setAttribute('disabled', '');
						} else {
							item.removeAttribute('disabled');
						}
					})
				}, 100));
			}
		},

        /**
         * Clear local storage after form is submitted
         *
         * @returns {void}
         */
        clearLocalStorage: function () {
            ips.utils.db.remove( 'moderation', $( document ).find("[data-feedID]").attr('data-feedID') );
        },

		/**
		 * Destroy method
		 *
		 * @returns {void}
		 */
		destroy: function () {
			$( document ).off( 'click', '[data-role="multiQuote_' + this._containerID + '"]', this._boundMQ );
			$( document ).off( 'click', '[data-action="clearQuoted_' + this._containerID + '"]', this._boundCMQ );
			this._stopPolling();
		},

		/**
		 * Returns an object containing URL parameters
		 *
		 * @returns {object}
		 */
		_getUrlParams: function () {
			const sort = this._getSortValue();
			const obj = {
				sortby: sort.by || '',
				sortdirection: sort.order || '',
			};

			obj[ this._pageParam ] = ips.utils.url.getPageNumber( this._pageParam ) || 1;

			return obj;
		},

		/**
		 * Returns the current sort by and sort order value
		 *
		 * @returns {object}	Object containing by and order keys
		 */
		_getSortValue: function () {
			return { by: '', order: '' };
		},

		/**
		 * Responds to state changes triggered by History.js
		 *
		 * @param {CustomEvent}	e
		 *
		 * @returns {void}
		 */
		stateChange(e) {
			if (e.detail?.type === 'replace' || !('commentFeed' in ips.utils.history.getState())) {
				return;
			}

			/**
			 * @type {{data: Object, url: string}}
			 */
			const state = {
				data: ips.utils.history.getState('commentFeed'),
				url: window.location.href
			}

			if (typeof state.data !== "object") {
				return;
			}

			// If the last change was a commentFeed event directly, we handle it. Otherwise, we need to verify that the change is actually a change
			const lastChange = e.detail.type === 'pop' ? 'pop' : ips.utils.history.getLastChangeType()
			if (lastChange && lastChange !== 'commentFeed' && typeof this.historyState === "object") {
				let commentFeedChanged = false;
				if (Object.keys(this.historyState).length !== Object.keys(state.data).length) {
					commentFeedChanged = true;
				} else {
					for (const key in this.historyState) {
						if (!(key in state.data) || this.historyState[key] !== state.data[key]) {
							commentFeedChanged = true;
							break;
						}
					}
				}

				// Only return if the comment feed's data really wasn't changed. Otherwise the content still has to be updated
				if (!commentFeedChanged) {
					return
				}
			}

			// Make sure the state we're working with belongs to this controller/feed.
			if ((state.data.controller !== this.controllerID || state.data.feedID !== this._commentFeedID)) {
				if (state.data.controller === undefined && state.url === this._initialURL) {
					// If there's no controller info in the state, but the state URL matches our initial URL, we'll reload that initial page content
					Debug.log("No controller state, but state URL matched initial URL");
				} else {
					return;
				}
			}

			// Update data
			this.historyState = state.data;
			this._urlParams = state.data;

			// Register page view
			ips.utils.analytics.trackPageView( state.url );
			this._getResults();
		},

		/**
		 * Fetches new results from the server, then calls this._updateTable to update the
		 * content and pagination. Simply redirects to URL on error.
		 *
		 * @param 	{string} 	[url] 	Optional URL to fetch the results from. If omitted
		 								 the URL will be built based on the current params object
		 * @returns {void}
		 */
		_getResults(url) {
			this._setLoading( true );
			ips.getAjax()( url || this._getURL(), {
				showLoading: true
			})
				.done(response => this._getResultsDone(response))
				.fail((...args) => this._getResultsFail(...args))
				.always(() => this._getResultsAlways());
		},

		/**
		 * New results have finished loading
		 *
		 * @param 	{string}	Results HTML from ajax request
		 * @returns {void}		
		 */
		_getResultsDone (response) {
			const feed = Array.from((new DOMParser())
				.parseFromString(`<div>${response}</div>`, 'text/html')
				.querySelectorAll(`[data-feedid="${this.scope.attr('data-feedid')}"]`))
				.find(el => el.dataset.controller?.match(/core\.front\.core\.commentFeed/i))

			if (!feed) {
				this._getResultsFail(new RangeError(`The response did not include a content feed element with a feed id matching this one`))
				return;
			}

			const newContents = feed.innerHTML;

			const scrollPos = window.scrollY;
			this.cleanContents();
			this.scope.html( newContents );
			window.scrollTo({top: scrollPos, behavior: 'auto'})

			// Show content and hide loading
			if (this._updateDoneCallback instanceof Function) {
				setTimeout(this._updateDoneCallback, 10);
			}
			this._updateDoneCallback = null;

			this._overlay.hide();
			this.scope.removeAttr("data-ips-comments-loading");


			// Last page check:
			// Check whether we're on the last page, because if we are we need to start polling (or stop if not last page)
			const currentPageNo = ips.utils.url.getPageNumber(this._pageParam, window.location.href),
				lastPageNo		= this.scope.find('li.ipsPagination__last > a').first().attr('data-page');

			if (currentPageNo !== lastPageNo) {
				this.scope.removeAttr( 'data-lastPage' );
				this._stopPolling();
			} else {
				this.scope.attr( 'data-lastPage', true );

				if( this._pollingEnabled ){
					this._currentPoll = this._initialPoll;
					this._startPolling();
				}
			}

			// Update multiquote, let document know, then highlight checked comments
			this._setUpMultiQuote();
			$( document ).trigger( 'contentChange', [ this.scope ] );
			this._findCheckedComments();
			ips.ui.tableOfContents.refreshElems();
		},

		/**
		 * Callback when the results ajax fails
		 *
		 * @param 	{object} 	jqXHR			jQuery XHR object
		 * @param	{string} 	textStatus		Error message
		 * @param 	{string}	errorThrown
		 * @returns {void}
		 */
		_getResultsFail: function (jqXHR, textStatus, errorThrown) {
			if( Debug.isEnabled() ){
				if (jqXHR instanceof RangeError) {
					Debug.error(jqXHR)
					return;
				}
				Debug.error( "Ajax request failed (" + textStatus + "): " + errorThrown );
				Debug.error( jqXHR.responseText );
			} else {
				// rut-roh, we'll just do a manual redirect
				window.location = this._getURL();
			}
		},

		/**
		 * Callback always called after ajax request to load results
		 *
		 * @returns {void}
		 */
		_getResultsAlways: function () {
			//
		},

		/**
		 * Callback always called after ajax request to load results
		 *
		 * @returns {void}
		 */
		_setLoading: function (status) {
			var commentFeed = this.scope.find('[data-role="commentFeed"]');

			if( status ){
				if( !this._overlay ){
					this._overlay = $('<div/>').addClass('ipsLoading').hide();
					ips.getContainer().append( this._overlay );
				}

				// Get dims & position			
				var dims = ips.utils.position.getElemDims( commentFeed );
				var position = ips.utils.position.getElemPosition( commentFeed );

				this._overlay.show().css({
					left: position.viewportOffset.left + 'px',
					top: position.viewportOffset.top + $( document ).scrollTop() + 'px',
					width: dims.width + 'px',
					height: dims.height + 'px',
					position: 'absolute',
					zIndex: ips.ui.zIndex()
				});

				commentFeed.attr("data-ips-comments-loading", "");
			} else {
				// Stop loading
			}
		},

		_paginatedOnce: false,

		/**
		 * Responds to a pagination click
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		paginationClick: function (e, data) {
			data.originalEvent.preventDefault();

			if( data.pageNo !== this._urlParams[ this._pageParam ] ) {
				Debug.log("Possibly collapsing elements as the user navigated away from the first page");
				if (parseInt(`${this._urlParams[this._pageParam]}`) === 1 && !this._paginatedOnce) {
					document
						.querySelectorAll(`[data-feedid="${this._commentFeedID}"] [data-collapse-off-first-page]`)
						.forEach(toCollapse => {
							toCollapse.dispatchEvent(new CustomEvent("ips:truncateCollapse", {bubbles: true}));
						})
				}

				this._paginatedOnce = true;
				const urlObj = new URL(data.href, location.href);
				const queryKey = Object.fromEntries(urlObj.searchParams.entries());

				// If this is coming from a page jump, the page number may not be in the href passed
				// through. So check whether it exists, and manually add it to the object if needed.
				if (!(this._pageParam in queryKey)) {
					queryKey[ this._pageParam ] = data.pageNo;
				}
				
				this._seoPagination = data.seoPagination;
				this._updateURL( queryKey, () => {
					const elem = this.elem.querySelector(`.ipsButtonBar--top`)
					if (!(elem instanceof HTMLElement)) {
						Debug.warn("Couldn't find the .ipsButtonBar--top or .ipsButtonBar--bottom pagination container inside the comment feed controller. This is likely a theme error that needs to be addressed so that the content feed can be scrolled to the top or bottom after pagination")
						return;
					}
					const boundingBox = elem.getBoundingClientRect()
					if (boundingBox.top > 30 && boundingBox.bottom < window.innerHeight - 30) {
						return;
					}

					window.scrollBy({
						top: boundingBox.top - 30,
						behavior: 'smooth'
					})
				});
			}
		},

		/**
		 * Pushes a new URL state to the browser
		 *	
		 * @param 		{object} 	newParams 	Object to be added to the state
		 * @param 		{function}	[callback]	Callback to be called after this is done
		 * @returns 	{void}
		 */
		_updateURL: function (newParams, callback) {
			this._updateState(newParams)
			let newUrl= this._getURL();
			if (newUrl.slice(-1) === '?' ){
				newUrl = newUrl.substring( 0, newUrl.length - 1 );
			}

			if (this._seoPagination === true) {
				newUrl = ips.utils.url.pageParamToPath( newUrl, this._pageParam, this.historyState[ this._pageParam ] );
			}

			ips.utils.history.pushState(this.historyState, 'commentFeed', newUrl);
			this._updateDoneCallback = callback;
		},

		/**
		 * Update the state with new params
		 *
		 * @param {object}	newParams
		 * @private
		 */
		_updateState(newParams) {
			Object.assign(this._urlParams, newParams);
			this.historyState = {...this._urlParams}
			Object.assign(this.historyState, {controller: this.controllerID, feedID: this._commentFeedID})
		},

		/**
		 * Builds a param string from values in this._urlParams, excluding empty values
		 *
		 * @returns {string}	Param string
		 */
		_getURL: function () {
			const urlObj = new URL(this._baseURL);
			const skipParams = new Set(['controller', 'feedID', 'bypassState']);
			const params = {};
			for (const param in this._urlParams) {
				if (this._urlParams[param] && !skipParams.has(param)) {
					params[param] = this._urlParams[param].toString();
				}
			}
			urlObj.updateSearchParams({params});
			return urlObj.toString();
		},

		/**
		 * An editor in this feed has indicated its compatibility
		 *
		 * @param	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns {void}
		 */
		editorCompatibility: function (e, data) {
			if( !data.compatible ){
				this.triggerOn( 'core.front.core.comment', 'disableQuoting.comment' );
			}
		},

		/**
		 * A comment controller triggered an event indicating it was selected
		 * Adds the comment ID and actions to localStorage so it can be tracked across
		 * pages of the feed
		 *
		 * @param	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns {void}
		 */
		checkedComment: function (e, data) {
			var dataStore = ips.utils.db.get( 'moderation', this._commentFeedID ) || {};

			if( data.checked ){
				if( dataStore[ data.commentID ] === undefined ){
					dataStore[ data.commentID ] = data.actions;
				}
			} else {
				delete dataStore[ data.commentID ];
			}

			// Store the updated value for a day, or delete if it's empty now
			if( Object.keys( dataStore ).length ){
				ips.utils.db.set( 'moderation', this._commentFeedID, dataStore, undefined, (Date.now() / 1000) + 86400 );
			} else {
				ips.utils.db.remove( 'moderation', this._commentFeedID );
			}			
		},

		/**
		 * Called on setup, loops through the selected comments for this feedID from localstorage,
		 * and checks any that are present on this page. For others, instructs the pageAction
		 * widget to add the ID to its store manually so that they can still be worked with.
		 *
		 * @returns {void}
		 */
		_findCheckedComments: function () {
			// Bail if there's no checkboxes anyway
			if( !this.scope.find('input[type="checkbox"]').length ){
				return;
			}

			// Fetch the checked comments for this feedID
			var dataStore = ips.utils.db.get( 'moderation', this._commentFeedID ) || {};
			var self = this;
			var pageAction = this.scope.find('[data-ipsPageAction]');

			if( Object.keys( dataStore ).length ){
				var sizeOtherPage = 0;

				for (const [key, val] of Object.entries(dataStore)){
					if( self.scope.find('[data-commentID="' + key + '"]').length ){
						self.scope
							.find('[data-commentID="' + key + '"] input[type="checkbox"][data-role="moderation"]')
							.prop( 'checked', true )
							.trigger('change');
					} else {
						sizeOtherPage++;

						pageAction.trigger('addManualItem.pageAction', {
							id: 'multimod[' + key + ']',
							actions: val
						});
					}
				};

				if( this.scope.find('[data-ipsAutoCheck]') )
				{
					this.scope.find('[data-ipsAutoCheck]').trigger( 'setInitialCount.autoCheck', { count: sizeOtherPage } );
				}
			}
		},
	
		/**
		 * Options 
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */		
		signatureOptions: function (e, data = e.detail) {
			data.originalEvent.preventDefault();

			if( data.selectedItemID == 'oneSignature' ){
				this._ignoreSingleSignature( $( e.currentTarget ).attr('data-memberID') );
			} else {
				this._ignoreAllSignatures();
			}
		},

		/**
		 * Fires a request to hide all signatures in the feed
		 *
		 * @returns 	{void}
		 */	
		_ignoreAllSignatures: function () {
			var self = this;
			var url = ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=settings&do=toggleSigs';
			var signatures = this.scope.find('[data-role="memberSignature"]');

			// Hide all signatures on the page
			signatures.slideUp();

			ips.getAjax()( url )
				.done( function (response) {
					ips.ui.flashMsg.show( ips.getString('signatures_hidden') );
					signatures.remove();
				})
				.fail( function () {
					signatures.show();

					ips.ui.alert.show( {
						type: 'alert',
						icon: 'warn',
						message: ips.getString('signatures_error'),
						callbacks: {}
					});
				});
		},

		/**
		 * Fires a request to hide a single signature (i.e. a single member's signature)
		 *	
		 * @param 		{number} 	memberID 	Member ID's signature to hide
		 * @returns 	{void}
		 */	
		_ignoreSingleSignature: function (memberID) {
			var url = ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=ignore&do=ignoreType&type=signatures';
			var signatures = this.scope.find('[data-role="memberSignature"]').find('[data-memberID="' + memberID + '"]').closest('[data-role="memberSignature"]');

			signatures.slideUp();

			ips.getAjax()( url, {
				data: {
					member_id: parseInt( memberID )
				}
			})
				.done( function (response) {
					ips.ui.flashMsg.show( ips.getString('single_signature_hidden') );
					signatures.remove();
				})
				.fail( function () {
					signatures.show();

					ips.ui.alert.show( {
						type: 'alert',
						icon: 'warn',
						message: ips.getString('single_signature_error'),
						callbacks: {}
					});
				});
		},

		/**
		 * Filter click
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		filterClick: function(e) {
			e.preventDefault();

			var urlObj = ips.utils.url.getURIObject( $( e.target ).attr('href') );
			var queryKey = urlObj.queryKey;

			this._updateURL( queryKey );
		},

		/**
		 * Responds to a quote event from a comment controller
		 * Finds the reply box for this feed, and triggers a new event instructing the 
		 * editor to insert the quote
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object (which should contain all of the properties necessary for a quote)
		 * @returns 	{void}
		 */
		quoteComment: function (e, data) {
			if (this.scope.find('[data-role="replyArea"] [data-ipsEditorv5]').length) {
				ips.ui.editorv5.getObjWithInit(this.scope.find('[data-role="replyArea"] [data-ipsEditorv5]'), function (editor) {
					editor.insertQuotes([data]);
				});
			}
		},

		/**
		 * If the window blurs, we will pause polling, but if a poll is skipped, we'll immediately poll on window focus
		 *	
		 * @returns 	{void}
		 */
		windowBlur: function (e) {
			if( this._pollingEnabled ){
				Debug.log( 'Window blurred, pausing polling...' );
				this._pollingPaused = true;
			}
		},

		/**
		 * Window focus - if polling was paused and a poll was skipped, trigger it immediately now
		 *	
		 * @returns 	{void}
		 */
		windowFocus: function (e) {
			if( this._pollingEnabled && this._pollingPaused ){
				Debug.log( 'Window focused...' );

				this._pollingPaused = false;

				if( this._pollOnUnpaused ){
					this._pollOnUnpaused = false;
					this.pollForNewReplies();
				}
			}
		},

		/**
		 * Socket has told us there may be new replies, so we'll trigger a manual check here
		 */
		handleSocketCommentTrigger: function () {
			if( this.scope.attr('data-lastPage') !== undefined && this._pollingEnabled ){
				this.pollForNewReplies();
			}
		},

		/**
		 * Set a timeout for the new post polling process
		 *	
		 * @returns 	{void}
		 */
		_startPolling: function () {
			if (ips.utils.sockets.enabled() && ips.utils.sockets.connected()) {
				if (ips.getSetting('relativeDates')) {
					if (this._timestampTimeout) {
						clearTimeout(this._timestampTimeout);
					}
					Debug.log('Setting interval to poll for relative dates');
					this._timestampTimeout = setTimeout(() => {
						this._updateTimestamps();

						// Add 20 seconds to the poll interval, up to a max of 5 minutes
						if( ( this._currentPoll + this._decay ) < this._maxInterval ){
							this._currentPoll += this._decay;
						} else {
							this._currentPoll = this._maxInterval;
						}

						this._startPolling();
					}, this._currentPoll);
				}
				return;
			}
			this._pollingActive = true;
			Debug.log('Starting polling with interval ' + ( this._currentPoll / 1000 ) + 's' );

			this._pollingTimeout = setTimeout(() => {
				this.pollForNewReplies();
			}, this._currentPoll );
		},

		/**
		 * Clear the new post poll timeout
		 *	
		 * @returns 	{void}
		 */
		_stopPolling: function () {
			this._pollingActive = false;

			if( this._pollingTimeout ){
				clearTimeout( this._pollingTimeout );
			}

			Debug.log("Stopped polling for new replies in comment feed.");
		},
		
		/**
		 * Checks for new replies since we opened the page
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		pollForNewReplies() {
			const replyForm = this.scope.find('[data-role="replyArea"] form');
			const commentsOnThisPage = document.querySelectorAll(`[data-feedid="${this.elem.dataset.feedid}"] [data-commentid]`);

			if (!commentsOnThisPage.length) {
				return;
			}

			const lastSeenId = this._getLastSeenID($(commentsOnThisPage));
			const type = $(commentsOnThisPage[commentsOnThisPage.length - 1]).attr('data-commentType');

			if (type.match(/-review$/)) {
				Debug.log("Polling disabled for reviews");
				this._stopPolling();
				return;
			}

			if (this._pollingPaused) {
				Debug.log('Window blurred, delaying poll until focused...');
				this._pollOnUnpaused = true;
				return;
			}

			// Abort any running ajax
			if (this._pollAjax && this._pollAjax.abort !== undefined) {
				this._pollAjax.abort();
			}

			this._pollAjax = ips.getAjax();
			this._pollAjax(replyForm.attr('action'), {
				dataType: 'json',
				data: 'do=checkForNewReplies&type=count&lastSeenID=' + lastSeenId + '&csrfKey=' + ips.getSetting('csrfKey'),
				type: 'post'
			})
				/**
				 * @typedef PaginationResponse
				 * @property	{number}    [count]
				 * @property	{string}    [name]
				 * @property   	{string}    [photo]
				 * @property    {string}    [title]
				 * @property    {number}    [perPage]    The amount of responses that can be stored per page
				 * @property 	{string}	[error]
				 *
				 */
				.done(
					/**
					 *
					 * @param {PaginationResponse}	response
					 */
					response => {

						// If auto-polling is now disabled, stop everything
						if (response.error && response.error === 'auto_polling_disabled') {
							this._stopPolling();
							return;
						}


						if (parseInt( response.count ) > 0) {
							// Reset the poll interval
							this._currentPoll = this._initialPoll;

							// If they'll fit on one page, import them now
							if (this.getCurrentCommentPageCount() < parseInt(response.perPage)) {
								this._importNewReplies(false);
							} else {
								this._buildFlashMsg(response);
								if (parseInt(response.totalCount) > parseInt(this._lastSeenTotal)) {
									this._buildNotifications(response);
									this._lastSeenTotal = parseInt(response.totalCount);
								}
							}
						} else {
							// Add 20 seconds to the poll interval, up to a max of 5 minutes
							if( ( this._currentPoll + this._decay ) < this._maxInterval ){
								this._currentPoll += this._decay;
							} else {
								this._currentPoll = this._maxInterval;
							}
						}

						// Start again if we're on the last page
						if (this.scope.attr('data-lastPage') !== undefined){
							this._startPolling();
						}
					});

			// lastly, update timestamps too
			if (ips.getSetting('relativeDates')) {
				this._updateTimestamps();
			}
		},

		/**
		 * Get the number of comments currently shown
		 *
		 * @returns {number}
		 */
		getCurrentCommentPageCount() {
			if (this.scope) {
				return $(this.scope).get(0).querySelectorAll(`[data-commentid]`).length
			} else {
				return 0
			}
		},

		/**
		 * Builds a flash message to alert user of new posts
		 *	
		 * @param 		{object} 	response 		Information object
		 * @returns 	{void}
		 */
		_buildFlashMsg(response) {
			const spaceForMore = parseInt(response.perPage) - this.getCurrentCommentPageCount();
			let html;

			// Build our flash message HTML
			if (parseInt(response.count) > spaceForMore) {
				html = ips.templates.render( 'core.postNotify.multipleSpillOver', {
					text: ips.pluralize( ips.getString( 'newPostMultipleSpillOver' ), [ response.totalNewCount ] ),
					canLoadNew: ( spaceForMore > 0 ),
					showFirstX: ips.pluralize( ips.getString( 'showFirstX' ), [ spaceForMore ] ),
					spillOverUrl: response.spillOverUrl
				});
			} else if( parseInt( response.count ) === 1 && response.photo !== undefined && response.name !== undefined ){
				html = ips.templates.render( 'core.postNotify.single', {
					photo: response.photo,
					text: ips.getString( 'newPostSingle', { name: response.name } )
				});
			} else {
				html = ips.templates.render( 'core.postNotify.multiple', {
					text: ips.pluralize( ips.getString( 'newPostMultiple' ), [ response.count ] )
				});
			}

			if ($('#elFlashMessage').is(':visible') && $('#elFlashMessage').find('[data-role="newPostNotification"]').length) {
				$('#elFlashMessage').find('[data-role="newPostNotification"]').replaceWith(html);
			} else {
				ips.ui.flashMsg.show( 
					html,
					{ 
						sticky: true, 
						position: 'bottom', 
						extraClasses: 'cPostFlash',
						dismissable: () => this._stopPolling(),
						escape: false
					}
				);
			}
		},

		/**
		 * Builds browser notifications to alert users of new posts
		 *	
		 * @param 		{object} 	response 		Information object
		 * @param		{number}	response.count
		 * @param	{string}		[response.name]
		 * @param	{string}		[response.photo]
		 * @param	{string}		[response.title]
		 * @param	{number}		[response.perPage]	The amount of responses that can be stored per page
		 * @returns 	{void}
		 */
		_buildNotifications(response) {
			const hiddenProp = ips.utils.events.getVisibilityProp();

			// Build our browser notification if the window isn't in focus *and* we support them
			if (hiddenProp === undefined || !document[hiddenProp] || !ips.utils.notification.hasPermission()) {
				return;
			}

			const notifyData = {
				onClick: e => {

					// Try and focus the window (security settings may prevent it, though)
					try {
						window.focus();
					} catch (err) {
					}

					// And load in those posts
					this.loadNewPosts(e);
				}
			};

			// If we already have a notification, then hide it
			if (this._notification) {
				this._notification.hide();
			}

			if (parseInt(response.count) === 1 && 'photo' in response && 'name' in response) {
				Object.apply(notifyData, {
					title: ips.getString('notificationNewPostSingleTitle', response),
					body: ips.getString('notificationNewPostSingleBody', response),
					icon: response.photo
				});
			} else {
				Object.apply(notifyData, {
					title: ips.pluralize(ips.getString('notificationNewPostMultipleTitle'), [ response.count ]),
					body: ips.pluralize(ips.getString('notificationNewPostMultipleBody', response), [ response.count ])
				});
			}

			// Create the new one
			this._notification = ips.utils.notification.create( notifyData );
			this._notification.show();
		},

		/**
		 * Adds new replies to the display
		 *
		 * @param 	{boolean}		[loadNewPage=true]		Load a new page if the latest comments won't fit on this page
		 *
		 * @returns 	{void}
		 */
		async _importNewReplies(loadNewPage=true) {
			const form = this.scope.find('[data-role="replyArea"] form');
			const commentsOnThisPage = this.scope.find('[data-commentid]');
			const _lastSeenID = this._getLastSeenID(commentsOnThisPage);

			try {
				const response = await ips.fetch(form.attr('action'), {
					data: {
						do: 'checkForNewReplies',
						type: 'fetch',
						lastSeenID: _lastSeenID,
						showing: this.getCurrentCommentPageCount()
					},
					type: 'post'
				});

				// If we have more comments to load than we allow per page, then reload the page to show them plus the pagination
				if (loadNewPage && commentsOnThisPage.length + parseInt(response.totalNewCount) > response.perPage) {
					if (response.spillOverUrl) {
						window.location = response.spillOverUrl;
					} else {
						window.location.reload();
					}
				} else {
					for (const item of [response.content].flat()) {
						this.trigger('addToCommentFeed', {
							content: item,
							feedID: this._commentFeedID,
							resetEditor: false,
							totalItems: response.totalCount
						});
					}
				}

				this._clearNotifications();
			} catch (e) {
				Debug.warn(`Could not import new replies for the comment feed!`);
				Debug.error(e);
			}
		},

		/**
		 * Close the flash message for new post notifications
		 *
		 * @returns 	{void}
		 */
		_clearNotifications: function () {
			if( this._notification && typeof this._notification.hide() === "function" ){
				this._notification.hide();
			}

			if( $('#elFlashMessage').find('[data-role="newPostNotification"]').length ){
				$('#elFlashMessage').find('[data-role="newPostNotification"]').trigger('closeFlashMsg.flashMsg');
			}
		},

		/**
		 * Handles quick-reply functionality for this comment feed. Post the content via ajax,
		 * and trigger events to handle showing the new post (or redirecting to a new page)
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		quickReply: function (e) {
		
			const form = this.scope.find('[data-role="replyArea"] form');
			if ( form.attr('data-noAjax') ) {
				return;
			}
			
			e.preventDefault();
			e.stopPropagation();

			const self = this;
			const replyArea = this.scope.find('[data-role="replyArea"]');
			const submit = form.find('[type="submit"]');
			const autoFollow = this.scope.find('input[name$="auto_follow_checkbox"]');
			const commentsOnThisPage = this.scope.find('[data-commentid]');
			const _lastSeenID = this._getLastSeenID(commentsOnThisPage);

			// Set the form to loading
			const submitButtons = [...submit];
			const submitRestorations = [];
			submitButtons.forEach(button => {
				if (button.closest('.ipsIconPicker')) {
					return;
				}
				const initialText = button.innerText;
				button.setAttribute('disabled', '');
				button.innerText = ips.getString('saving');
				submitRestorations.push(() => {
					button.removeAttribute('disabled');
					button.innerText = initialText;
				});
			});

			let page = ips.utils.url.getPageNumber(this._pageParam);

			if( !page ){
				page = 1;
			}
			
			this._clearNotifications();

			ips.getAjax()( form.attr('action'), {
				data: form.serialize() + '&currentPage=' + page + '&_lastSeenID=' + _lastSeenID,
				type: 'post'
			})
				.done( function (response) {
					if ( response.type == 'error' ) {
						Debug.error(response);
						Debug.error('Failed to submit content via quick reply');
						if ( response.form ) {
							if (replyArea.find('[data-ipseditorv5]')) {
								ips.ui.editorv5.getObj(replyArea.find('[data-ipseditorv5]')).destruct(false);
							}
							form.replaceWith( $(response.form) );
							$( document ).trigger( 'contentChange', [ self.scope ] );
						} else {
							ips.ui.alert.show( {
								type: 'alert',
								icon: 'warn',
								message: response.message,
								callbacks: {}
							});
						}
					}
					else if( response.type == 'redirect' ) {
						self.paginationClick( e, {
							href: response.url,
							originalEvent: e
						});
					} else if( response.type == 'merge' ) {
						var comment = $(self.findCommentInFeed(response.id));
						comment.find('[data-role="commentContent"]').html( response.content );
												
						if( comment.find('pre.prettyprint').length ){
							comment.find('pre.prettyprint').each( function () {
								$( this ).html( window.PR.prettyPrintOne( ips.utils.escapeHTML( $( this ).text() ) ) );
							});
						}
						
						self.scope.find('[data-role="replyArea"] [data-ipsEditorv5]' ).data('_editor').reset();

						if( self.scope.find('[data-role="replyArea"] input[name="guest_name"]').length )
						{
							self.scope.find('[data-role="replyArea"] input[name="guest_name"]').val('');
						}
						form.find("[data-role='commentFormError']").each(function() {
						  $( this ).remove();
						});

						const container = comment.closest('.js-ipsEntry');
						if ( container.length ) {
							ips.utils.anim.go( 'pulseOnce', container );
						} else {
							ips.utils.anim.go( 'pulseOnce', comment );
						}
						ips.ui.flashMsg.show( ips.getString('mergedConncurrentPosts') );
						
						$( document ).trigger( 'contentChange', [ self.scope ] );
					} else {

						/* add the datalayer event if we posted it */
						if ( response.postedByLoggedInMember ) {
							self.trigger( 'ipsDataLayer', { _key: 'content_comment', _properties: response.dataLayer } );
						}

						self.trigger( 'addToCommentFeed', {
							content: response.content,
							totalItems: response.total,
							feedID: self._commentFeedID,
							scrollToItem: true
						});
						
						if ( response.message ) {
							ips.ui.flashMsg.show( response.message );
						}

						// If this is a guest posting editor
						if( self.scope.find('[data-role="replyArea"] input[name="guest_name"]').length )
						{
							self.scope.find('[data-role="replyArea"] input[name="guest_name"]').val('');
							self.scope.find('[data-role="replyArea"] [data-ipsEditorv5]')
								.find('.ipsComposeArea_dummy')
									.hide()
								.end()
								.find('[data-role="mainEditorArea"]')
									.show()
								.end()
								.closest('.ipsComposeArea')
									.removeClass('ipsComposeArea_minimized')
									.find('[data-ipsEditor-toolList]')
										.show();
						}
						form.find("[data-role='commentFormError']").each(function() {
						  $( this ).remove();
						});

						// If the user is following this item, we can update the follow button too
						if( autoFollow.length ){
							self.trigger( 'followingItem', {
								feedID: self.scope.attr('data-follow-area-id') || self.scope.attr('data-feedID'),
								following: autoFollow.is(':checked')
							});
						}
					}
					
					self._clearNotifications();
				})
				.fail( function (jqXHR, textStatus, errorThrown) {
					if( Debug.isEnabled() ){
						Debug.error("Posting new reply failed: " + textStatus);
						Debug.log( jqXHR );
						Debug.log( errorThrown );
					} else {
						form.attr('data-noAjax', 'true');
						form.attr('action', form.attr('action') + ( ( ! form.attr('action').match( /\?/ ) ) ? '?failedReply=1' : '&failedReply=1' ) );
						form.trigger('submit');
					}
				})
				.always( function () {
					submitRestorations.forEach(cb => cb());
				});
		},

		/**
		 * Event handler for the 'load new posts' link in flash messages
		 *	
		 * @param 		{Event} 	[e] 		Event object
		 * @returns 	{void}
		 */
		loadNewPosts: function (e) {
			e?.preventDefault?.();
			this._importNewReplies();
		},

		/**
		 * Find a comment in this feed. Comments can occasionally be outside of the feed's DOM element, such as for featured first posts
		 * @param commentId
		 * @return {Element|null}
		 */
		findCommentInFeed(commentId) {
			const commentSelector = `[data-commentid="${commentId}"]`;
			const comment = this.elem.querySelector(`[data-role="commentFeed"] ${commentSelector}`);
			if (comment) {
				return comment;
			} else if (this.elem.dataset.feedid) {
				const feedSelector = `[data-feedid="${this.elem.dataset.feedid}"]`;
				return document.querySelector(`${feedSelector}${commentSelector}, ${feedSelector} ${commentSelector}`) || null;
			}

			return null;
		},

		/**
		 * Responds to an event (trigger within this controller) indicating a new comment has been added
		 * Show it, and reset the contents of tiptap
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		addToCommentFeed(e, data) {
			if (typeof data?.content !== "string" || data.feedID !== this._commentFeedID) {
				return;
			}

			// skip if the content is empty - in the case of guest posting
			const content = $('<div/>').append(typeof data.content === 'string' ? data.content : '');
			const comment = content.find('.js-ipsEntry');

			if( comment.length ){
				let commentFeed = this.scope.find('[data-role="commentFeed"]');

				if (commentFeed.find('[data-role="moderationTools"]').length) {
					commentFeed = commentFeed.find('[data-role="moderationTools"]');
				}

				// Hide the 'no comment' text
				this.scope.find('[data-role="noComments"]').remove();

				// If this comment is in the feed already, update what we have
				const actualContent = comment.get(0)
				const id = parseInt(actualContent?.querySelector(`[data-commentid]`)?.dataset.commentid);
				const existing = Number.isInteger(id) && this.findCommentInFeed(id);
				if (existing && existing.parentElement) {
					existing.parentElement.replaceChild(existing, actualContent);
				} else {
					// Add comment content
					commentFeed.append(comment.css({opacity: "0.001"}));
					const newItemTop = comment.offset().top;
					const windowScroll = $(window).scrollTop();
					const viewHeight = $(window).height();

					function _showComment() {
						comment.css({opacity: "1"});
						ips.utils.anim.go('fadeInDown', comment.filter(':not(.ipsHide)'));
					}

					// If needed, scroll to the correct location before showing the comment
					if (data.scrollToItem && ( newItemTop < windowScroll || newItemTop > ( windowScroll + viewHeight ))) {
						$('html, body').animate( { scrollTop: newItemTop + 'px' }, 'fast', function () {
							setTimeout( _showComment, 100 ); // Short delay before fading in comment for pleasantness
						});
					} else {
						_showComment();
					}

					if( ips.utils.db.isEnabled() ){
						const buttons = comment.find('[data-action="multiQuoteComment"]');

						buttons.hide().removeClass('ipsHide');
						ips.utils.anim.go('fadeIn', buttons);
					}
				}
			} else {
				// In theory, this could be a bug so let's log it
				Debug.log(`core.front.core.commentFeed:addToCommentFeed() - Invalid content provided to addToCommentFeed. The data.content property is supposed to contain HTML with an element that has the \`js-ipsEntry\` class. This may be expected, as in the case of posts held for approval.`);
				if (Debug.isEnabled()) {
					console.log(data); // use console.log to preserve stack trace
				}
			}

			if( !('resetEditor' in data) || data.resetEditor !== false ){
				this.scope.find('[data-role="replyArea"] [data-ipsEditorv5]').data('_editor').reset();
			}

			this._updateCount(data.totalItems);
			if (ips.getSetting('relativeDates')) {
				this._updateTimestamps();
			}
			$( document ).trigger( 'contentChange', [ this.scope ] );
		},
		
		/**
		 * Responds to an event indicating that a comment has been deleted
		 * Show it, and reset the contents of tiptap
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		deletedComment: function( e, data ) {
			data = JSON.parse( data.response );
			var self = this;

			if( data.type == 'redirect' ) {
				window.location = data.url;
			}
			else {
				this._updateCount( data.total );
			}

		},
		
		/**
		 * Update comment count
		 *
		 * @param	{int}	newTotal	The new total
		 * @returns 	{void}
		 */
		_updateCount: function(newTotal) {
			if ( this.scope.find('[data-role="comment_count"]') ) {
				var langString = 'js_num_comments';
				if ( this.scope.find('[data-role="comment_count"]').attr('data-commentCountString') ) {
					langString = this.scope.find('[data-role="comment_count"]').attr('data-commentCountString');
				}
				this.scope.find('[data-role="comment_count"]').text( ips.pluralize( ips.getString( langString ), newTotal ) );
			}
		},

		/**
		 * Event handler for the 'Quote x posts' button in multiquote popup
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		doMultiQuote: function (e) {

			var mqData = this._getMultiQuoteData();
			var replyArea = this.scope.find('[data-role="replyArea"]');
			var output = [];

			if( !Object.keys( mqData ).length || !replyArea.is(':visible') ){
				return;
			}

			// Build quote array and trigger event for the editor widget to deal with
			for (const value of Object.values( mqData )){
				output.push( value );
			};

			ips.ui.editorv5.getObjWithInit(this.scope.find('[data-role="replyArea"] [data-ipsEditorv5]'), function (editor) {
				editor.insertQuotes(output);
			});

			this._removeAllMultiQuoted();
		},

		/**
		 * Event handler for the 'clear' button in the multiquote popup
		 * Simply calls _removeAllMultiQuoted to do the clear
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		clearMultiQuote: function (e) {
			this._removeAllMultiQuoted();
		},

		/**
		 * Removes all quoted posts
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		_removeAllMultiQuoted: function () {
			var mqData = this._getMultiQuoteData();
			var self = this;
			
			// Delete all the multi-quoted posts from DB
			ips.utils.db.set( 'mq', 'data', {} );

			// Hide popup
			this._buildMultiQuote(0);

			if( !Object.keys( mqData ).length ){
				return;
			}

			// Loop through each quoted posts and see if it exists on this page by building a selector,
			// then updating classnames on elements that match it
			for (const value of Object.values( mqData )){
				self.triggerOn( 'core.front.core.comment', 'setMultiQuoteDisabled.comment', {
					contentapp: value.contentapp,
					contenttype: value.contenttype,
					contentcommentid: value.contentcommentid
				});
			};
		},

		/**
		 * Responds to an addMultiQuote event
		 * Adds the provided post data to the multiquote DB entry and updates the popup
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		addMultiQuote: function (e, data) {
			var mqData = this._getMultiQuoteData();
			var key = data.contentapp + '-' + data.contenttype + '-' + data.contentcommentid;
			
			// Have we hit a limit?
			if( Object.keys( mqData ).length == this._maximumMultiQuote )
			{
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.pluralize( ips.getString( 'maxmultiquote' ), this._maximumMultiQuote ),
					callbacks: {
						ok: function () {
							$("button[data-mqId='" + data.button + "']").removeClass('ipsButton--secondary')
								.addClass('ipsButton--simple')
								.removeAttr('data-mqActive')
								.html( ips.templates.render('core.posts.multiQuoteOff') );
						}
					}
				});
				return false;
			}

			mqData[ key ] = data;

			ips.utils.db.set( 'mq', 'data', mqData );

			this._buildMultiQuote( Object.keys( mqData ).length );
		},

		/**
		 * Responds to a removeMultiQuote event
		 * Removes the provided post data from the multiquote DB entry and updates the popup
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		removeMultiQuote: function (e, data) {
			var mqData = this._getMultiQuoteData();
			var key = data.contentapp + '-' + data.contenttype + '-' + data.contentcommentid;

			if( mqData[ key ] !== undefined ){
				delete mqData[key];

				ips.utils.db.set( 'mq', 'data', mqData );

				this._buildMultiQuote( Object.keys( mqData ).length );
			}
		},

		/**
		 * Returns the current multiquote data from the localStorage
		 *	
		 * @returns 	{object} 	Multiquote data from localStorage
		 */
		_getMultiQuoteData: function () {
			// Get the IDs we already have saved
			var mqData = ips.utils.db.get('mq', 'data');

			if( mqData === null || typeof mqData !== "object" ){
				return {};
			}

			return mqData;
		},

		/**
		 * Called when the controller is initialized
		 * Checks whether there's any mq data, and shows the popup if so
		 *	
		 * @returns 	{void}
		 */
		_setUpMultiQuote: function () {

			if( !ips.utils.db.isEnabled() ){
				return;
			}

			var buttons = this.scope.find('[data-action="multiQuoteComment"]');
			var self = this;
			var mqData = this._getMultiQuoteData();

			buttons.show();

			if( Object.keys( mqData ).length ){
				this._buildMultiQuote( Object.keys( mqData ).length );

				// Loop through each quoted posts and see if it exists on this page by building a selector,
				// then updating classnames on elements that match it
				for (const value of Object.values( mqData )){
					self.triggerOn( 'core.front.core.comment', 'setMultiQuoteEnabled.comment', {
						contentapp: value.contentapp,
						contenttype: value.contenttype,
						contentcommentid: value.contentcommentid
					});
				};
			}			
		},

		/**
		 * Builds the multiquote popup, either from a template if this is the first time,
		 * or updates the value if it already exists.
		 *	
		 * @param 		{number} 	count 		Count of quoted posts
		 * @returns 	{void}
		 */
		_buildMultiQuote: function (count) {
			var quoterElem = $('#ipsMultiQuoter');

			if( !quoterElem.length && count ){
				ips.getContainer().append( ips.templates.render('core.posts.multiQuoter', {
					count: ips.getString('multiquote_count', {
						count: ips.pluralize( ips.getString( 'multiquote_count_plural' ), [ count ] )
					}),
					commentFeedId: this._containerID
				}));

				document.getElementById("ipsMultiQuoter").showPopover();
			} else {

				// Since we only show one global multiquote button (not per-feed), the existing button
				// might have been created/shown by another feed on the same page. We'll assume the latest 
				// comment feed to show is the one the user cares about, and update the button attributes 
				// so that this controller properly handles clicks on it.
				if( quoterElem.attr('data-commentsContainer') !== this._containerID ){
					quoterElem
						.attr('data-commentsContainer', this._containerID )
						.find('[data-role^="multiQuote_"]')
							.attr('data-role', 'multiQuote_' + this._containerID)
						.end()
						.find('[data-action^="clearQuoted_"]')
							.attr('data-action', 'clearQuoted_' + this._containerID);
				}

				quoterElem.find('[data-role="quotingTotal"]').text( 
					ips.pluralize( ips.getString( 'multiquote_count_plural' ), [ count ] )
				);
				// Hide or show multi-quote button depending on selected posts
				quoterElem[0].togglePopover(count);
				
			}
		},

		/**
		 * Returns the largest ID number on the page, taking into account the fact that the topic
		 * wrapper may specify a higher ID (in cases where a question's answer is on a different page)
		 *	
		 * @param 		{array} 	commentsOnThisPage 		Array of comments on this page, based on having the [data-commentid] attribute
		 * @returns 	{number}
		 */
		_getLastSeenID: function (commentsOnThisPage) {
			var commentFeed = this.scope.find('[data-role="commentFeed"]');
			var max = 0;

			for (const comment of commentsOnThisPage) {
				const id = Number(comment.dataset.commentid);
				if (id > max) {
					max = id;
				}
			}

			const topicAnswerID = Number(commentFeed.attr('data-topicAnswerID'));

			if (topicAnswerID && topicAnswerID > max) {
				max = topicAnswerID;
			}

			Debug.log("Max comment ID is " + max);
			return max;
		},

		/**
		 * Update timestamps in this
		 *
		 * @returns {Promise<void>}
		 * @private
		 */
		async _updateTimestamps() {
			if (!ips.getSetting('relativeDates')) {
				return;
			}

			Debug.log('Updating the comment feed timestamps')

			/** @type {Map<HTMLTimeElement, number>} */
			const timestampMap = new Map();
			/** @type {Set<HTMLElement>} */
			const roots = new Set([this.elem]);

			// first, make sure that if there are comments outside the feed's HTML element, like the first post in simplified mode, we include those in the query
			if (this.elem.dataset.feedid) {
				for (const el of document.querySelectorAll(`[data-feedid="${this.elem.dataset.feedid}"]`)) {
					roots.add(el);
				}
			}

			// Collect all time elements
			roots.forEach(root => {
				for (const el of root.querySelectorAll('time.ipsTime[datetime]:not(.ipsTime .ipsTime, time time)')) {
					if (OLD_TIME_ELEMENTS.has(el)) {
						continue;
					}

					if (el instanceof HTMLTimeElement) {
						// we don't care if it was over a day ago. This code is just to prevent new posts from having a later time than old ones
						const unixts = Math.round((new Date(el.dateTime)).getTime() / 1000);
						if (unixts <= Math.round(Date.now() / 1000) - 86400) {
							OLD_TIME_ELEMENTS.add(el);
							continue;
						}
						timestampMap.set(el, unixts);
					}
				}
			})


			const parsedResults = {};
			// get the ajax content
			const timestamps = Array.from(new Set(timestampMap.values()));
			if (!timestamps.length) {
				return;
			}

			// get what we have locally
			const timestampCacheKeys = {};
			const unknownTimestamps = [];
			for (const timestamp of timestamps) {
				const deltaMinutes = Math.round(((Date.now() / 1000) - timestamp) / 60);
				timestampCacheKeys[timestamp.toString()] = `time_${deltaMinutes < 0 ? 'neg' : 'pos'}_${Math.abs(deltaMinutes)}`;
				const cached = ips.utils.db.get('formatted_timestamps', timestampCacheKeys[timestamp.toString()])
				if (cached) {
					// Debug.log(`Using known formatted timestamp for ${deltaMinutes} minutes`);
					const cachedEl = (new DOMParser()).parseFromString(cached, "text/html").querySelector("body > time");
					if (cachedEl instanceof HTMLTimeElement) {
						parsedResults[`time_${timestamp}`] = cachedEl;
						continue;
					}
				}
				unknownTimestamps.push(timestamp);
			}

			// fetch whatever we don't know
			if (unknownTimestamps.length) {
				const result = await ips.fetch(ips.getSetting('baseURL'), {
					data: {
						app: 'core',
						module: 'system',
						controller: 'ajax',
						do: "getFormattedTimes",
						timestamps: unknownTimestamps.join(',')
					}
				});

				// now convert to html elements
				if (typeof result?.timestamps !== 'object') {
					Debug.warn("Unexpected response from ajax timestamps!");
				} else {
					for (const ts in result.timestamps) {
						const timeEl = (new DOMParser()).parseFromString(result.timestamps[ts], 'text/html').querySelector("body > time");
						if (timeEl instanceof HTMLTimeElement) {
							if (ts.match(/time_(\d+)/)?.[1] in timestampCacheKeys) {
								ips.utils.db.set('formatted_timestamps', timestampCacheKeys[ts.match(/time_(\d+)/)?.[1]], timeEl.outerHTML);
							}
							parsedResults[ts] = timeEl;
						}
					}
				}
			}

			// actually update the time elements in the page
			for (const [timeEl, timeStamp] of timestampMap.entries()) {
				const key = "time_" + timeStamp;
				if (key in parsedResults) {
					timeEl.innerHTML = parsedResults[key].innerHTML;
					timeEl.dataset.short = parsedResults[key].dataset.short;
				} else {
					Debug.warn(`Didn't get a formatted time for the timestamp ${timeStamp}.`)
				}
			}
		}
	});

	/** @type {WeakSet<HTMLTimeElement>} */
	const OLD_TIME_ELEMENTS = new WeakSet();
}(jQuery));