/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.comment.js - General controller for comments
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.comment', {

		_quoteData: null,
		_commentContents: '',
		_quotingDisabled: false,
		_quoteTimeout: null,
		_isEditing: false,
		_clickHandler: null,
		/**
		 * @type {IntersectionObserver|null|false}
		 */
		_observer: null,
		
		initialize: function () {		
			// Get the menu id from the menu link
			for(const link of this.scope.find('[popovertarget^="elcomment_"]')) {
				const menuSelector = $(link).attr('popovertarget');

				// Events from within scope
				for (const action of ['editComment', 'deleteComment', 'approveComment']) {
					this.on(document, 'click', `#${menuSelector} [data-action="${action}"]`, this[action]);
				}
			}
			for (const action of ['quoteComment', 'multiQuoteComment', 'rateReview', 'cancelEditComment']) {
				this.on( 'click', `[data-action="${action}"]`, this[action]);
			}

			this.on( 'submit', 'form', this.submitEdit );
			this.on( 'change', 'input[type="checkbox"][data-role="moderation"]', this.commentCheckbox );
			this.elem.addEventListener('ipsCalcQuote', () => this.inlineQuote())
			this.on( 'click', '[data-action="quoteSelection"]', this.quoteSelection );
			this.on( 'submitDialog', '[data-action="recommendComment"]', this.recommendComment );
			this.on( 'click', '[data-action="unrecommendComment"]', this.unrecommendComment );
			this.on( 'tabChanged', this.tabChanged );

			// Events sent down by the commentFeed controller
			this.on( 'setMultiQuoteEnabled.comment setMultiQuoteDisabled.comment', this.setMultiQuote );
			this.on( 'disableQuoting.comment', this.disableQuoting );

			// Model events that are handled all at once
			this.on( document, 'getEditFormLoading.comment saveEditCommentLoading.comment ' + 
									'deleteCommentLoading.comment', this.commentLoading );
			
			this.on( document, 'getEditFormDone.comment saveEditCommentDone.comment ' + 
									'deleteCommentDone.comment', this.commentDone );

			// Model events
			this.on( document, 'getEditFormDone.comment', this.getEditFormDone );
			this.on( document, 'getEditFormError.comment', this.getEditFormError );
			//---
			this.on( document, 'saveEditCommentDone.comment', this.saveEditCommentDone );
			this.on( document, 'saveEditCommentError.comment', this.saveEditCommentError );
			//---
			this.on( document, 'deleteCommentDone.comment', this.deleteCommentDone );
			this.on( document, 'deleteCommentError.comment', this.deleteCommentError );
			//---
			this.on( document, 'unrecommendCommentDone.comment', this.unrecommendCommentDone );
			this.on( document, 'unrecommendCommentError.comment', this.unrecommendCommentError );
			//---
			this.on( document, 'approveCommentLoading.comment', this.approveCommentLoading );
			this.on( document, 'approveCommentDone.comment', this.approveCommentDone );
			this.on( document, 'approveCommentError.comment', this.approveCommentError );

			this.setup();
		},
		
		/**
		 * Setup method for comments
		 *
		 * @returns {void}
		 */
		setup: function () {
			this._commentID = this.scope.attr('data-commentID');
			this._clickHandler = this._hideQuoteTooltip.bind(this);
			this._setupIntersectionObserver();
			this._setupShareCommentDialog();


            /* Check to see if we have a findComment fragment and then handle that */
            const fragment = window.location.hash;
            const match = fragment.match( /#find(Review|Comment)-(\d+)/ ) ;

            if (match) {
                const type = match[1]
                const commentId = match[2];
                const elementId = `find${type}-${commentId}`;

                const element = document.getElementById(elementId);

                if ( ! element) {
                    // The element doesn't exist on this page. It might have been deleted or it might now be on another page or in another topic
					const currentUrl = new URL(window.location.href);
					currentUrl.updateSearchParams({
						params: {
							do: `find${type}`,
							[type.toLowerCase()]: commentId.toString()
						}
					});

                    // Update the URL and reload the page
                    window.location.href = currentUrl;
                }
            }
        },

		destroy: function () {
			// --
		},

		/**
		 * Watches for tab changes.
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from tab widget
		 * @returns 	{void}
		 */
		tabChanged: function (e, data) {
			// We have switched between comments and review, so clear cached menu data
			this._menu = undefined;
			this.getMenu();
		},

		/**
		 * Event handler for selective quoting, called on mouseup (after user has dragged/clicked)
		 * Get the selected text, then leave a short timeout before showing the tooltip
		 * @returns	{void}
		 */
		inlineQuote: function () {
			var self = this;
			var quoteButton = this.scope.find('[data-action="quoteComment"]');

			if( this._isEditing || this._quotingDisabled || !quoteButton.length ){
				return;
			}

			// When Reviews/Comments are shown, don't allow quoting when Reviews tab is active
			let activeReviewsTab = document.querySelector('[data-controller="core.front.core.commentsWrapper"] i-tabs [id$="_reviews"][aria-selected="true"]');
			if(activeReviewsTab){
				return;
			}

			self._checkQuoteStatus();
		},

		/**
		 * Event handler for recommending comments. Triggered by the dialog being submitted and a successful response
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns	{void}
		 */
		recommendComment: function (e, data) {

			var commentHtml = $('<div>' + data.response.comment + '</div>').find('[data-controller="core.front.core.comment"]').html();

			this.scope
				.html( commentHtml )
				.closest('.ipsEntry')
					.addClass('ipsEntry--popular');

			// Let document know
			$( document ).trigger( 'contentChange', [ this.scope ] );

			// Set up multiquote in this comment
			if( ips.utils.db.isEnabled() ){
				this.scope.find('[data-action="multiQuoteComment"]').removeClass('ipsHide');
			}

			this.trigger('refreshRecommendedComments', {
				scroll: true,
				recommended: data.response.recommended
			});
		},

		/**
		 * Event handler for un-recommending comments.
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns	{void}
		 */
		unrecommendComment: function (e, data) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');

			this.trigger( 'unrecommendComment.comment', {
				url: url,
				commentID: this._commentID
			});
		},

		/**
		 * Unrecommending a comment was successful (triggered by comment model)
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns	{void}
		 */
		unrecommendCommentDone: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			var commentHtml = $('<div>' + data.comment + '</div>').find('[data-controller="core.front.core.comment"]').html();
			console.log(commentHtml);

			this.scope
				.html( commentHtml )
				.closest('.ipsEntry')
					.removeClass('ipsEntry--popular')
					.find('.ipsEntry__popularFlag')
						.remove();
					

			// Flash message
			ips.ui.flashMsg.show( ips.getString( 'commentUnrecommended' ) );

			// Tell the recommended overview to remove it
			this.trigger('removeRecommendation', {
				commentID: data.unrecommended
			});
		},

		/**
		 * Unrecommending a comment failed
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns	{void}
		 */
		unrecommendCommentError: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			window.reload();
		},

		/**
		 * Figure out if our selected text has changed
		 *
		 * @returns	{void}
		 */
		_checkQuoteStatus: function () {
			var selectedText = ips.utils.selection.getSelectedText( '[data-role="commentContent"]', this.scope.find('[data-role="commentContent"]').parent() );
			var ancestor = ips.utils.selection.getCommonAncestor();

			if( selectedText.trim() === '' ){
				this._hideQuoteTooltip();
				return;
			}

			if( ancestor && ancestor.closest('.ipsCode').length ){
				// If we've selected inside a code block, wrap our selected text too
				selectedText = "<pre class='ipsCode prettyprint'>" + selectedText + "</pre>";
			} else if( !selectedText.startsWith('<') ) {
				// If the user selects a bunch of text that contains HTML, the browser will automatically wrap it for us. But if the user
				// just selects some plain text, that's all we get. So in that case, we'll wrap it ourselves.
				selectedText = '<p>' + selectedText + '</p>';
			}

			if( this._selectedText === selectedText ){
				return;
			}
			
			this._selectedText = selectedText;
			
			this._showQuoteTooltip();
		},

		/**
		 * Builds & shows the selective quoting tooltip, displaying it just above the user's cursor
		 *
		 * @returns	{void}
		 */
		_showQuoteTooltip: function () {
			var selection = ips.utils.selection.getSelection();
			var range = ips.utils.selection.getRange( this.scope.find('[data-role="commentContent"]') );
			var tooltip = this.scope.find('[data-role="inlineQuoteTooltip"]');
			var position = {
				left: 0,
				top: 0
			};

			if( range === false || typeof range !== "object" || range === null || range.type === undefined ){ // No selection found
				Debug.log("No selection found");
				return;
			}

			// Create the new tooltip if needed
			if( !tooltip.length ){
				this.scope.append( ips.templates.render('core.selection.quote', {
					direction: 'bottom'//ips.utils.events.isTouchDevice() ? 'bottom' : 'top'
				}) );	
				tooltip = this.scope.find('[data-role="inlineQuoteTooltip"]');
				$( document ).on( 'click dblclick', this._clickHandler );
			}

			if ( range.type === 'outside' ){ 
				// Selection was beyond our content area, so we need to limit it to end of the content
				// Get the bounding of the selection to use as the basis of our tooltip position
				var boundingBox = range.range.getBoundingClientRect();
				var offset = this.scope.offset();

				position.left = boundingBox.left + ( boundingBox.width / 2 ) + $( window ).scrollLeft() - offset.left;
				position.top = boundingBox.top + boundingBox.height + $( window ).scrollTop() - offset.top;
			} else { 
				// Normal selection, inside content, so we can position based on the Range directly
				// Clone the range, and insert an element containing an invisible character which we'll use
				// to fetch the position
				var cloneRange = range.range.cloneRange();
				var invisibleElement = document.createElement('span');
				invisibleElement.appendChild( document.createTextNode('\ufeff') );

				// Collapse the range so that we only care about the end position
				cloneRange.collapse( false );

				// Insert our invisible element into the range
				cloneRange.insertNode( invisibleElement );

				// Get the position of the invisible element we created
				var tmpPosition = ips.utils.position.getElemPosition( $( invisibleElement ) );

				position.left = tmpPosition.absPos.left;
				position.top = tmpPosition.absPos.top + 25;

				// Remove the invisible element (fixes #1758)
				invisibleElement.parentNode.removeChild(invisibleElement);
			}	

			tooltip[0].showPopover();
			var tooltipSize = {
				width: tooltip.outerWidth(),
				height: tooltip.outerHeight()
			};

			// Set the position
			var leftAdjustment = tooltipSize.width / 2;

			tooltip.css({
				'--_left': Math.round( position.left - leftAdjustment ) + 'px',
				'--_top': Math.round( position.top ) + 'px'
			});

			// If the tooltip isn't already shown, fade it in
			tooltip[0].showPopover();
		},

		/**
		 * Hide the selective quote tooltip
		 *
		 * @returns	{void}
		 */
		_hideQuoteTooltip: function () {
			$( document ).off( 'click dblclick', this._clickHandler );
			this.scope.find('[data-role="inlineQuoteTooltip"]')[0]?.hidePopover();
			this._selectedText = '';
		},

		/**
		 * Get a jquery selector representing the feed of this element
		 * @return {jQuery}
		 */
		feedJQ() {
			if (this.elem.dataset.feedid) {
				// First, try to get an ancestor
				const closest = this.elem.closest(`[data-feedid=${this.elem.dataset.feedid}][data-controller*="core.front.core.commentFeed"]`);
				if (closest) {
					return $(closest);
				}

				// Now try to get one anywhere
				const feed = document.querySelector(`[data-feedid=${this.elem.dataset.feedid}][data-controller*="core.front.core.commentFeed"]`);
				if (feed) {
					return $(feed);
				}

				// Still here? Log an error
				Debug.warn(`The comment feed for a comment could not be identified. This can be prevented by ensuring the comment and its feed have macthing data-feedid attributes (comment's feedid: ${this.elem.dataset.feedid})`);
			} else {
				Debug.warn(`A comment is missing its data-feedid attribute, so its comment feed could not be identified. This can be prevented by ensuring the comment and its feed have macthing data-feedid attributes`);
			}

			// May as well make it obvious which element this is
			Debug.warn(this.elem);

			return $(this.elem.closest(`[data-controller*="core.front.core.commentFeed"]`) || this.elem);
		},

		/**
		 * Event handler for clicking 'quote this' in the selective quote tooltip
		 * Triggers an event sent to the comment feed
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns	{void}
		 */
		quoteSelection: function (e) {
			this._getQuoteData();

			if( this._selectedText ){
				this.feedJQ().trigger('quoteComment.comment', {
					userid: this._quoteData.userid,
					username: this._quoteData.username,
					timestamp: this._quoteData.timestamp,
					contentapp: this._quoteData.contentapp,
					contenttype: this._quoteData.contenttype,
					contentclass: this._quoteData.contentclass,
					contentid: this._quoteData.contentid,
					contentcommentid: this._quoteData.contentcommentid,
					quoteHtml: this._selectedText,
					citeurl: $(this.elem).get(0).querySelector(".ipsEntry__date[href]")?.getAttribute('href')
				});
			}

			this._hideQuoteTooltip();
		},

		/**
		 * Triggered when the moderation checkbox is changed
		 *	
		 * @param 		{event}		e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		commentCheckbox: function (e) {
			var checked = $( e.currentTarget ).is(':checked');
			this.scope.closest('.js-ipsEntry').toggleClass( 'ipsEntry--selected', checked );
			this.scope.closest('.js-ipsEntry').find('label[for=' + $( e.currentTarget ).attr('id') + ']').toggleClass( 'ipsInput--pseudoChecked', checked );

			this.feedJQ().trigger('checkedComment.comment', {
				commentID: this._commentID,
				actions: $( e.currentTarget ).attr('data-actions'),
				checked: checked
			});
		},

		/**
		 * The comment feed has told us we can't support quoting
		 *	
		 * @returns 	{void}
		 */
		disableQuoting: function () {
			this._quotingDisabled = true;
			this.scope.find('[data-ipsQuote-editor]').remove();
		},
		
		/**
		 * Event handler for the rate review buttons.
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		rateReview: function (e) {
			e.preventDefault();
			var self = this;

			ips.getAjax()( $( e.currentTarget ).attr('href') )
				.done( function (response) {
					var content = $("<div>" + response + "</div>");
					self.scope.html( content.find('[data-controller="core.front.core.comment"]').contents() );

					$( document ).trigger( 'contentChange', [ self.scope ] );
				})
				.fail( function (err) {
					window.location = $( e.currentTarget ).attr('href');
				});
		},

		_menu: undefined,

		/**
		 * Get the menu element for this comment
		 *
		 * @returns {HTMLElement|null}
		 */
		getMenu() {
			if (!this._menu) {
				// Review or comments active?
				let activeTabId = this.elem.closest(`[data-commentstype="reviews"]`) ? 'elReview' : 'elComment';

				let commentFeed = this.scope.get(0)?.closest('[data-controller]')
				while(commentFeed && !commentFeed.dataset.controller?.includes('core.front.core.commentFeed')) {
					commentFeed = commentFeed.parentElement?.closest('[data-controller]')
				}
				const menuLink = (commentFeed || document).querySelector('#' + activeTabId + `_${this.scope.get(0)?.dataset['commentid']} [popovertarget]`);
				this._menu = menuLink ? document.querySelector('#' + menuLink.getAttribute('popovertarget')) : null;
			}
			return this._menu;
		},

		/**
		 * Set up the comment dialog so that clicking the share link copies it to the clipboard
		 */
		_setupShareCommentDialog() {
			const shareButton = this.getMenu()?.querySelector('[data-role="shareComment"], [data-role="shareReview"]');
			const shareMenu = shareButton?.dataset.ipsdialogContent ? document.querySelector(shareButton.dataset.ipsdialogContent) : null;
			const copyToClipboard = shareMenu?.querySelector('[data-role="shareButton"]');
			let shared = false;
			if (window.isSecureContext && copyToClipboard) {
				copyToClipboard.onclick = e => e.preventDefault()
				copyToClipboard?.addEventListener('pointerdown', async e => {
					e.preventDefault();
					const href = copyToClipboard.getAttribute('href');
					const cb = async e => {
						copyToClipboard.removeEventListener('pointerup', cb)
						if (window.navigator?.clipboard?.writeText instanceof Function) {
							e.preventDefault()
							await window.navigator.clipboard.writeText(href);
						} else {
							const fakeElement = document.createElement('span')
							fakeElement.innerText = href;
							document.body.appendChild(fakeElement)
							const range = new Range();
							range.setStart(fakeElement, 0)
							range.setEnd(fakeElement, fakeElement.childNodes.length)
							const originalRanges = []
							for (let i = 0; i < document.getSelection().rangeCount; i++) {
								originalRanges.push(document.getSelection().getRangeAt(i))
							}
							document.getSelection().removeAllRanges()
							document.getSelection().addRange(range)
							document.execCommand('copy')
							fakeElement.remove();
							document.getSelection().removeAllRanges()
							for (const range of originalRanges) {
								document.getSelection().addRange(range)
							}
						}
						ips.ui.flashMsg.show(ilang`copied`)


						// If we're tracking post view data, we're tracking post ranking on a Cloud site and should also send this
						if (!shared && ips.utils.contentViews.enabled() && this.scope.get(0).dataset.commentapp === 'forums') {
							shared = true;
							ips.getAjax()(`${location.protocol}${ips.getSetting("baseURL")}/?app=core&module=system&controller=ajax&do=trackPostShareIntent&commentId=${this.scope.get(0).dataset.commentid}`)
								.done(() => {
									Debug.log("Sent post share intent");
								})
						}
					}

					copyToClipboard.addEventListener('pointerup', cb)
					copyToClipboard.addEventListener('pointercancel', () => copyToClipboard.removeEventListener('pointerup', cb))
					copyToClipboard.addEventListener('pointerleave', () => copyToClipboard.removeEventListener('pointerup', cb))
				})
			} else if (copyToClipboard) {
				copyToClipboard.setAttribute('hidden', '')
				const shareArea = document.createElement('span')
				const wrap = document.createElement('span')
				if (copyToClipboard.querySelector(':scope > i')) {
					const icon = copyToClipboard.querySelector(':scope > i')
					icon.dataset.ipstooltip = ''
					icon.setAttribute('title', ips.getString('core_comment_share_copy_prompt'))
					wrap.appendChild(icon)
					wrap.append(document.createTextNode('\u00a0'))
				}
				wrap.appendChild(shareArea)
				wrap.classList.add('ipsPageActions__mainLink')
				wrap.dataset.role = 'shareButton'
				shareArea.innerText = copyToClipboard.getAttribute('href')
				copyToClipboard.parentElement.insertBefore(wrap, copyToClipboard)
				wrap.onclick = () => {
					const range = new Range();
					range.setStart(shareArea, 0)
					range.setEnd(shareArea, shareArea.childNodes.length)
					document.getSelection().removeAllRanges()
					document.getSelection().addRange(range)
					try {
						if (document.execCommand instanceof Function) {
							document.execCommand?.('copy')
							ips.ui.flashMsg.show(ips.getString('copied'))
						}
					} catch (e) {}
				}
			}
		},

		/**
		 * Event fired on this controller by a core.commentFeed controller to tell us which
		 * multiquote buttons are enabled presently. Here we check whether this applies to us, and toggle
		 * the button if so.
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		setMultiQuote: function (e, data) { 
			var selector = '[data-commentApp="' + data.contentapp + '"]';
				selector += '[data-commentType="' + data.contenttype + '"]';
				selector += '[data-commentID="' + data.contentcommentid + '"]';

			if( this.scope.is( selector ) ){
				if( e !== null && e.type == 'setMultiQuoteEnabled') {
					
					this.scope.find('[data-action="multiQuoteComment"]')
						.removeClass('ipsButton--simple')
						.addClass('ipsButton--secondary')
						.attr( 'data-mqActive', true )
						.html( ips.templates.render('core.posts.multiQuoteOn') );

				} else if( e === null || e.type == 'setMultiQuoteDisabled' ) {

					this.scope.find('[data-action="multiQuoteComment"]')
						.addClass('ipsButton--simple')
						.removeClass('ipsButton--secondary')
						.removeAttr( 'data-mqActive' )
						.html( ips.templates.render('core.posts.multiQuoteOff') );

				}
			}
		},

		/**
		 * Event handler for the Quote button. Triggers a quoteComment event for the
		 * commentFeed controller to handle.
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		quoteComment: function (e) {
			e.preventDefault();
			
			if( !this._getQuoteData() ){
				Debug.error("Couldn't get quote data");
				return;
			}

			var html = this._prepareQuote( $('<div/>').html( this.scope.find('[data-role="commentContent"]').html() ) );
			
			// Send the event up the chain to the commentFeed controller for handling
			this.feedJQ().trigger( 'quoteComment.comment', {
				userid: this._quoteData.userid,
				username: this._quoteData.username,
				timestamp: this._quoteData.timestamp,
				contentapp: this._quoteData.contentapp,
				contenttype: this._quoteData.contenttype,
				contentclass: this._quoteData.contentclass,
				contentid: this._quoteData.contentid,
				contentcommentid: this._quoteData.contentcommentid,
				quoteHtml: html.html(),
				citeurl: $(this.elem).get(0).querySelector(".ipsEntry__date[href]")?.getAttribute('href')
			});
		},

		/**
		 * MultiQuote comment handler
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		multiQuoteComment: function (e) {
			e.preventDefault();

			if( !this._getQuoteData() ){
				Debug.error("Couldn't get quote data");
				return;
			}
			
			var button = $( e.currentTarget );
			var mqActive = button.attr('data-mqActive');

			var html = this._prepareQuote( $('<div/>').html( this.scope.find('[data-role="commentContent"]').html() ) );

			this.feedJQ().trigger( ( mqActive ) ? 'removeMultiQuote.comment' : 'addMultiQuote.comment', {
				userid: this._quoteData.userid,
				username: this._quoteData.username,
				timestamp: this._quoteData.timestamp,
				contentapp: this._quoteData.contentapp,
				contenttype: this._quoteData.contenttype,
				contentclass: this._quoteData.contentclass,
				contentid: this._quoteData.contentid,
				contentcommentid: this._quoteData.contentcommentid,
				quoteHtml: html.html(),
				button: button.attr('data-mqId'),
				citeurl: $(this.elem).get(0).querySelector(".ipsEntry__date[href]")?.getAttribute('href')
			});

			if( mqActive ){
				button
					.removeClass('ipsButton--secondary')
					.addClass('ipsButton--simple')
					.removeAttr('data-mqActive')
					.html( ips.templates.render('core.posts.multiQuoteOff') );
			} else {
				button
					.removeClass('ipsButton--simple')
					.addClass('ipsButton--secondary')
					.attr( 'data-mqActive', true )
					.html( ips.templates.render('core.posts.multiQuoteOn') );
			}
		},

		/**
		 * Edit comment handler
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		editComment: function (e) {
			e.preventDefault();
			
			this._commentContents = this.scope.find('[data-role="commentContent"]').html();
			
			var url = $( e.currentTarget ).attr('href');

			this.trigger( 'getEditForm.comment', {
				url: url,
				commentID: this._commentID
			});
		},
		
		/**
		 * Called when a cancel link is clicked
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		cancelEditComment: function (e) {
			e.preventDefault();
			
			var self = this;
			
			ips.ui.alert.show( {
				type: 'verify',
				icon: 'warn',
				message: ips.getString('cancel_edit_confirm'),
				subText: '',
				buttons: { yes: ips.getString('yes'), no: ips.getString('no') },
				callbacks: {
					yes: function () {
						ips.ui.editorv5.destruct( self.scope.find('[data-ipseditorv5]') );
						self.scope.find('[data-role="commentContent"]').html( self._commentContents );
						self.scope.find('[data-role="commentControls"], [data-action="expandTruncate"]').show();
						self.scope.find('[data-action="editComment"]').parent('li').show();
						self.scope.find('[data-role="commentContent"]').addClass('ipsRichText');
						$( document ).trigger( 'contentChange', [ self.scope ] );
					}
				}
			});
		},
		
		/**
		 * Called when a comment edit button is clicked
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitEdit: function (e) {
			e.preventDefault();
			e.stopPropagation(); // This is a form within a form, so we have to prevent it bubbling up otherwise IE gets confused and will try to submit the moderation actions form too

			var form = this.scope.find('form');
			var url = form.attr('action');				
			var data = form.serialize();
			
			form.find('[data-action="cancelEditComment"]').remove();
			form.find('[type="submit"]').prop( 'disabled', true ).text( ips.getString('saving') );
						
			this.trigger( 'saveEditComment.comment', {
				form: data,
				url: url,
				commentID: this._commentID
			});
		},

		/**
		 * Model event: something is loading
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		commentLoading: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			var commentLoading = this.scope.find('[data-role="commentLoading"]');
			
			commentLoading
				.removeClass('ipsHide');
		},

		/**
		 * Model event: something is done loading
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		commentDone: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}


			this.scope
				.find('[data-role="commentLoading"]')
					.addClass('ipsHide');
		},

		/**
		 * Model event: edit form has loaded
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		getEditFormDone: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			let called = false;

			const showForm = () => {
				if (called) return;  // Replacement for _.once from Underscore
				called = true;

				this._isEditing = true;
				this.scope.find('[data-action="expandTruncate"], [data-role="commentControls"]').hide();
				this.scope.find('[data-action="editComment"]').parent('li').hide();
				this.scope.find('[data-role="commentContent"]').html( data.response );

				// Remove ipsRichText so the "revert styles" don't interfere with the edit form
				this.scope.find('[data-role="commentContent"]').removeClass('ipsRichText');
				$( document ).trigger( 'contentChange', [ this.scope.find('[data-role="commentContent"]') ] );
			};

			// Scroll to the comment
			var elemPosition = ips.utils.position.getElemPosition( this.scope );
			var windowScroll = $( window ).scrollTop();
			var viewHeight = $( window ).height();

			// Only scroll if it isn't already on the screen
			if( elemPosition.absPos.top < windowScroll || elemPosition.absPos.top > ( windowScroll + viewHeight ) ){
				$('html, body').animate( { scrollTop: elemPosition.absPos.top + 'px' }, function () {
					showForm();
				});	
			} else {
				showForm();
			}
		},

		/**
		 * Model event: error loading edit form
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		getEditFormError: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			window.location = data.url;
		},

		/**
		 * Model event: saving an edit is finished
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		saveEditCommentDone: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}
			
			ips.ui.editorv5.destruct( this.scope.find('[data-ipseditorv5]') );

			this._isEditing = false;
			this.scope.find('[data-role="commentContent"]').replaceWith( $('<div>' + data.response + '</div>').find('[data-role="commentContent"]') );
			this.scope.trigger('refreshContent');
			this.scope.find('[data-action="expandTruncate"], [data-role="commentControls"]').show();
			this.scope.find('[data-action="editComment"]').parent('li').show();
			
			$( document ).trigger( 'contentChange', [ this.scope ] );

			// There might be a data layer event created for this. Actually sync it after a few ms to make sure the page wasn't redirected somehow.
			setTimeout(() => {
				document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles:true}))
			}, 10);
		},

		/**
		 * Model event: saving an edit failed
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		saveEditCommentError: function (e, data) {
			
			if( data.commentID != this._commentID ){
				return;
			}
			
			ips.ui.alert.show( {
				type: 'alert',
				icon: 'warn',
				message: ips.getString('editCommentError'),
			});
		},
			
		/**
		 * Handler for approving a comment
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		approveComment: function (e) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');

			this.trigger( 'approveComment.comment', {
				url: url,
				commentID: this._commentID
			});
		},

		/**
		 * Model indicates it's starting to approve the comment
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Data object from model
		 * @returns 	{void}
		 */
		approveCommentLoading: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			this.scope
				.find('[data-role="commentControls"]')
					.addClass('i-opacity_4')
						.find('[data-action="approveComment"]')
							.addClass( 'ipsButton--disabled' )
							.text( ips.getString( 'commentApproving' ) );
		},

		/**
		 * Model returned success for approving the comment
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Data object from model
		 * @returns 	{void}
		 */
		approveCommentDone: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			var commentHtml = $('<div>' + data.response + '</div>').find('[data-controller="core.front.core.comment"]').html();

			// Remove moderated classes and update HTML
			this.scope
				.html( commentHtml )
				.removeClass('ipsModerated')
				.closest( '.ipsEntry' )
					.removeClass('ipsModerated');

			// Let document know
			$( document ).trigger( 'contentChange', [ this.scope ] );

			// Set up multiquote in this comment
			if( ips.utils.db.isEnabled() ){
				this.scope.find('[data-action="multiQuoteComment"]').removeClass('ipsHide');
			}

			// And show a flash message
			ips.ui.flashMsg.show( ips.getString( 'commentApproved' ) );
		},

		/**
		 * Model returned an error for approving the comment
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Data object from model
		 * @returns 	{void}
		 */
		approveCommentError: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			window.location = data.url;
		},

		/**
		 * Handler for delete comment
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		deleteComment: function (e) {
			e.preventDefault();

			var url = $( e.currentTarget ).attr('href');
			var commentData = this._getQuoteData();

			var eventData = Object.assign( commentData, {
				url: url,
				commentID: this._commentID
			});
			
			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'warn',
				message: ips.getString('delete_confirm'),
				callbacks: {
					ok: () =>{
						this.feedJQ().trigger( 'deleteComment.comment', eventData );
					}
				}
			});
		},

		/**
		 * Model event: delete comment finished
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		deleteCommentDone: function (e, data) {

			if( data.commentID != this._commentID ){
				return;
			}

			var deleteLink = this.scope.find('[data-action="deleteComment"]');

			// Stuff to HIDE elements on delete
			var toHide = null;
			var toShow = null;

			if( deleteLink.attr('data-hideOnDelete') ){
				toHide = this.scope.find( deleteLink.attr('data-hideOnDelete') );
			} else {
				toHide = this.scope.closest('article');
			}

			toHide.animationComplete( function () {
				toHide.remove();
			});

			ips.utils.anim.go( 'fadeOutDown', toHide );

			// Update count
			if ( deleteLink.attr('data-updateOnDelete') ) {
				$( deleteLink.attr('data-updateOnDelete') ).text( parseInt( $( deleteLink.attr('data-updateOnDelete') ).text() ) - 1 );
			}

			// Stuff to SHOW elements on delete
			if( deleteLink.attr('data-showOnDelete') ) {
				toShow = this.scope.find( deleteLink.attr('data-showOnDelete') );
				ips.utils.anim.go( 'fadeIn', toShow );
			}

			this.feedJQ().trigger( 'deletedComment.comment', {
				commentID: this._commentID,
				response: data.response
			});
			
			setTimeout(() => document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles:true})), 10);
		},

		/**
		 * Model event: delete comment failed
		 *	
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		deleteCommentError: function (e, data) {
			if( data.commentID != this._commentID ){
				return;
			}

			window.location = data.url;
		},

		/**
		 * Prepares post data for quoting
		 *	
		 * @param 		{string|element|jQuery|*} 	html 	Post contents
		 * @returns 	{jQuery|element|*} 	Transformed post contents
		 */
		_prepareQuote: function (html) {
			html = $(html);

			html.find('[data-action="expandTruncate"]').remove();
			/* Remove nested quotes */
			if (![...html.find('> :not(blockquote.ipsQuote)')].some(elem => elem.matches('img,video,iframe,audio,object,embed') || elem.innerText.trim().length || elem.querySelector(':is(img,video,iframe,audio,object,embed):not(blockquote.ipsQuote *)')) && html.find('> blockquote.ipsQuote')) {
				const self = this;
				html.find('> blockquote.ipsQuote').each(function () {
					let child = this.querySelector(':scope > .ipsQuote_contents') || this;
					child.innerHTML = self._prepareQuote($(child.innerHTML)).html();
				});
			} else {
				if (html.find('blockquote.ipsQuote')?.parent()?.get(0)?.matches('div') && html.find('blockquote.ipsQuote').siblings().length === 0) {
					var div = html.find('blockquote.ipsQuote').closest('div');
					div.next('p').find("br:first-child").remove();
					div.remove();
				} else {
					html.find('blockquote.ipsQuote').remove();
				}

				/* Expand spoilers */
				html.find('.ipsStyle_spoilerFancy,.ipsStyle_spoiler').replaceWith(ips.templates.render('core.posts.quotedSpoiler'));

				/* Remove data-excludequote (used for "edited by" byline presently, but can be used by anything) */
				html.find("[data-excludequote]").remove();

				/* Remove the citation */
				html.find('.ipsQuote_citation').remove();

				/* Set the quote value */
				html.find('[data-quote-value]').each(function () {
					$(this).replaceWith('<p>' + $(this).attr('data-quote-value') + '</p>');
				});
			}

			return html;
		},

		/**
		 * Parses the JSON object containing quote data for the comment
		 *	
		 * @returns 	{object} 	Quote data, or else an empty object
		 */
		_getQuoteData: function () {
			if( !this._quoteData ){
				try {
					this._quoteData = JSON.parse( this.scope.attr('data-quoteData') );
					return this._quoteData;
				} catch (err) {
					Debug.log("Couldn't parse quote data");
					return {};
				}
			}

			return this._quoteData;
		},


		/**
		 * Setup an intersection observer to track when the comment's contentis visible on the page
		 *
		 * @private
		 */
		_setupIntersectionObserver() {
			const elem = this.scope.get(0);
			let observer;
			if (ips.utils.contentViews.enabled() && elem.dataset.viewHash) {
				const otherData = typeof elem.dataset.viewTrackingData === 'string' ? JSON.parse(atob(elem.dataset.viewTrackingData)) : {};
				const key = elem.dataset.viewHash;
				ips.utils.contentViews.registerEntity(key, false, otherData, true, () => {
					observer?.disconnect();
				});

				if (this._observer === null) {
					const target = this.scope.get(0);
					if (target instanceof HTMLElement) {
						this._observer = new IntersectionObserver(this.handleIntersection.bind(this), {
							rootMargin: '20px',
							threshold: 0.8
						});

						this._observer.observe(target);
						observer = this._observer;
					} else {
						this._observer = false;
					}
				}
			}
		},

		/**
		 * Handle an intersection observer event
		 *
		 * @param	{IntersectionObserverEntry[]}	entries		The entries from the observer
		 *
		 * @returns void
		 */
		handleIntersection(entries) {
			const key = this.scope?.get(0).dataset.viewHash;
			if (key) {
				ips.utils.contentViews.setIsViewing(key, entries[0].intersectionRatio >= 0.8);
			}
		},
	});

	/** @type {"down"|"up"} */
	let mouseState = 'up';

	/** @type {Set<function():void>} */
	const mouseUpResolvers = new Set();

	/**
	 * Async function which resolves as soon as the mouse is "up"
	 * @return {Promise<void>}
	 */
	function mouseUp() {
		return new Promise(resolve => {
			if (mouseState === "up") {
				resolve()
			} else {
				mouseUpResolvers.add(resolve)
			}
		})
	}

	/**
	 * Function that resolves all pending mouseUp() calls
	 */
	function clearMouseUpResolvers() {
		mouseState = 'up'
		const resolves = [...mouseUpResolvers]
		mouseUpResolvers.clear()
		resolves.forEach(resolve => resolve())
	}

	document.addEventListener('pointerdown', () => mouseState = 'down', {capture: true})
	document.addEventListener('pointerup', clearMouseUpResolvers, {capture: true})
	document.addEventListener('contextmenu', clearMouseUpResolvers, {capture: true})

	/**
	 * Selection change listener for inline quotes
	 */
	document.addEventListener('selectionchange', ips.utils.throttle(() => {
		const selection = document.getSelection();
		for (let i = 0; i < selection.rangeCount; i++) {
			const range = selection.getRangeAt(i);
			const quoteBox = range.commonAncestorContainer instanceof Text ? range.commonAncestorContainer.parentElement.closest('[data-role="commentContent"]') : range.commonAncestorContainer.closest('[data-role="commentContent"]')

			if (quoteBox instanceof Element) {
				mouseUp()
					.then(() => quoteBox.dispatchEvent(new CustomEvent('ipsCalcQuote', {bubbles: true})))
				break;
			}
		}
	}, 1000))
}(jQuery));
