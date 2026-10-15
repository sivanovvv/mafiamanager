/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.messages.list.js - Messages list in messenger
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.messages.list', {

		_messageList: null,
		_searchTimer: null,
		_currentFolder: null,
		_currentMessageID: null,
		_currentOptions: {
			sortBy: 'mt_last_post_time',
			filter: 'all'
		},
		_infScrollURL: null,

		initialize() {
			// Main controller events
			this.on( document, 'messengerReady.messages', this.messengerReady );

			// Menu events
			this.on( 'menuItemSelected', '#elSortByMenu', this.changeSort );
			this.on( 'menuItemSelected', '#elFilterMenu', this.changeFilter );
			
			// Message list events
			this.on( 'click', '[data-messageid]', this.clickMessage );
			this.on( 'submit', '[data-role="moderationTools"]', this.moderationSubmit );

			// Search field
			this.on( 'input', '[data-role="messageSearchText"]', this.inputSearch );
			this.on( 'keydown keypress', '[data-role="messageSearchText"]', this.inputSearch );
			this.on( 'click', '[data-action="messageSearchCancel"]', this.cancelSearch );

			// Folder model events
			this.on( document, 'loadFolderDone.messages', this.loadFolderDone );
			this.on( document, 'loadFolderLoading.messages, searchFolderLoading.messages', this.loadFolderLoading );
			this.on( document, 'loadFolderFinished.messages', this.loadFolderFinished );
			this.on( document, 'searchFolderLoading.messages', this.searchFolderLoading );
			this.on( document, 'searchFolderDone.messages', this.searchFolderDone );
			this.on( document, 'searchFolderFinished.messages', this.searchFolderFinished );
			this.on( document, 'markFolderDone.messages', this.markFolderDone );
			this.on( document, 'deleteMessagesDone.messages', this.deleteMessagesDone );
			this.on( document, 'loadMessageDone.messages', this.markMessageRead );
			
			// Message model events
			this.on( document, 'deleteMessageDone.messages', this.deleteMessageDone );
			this.on( document, 'moveMessageDone.messages', this.moveMessageDone );
			this.on( document, 'addToCommentFeed', this.newMessage );
			this.on( document, 'deletedComment.comment', this.deletedMessage );

			// Primary event that watches for URL changes
			this.on( window, 'historychange:messages', this.stateChange );

			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup() {
			this._messageList = this.scope.find('[data-role="messageList"]');
			this._currentFolder = this.scope.attr('data-folderID');

			this.trigger('setInitialFolder.messages', {
				folderID: this._currentFolder
			});
		},

		/**
		 * Handles submitting the moderation form (which lets uses mass-delete messages)
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		moderationSubmit(e, data) {
			e.preventDefault();

			var self = this;
			var form = this.scope.find('[data-role="moderationTools"]');

			// How many are we deleting?
			var count = parseInt( this.scope.find('[data-role="moderation"]:checked').length );
		
			if ( this.scope.find('[data-role="pageActionOptions"]').find('select option:selected').val() == 'move' ) {
				var dialog = ips.ui.dialog.create( { remoteVerify: false, size: 'narrow', remoteSubmit: false, title: ips.getString('messagesMove'), url: form.attr('action') + '&do=moveForm&ids=' + Array.from(self.scope.find('[data-role="moderation"]:checked')).map(item => $(item).closest('[data-messageid]').attr('data-messageid')).join(',') } );
				dialog.show();
			} else {
				ips.ui.alert.show( {
					type: 'confirm',
					icon: 'question',
					message: ( count > 1 ) ? ips.pluralize( ips.getString( 'messagesDeleteMany' ), count ) : ips.getString('messagesDelete'),
					subText: ( count > 1 ) ? ips.getString( 'messagesDeleteManySubText' ) : ips.getString('messagesDeleteSubText'),
					callbacks: {
						ok() {
							// Get IDs
							var ids = Array.from( self.scope.find('[data-role="moderation"]:checked') ).map( (item) => {
								return $( item ).closest('[data-messageid]').attr('data-messageid');
							});
	
							self.trigger('deleteMessages.messages', {
								id: ids
							});
						}
					}
				});
			}
		},

		/**
		 * Deleted multiple messages using the pageAction widget
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		deleteMessagesDone(e, data) {
			// Build a selector to find the messages
			var selector = Array.from( data.id ).map( (item) => {
				return '[data-messageid="' + item + '"]';
			}).join(',');

			// Get the messages
			var self = this;
			var messages = this._messageList.find( selector );

			if( messages.length ){
				messages.slideUp( {
					complete() {
						messages.remove();

						// Is our selected message one of those deleted?
						if( data.id.indexOf( self._currentMessageID ) !== -1 ){
							self._currentMessageID = null;	

							// Are there any other messages we can show?
							if( self._messageList.find('[data-messageid]').length ){
								self._messageList.find('[data-messageid]').first().trigger('click');
							} else {
								self.trigger( 'getFolder', {
									folderID: self._currentFolder 
								});
							}
						}

						// Refresh the page action so it hides
						self._resetListActions();
					},
					queue: false
				}).fadeOut({
					queue: false
				});	
			}
		},

		/**
		 * Event handler for the search box. Starts a timer so that a search happens 500ms after
		 * the user stops typing
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		inputSearch(e) {
			/* Start the search immediately if we hit the enter key */
			if( e.keyCode === ips.ui.key.ENTER ){
				e.preventDefault();
				this._startSearch(e);
			} else {
				clearTimeout( this._searchTimer );
				this._searchTimer = setTimeout( this._startSearch.bind(this), 500 );
			}
		},

		/**
		 * Event handler for model search loading event
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		searchFolderLoading(e, data) {
			this.scope.find('[data-role="messageSearchText"]').addClass('ipsField_loading');
		},

		/**
		 * Event handler for model search done event
		 * Updates the message list, hides the filters and shows the cancel button
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		searchFolderDone(e, data) {
			//this.cleanContents();
			this._messageList
				.html( data.data )
				.show()
				.end()
				.find('[data-role="messageListPagination"]')
					.html( data.pagination )
				.end()
				.find('[data-role="loading"]')
					.prop('hidden', true)
				.end()
				.find('[data-role="messageListFilters"]')
					.prop('hidden', true);

			this.scope.find('[data-action="messageSearchCancel"]').prop('hidden', false);

			// Update the infinite scroll URL
			if( this.scope.is('[data-ipsInfScroll]') ){
				var params = decodeURIComponent( $.param( ips.utils.form.serializeAsObject( $('[data-role="messageSearch"]') ) ) );
				var base = this.scope.find('#elMessageList > form').attr('action');

				this._infScrollURL = this.scope.attr('data-ipsInfScroll');
				this.scope.attr('data-ipsInfScroll-url', base + '&' + params + '&folder=' + this._currentFolder );
				this.scope.trigger('refresh.infScroll');
			}

			$( document ).trigger( 'contentChange', [ this._messageList ] );
			this._resetListActions();
		},

		/**
		 * Event handler for model search finished event
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		searchFolderFinished(e, data) {
			this.scope.find('[data-role="messageSearchText"]').removeClass('ipsField_loading');
		},

		/**
		 * Event handler for clicking the cancel search button
		 *
		 * @param 		{event} 	e 		Event object	
		 * @returns 	{void}
		 */
		cancelSearch(e) {
			this._resetSearch();
			this._getFolder( this._currentFolder );
		},

		/**
		 * A reply in a message was deleted
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		deletedReply(e, data) {
			var count = this._messageList.find('[data-messageid="' + data.messageID + '"] [data-role="replyCount"]').text();
			this._messageList.find('[data-messageid="' + data.messageID + '"] [data-role="replyCount"]').text( parseInt( count ) - 1 );
		},

		/**
		 * Updates the reply count for a message
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		updateReplyCount(e, data) {
			this._messageList
				.find('[data-messageid="' + data.messageID + '"] [data-role="replyCount"]')
					.text( data.count );
		},

		/**
		 * Responds to the model event indicating the folder has been marked as read
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		markFolderDone(e, data) {
			if( data.folder == this._currentFolder ){
				this._messageList
					.find('[data-messageid]')
						.removeAttr('data-ips-unread')
						.find('.ipsIndicator')
							.remove();
			}
		},

		/**
		 * Responds to the model event indicating an individual message has been deleted
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		deleteMessageDone(e, data) {
			// See if the deleted message exists in the list
			var message = this._messageList.find('[data-messageid="' + data.id + '"]');

			if( message.length ){
				ips.utils.anim.go( 'fadeOutDown', message ).done( function () {
					message.remove();
				});

				this._currentMessageID = null;
			}
		},

		/**
		 * Responds to model event indicating message has moved. If the message is in this list, we remove it.
		 * If the message is the selected message, we also select the next or previous message
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		moveMessageDone(e, data) {

			// If this message is in the list, remove it
			var message = this._messageList.find('[data-messageid="' + data.id + '"]');
			var next = null;

			if( this._currentMessageID == data.id ){
				// Get the prev or next message
				if( message.prev('[data-messageid]').length ){
					next = message.prev('[data-messageid]');
				} else if( message.next('[data-messageid]').length ){
					next = message.next('[data-messageid]');
				}
			}

			if( message.length && data.to != this._currentFolder ){
				ips.utils.anim.go( 'fadeOutDown', message ).done( function () {
					message.remove();
				});

				this._currentMessageID = null;
			}

			ips.ui.flashMsg.show( ips.getString('conversationMoved') );

			if( next ){
				next.trigger('click');
			}
		},

		/**
		 * Responds to the model event indicating a folder has been successfully loaded into the list
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		loadFolderDone(e, data) {
			//this.cleanContents();
			this.scope
				.attr( 'data-ipsInfScroll-url', data.listBaseUrl )
				.find('#elMessageList')
					.scrollTop(0);

			this._messageList
					.html( data.data )
					.show()
				.end()
				.find('[data-role="messageListPagination"]')
					.html( data.pagination )
				.end()
				.find('[data-role="loading"]')
					.prop('hidden', true);

			this.scope.trigger('refresh.infScroll');
			$( document ).trigger( 'contentChange', [ this._messageList ] );

			this._resetListActions();
		},

		/**
		 * Responds to the model indicating new results are loading
		 * Shows a loading thingy in place of the list
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		loadFolderLoading(e, data) {
			if( !this.scope.find('[data-role="loading"]').length ){
				this._messageList.after( 
					$('<div/>')
						.addClass('ipsLoading')
						.html('&nbsp;')
						.css( { minHeight: '150px' } )
						.attr('data-role', 'loading')
				);
			}

			this._messageList.hide();
			this._hideEmpty();
			this.scope.find('[data-role="loading"]').prop('hidden', false);
		},

		/**
		 * Responds to the model indicating loading a folder has finished
		 * Shows the list again
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		loadFolderFinished(e, data) {
			this._messageList.show();
			this._resetSearch();
		},

		/**
		 * Responds when all messenger setup is complete.
		 * Triggers an event that lets the main and view controllers know which is the current message
		 *	
		 * @returns 	{void}
		 */
		messengerReady() {
			this._currentMessageID = this._messageList.find('.ipsData__item--active').attr('data-messageid');
			this.trigger( 'setInitialMessage.messages', {
				messageID: this._currentMessageID
			});
		},

		/**
		 * Event handler for clicking on a message in the list
		 * If it's a single message, we trigger an event to load it, and highlight it
		 * If a meta key is pressed, we select multiple messages, as well as triggering the event
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		clickMessage(e) {
			if( $( e.target ).is('input[type="checkbox"]') ){
				return;
			}

			e.preventDefault();

			var messageID = $( e.currentTarget ).attr('data-messageid');
			var messageURL = $( e.currentTarget ).find('[data-role="messageURL"]').attr('href');
			var messageTitle = $( e.currentTarget ).find('[data-role="messageURL"]').text();

			// Selecting one message

			this.trigger( 'selectedMessage.messages', {
				messageID: messageID,
				messageURL: messageURL,
				messageTitle: messageTitle
			});

			this.trigger('switchTo.filterBar', {
				switchTo: 'filterContent'
			});

			this._selectMessage( messageID );
		},
		
		/**
		 * Event handler for when a new message is sent
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		newMessage(e, data) {
			this._updateRow( data.feedID.substr( data.feedID.indexOf('-') + 1 ) );
		},
		
		/**
		 * Event handler for when a message is deleted
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		deletedMessage(e, data) {
			var feedId = $(e.target).closest('[data-feedid]').attr('data-feedid');	
			this._updateRow( feedId.substr( feedId.indexOf('-') + 1 ) );
		},
		
		/**
		 * Refresh row in list
		 *
		 * @param	{int}	conversationId	The conversation ID
		 * @returns	{void}
		 */
		_updateRow: function(conversationId) {
			var scope = $(this.scope);
			ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=core&module=messaging&controller=messenger&id=' + conversationId + '&getRow=1' ).done(function(response){
				scope.find('[data-messageid="'+conversationId+'"]').replaceWith( response );
				$( document ).trigger( 'contentChange', [ scope ] );
			});
		},

		/**
		 * Event handler for the 'sort' menu
		 * Triggers an event which loads new items into the list based on new sort order
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		changeSort(e, data = e.detail) {
			e.preventDefault();
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			var sort = data.selectedItemID;

			if( sort ){
				/*this.trigger('loadFolder.messages', {
					sortBy: sort,
					folder: this._currentFolder,
					filterBy: this._currentOptions.filter,
				});*/

				this.trigger('changeSort.messages', {
					param: 'sortBy',
					value: sort
				});
			}
		},

		/**
		 * Event handler for the 'filter' menu
		 * Triggers an event which loads new items into the list based on the new filter
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		changeFilter(e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}
			
			var filter = data.selectedItemID;

			if( filter ){
				/*this.trigger('loadFolder.messages', {
					sortBy: this._currentOptions.sort,
					folder: this._currentFolder,
					filterBy: filter
				});*/

				this.trigger('changeFilter.messages', {
					param: 'filter',
					value: filter
				});
			}
		},

		/**
		 * Responds to URL state changes
		 * Checks whether the folder or current message ID has changed
		 *
		 * @returns 	{void}
		 */
		stateChange() {
			const state = ips.utils.history.getState('messages') || {}

			if (state.controller !== 'messages') {
				return;
			}

			let newFilters = false;

			if (typeof state.params === 'object' && ( state.params.sortBy !== this._currentOptions.sortBy || state.params.filter !== this._currentOptions.filter)) {
				this._currentOptions.sortBy = state.params.sortBy;
				this._currentOptions.filter = state.params.filter;

				newFilters = true;
			}

			if (state.folder !== this._currentFolder || newFilters) {
				this._getFolder( state.folder );
			}

			if (state.mid !== this._currentMessageID){
				if (Array.isArray( state.mid )) {
					this._selectMessages( state.mid );
				} else {
					this._selectMessage( state.mid );
				}
			}
		},
		
		/**
		 * Internal method which marks the message as read
		 *
		 * @param 		{number} 	id 		ID of message to highlight
		 * @returns 	{void}
		 */
		markMessageRead: function( e, data ) {
			//this._messageList.find('[data-messageid="' + data.id + '"] a.cMessageTitle').removeClass('cMessageTitle_unread');
			this._messageList.find('[data-messageid="' + data.id + '"]').removeAttr('data-ips-unread')
				.attr('data-ips-read','');
		},

		/**
		 * Starts a search by triggering on the model
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		_startSearch(e) {
			var serialized = ips.utils.form.serializeAsObject( $('[data-role="messageSearch"]') );
			
			// If we deleted the search term, treat that the same as if we clicked the 'x' icon
			if( !serialized.q.length )
			{
				this.cancelSearch();
				return;
			}

			// If we deleted the search term, treat that the same as if we clicked the 'x' icon
			if( !serialized.q.length )
			{
				this.cancelSearch();
				return;
			}

			// Do we have any matching search terms?
			let gotSomething = ['topic', 'post', 'recipient', 'sender'].some(item => item in serialized.search);
			console.log(this._currentFolder);
			
			if ( ! gotSomething ) {
				var self = this;
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.getString('messageSearchFail'),
					subText: ips.getString('messageSearchFailSubText'),
					callbacks: {
						ok() {
							self._resetSearch();
							return false;
						}
					}
				});
			} else {
				this.trigger('searchFolder.messages', Object.assign( {
					folder: this._currentFolder
				}, serialized ) );
			}
		},

		/**
		 * Resets changes made for searching
		 *
		 * @returns 	{void}
		 */
		_resetSearch() {
			// Reset the search box
			this.scope.find('[data-role="messageSearchText"]')
				.removeClass('ipsField_loading')
				.val('');

			// Hide the cancel button
			this.scope.find('[data-action="messageSearchCancel"]').prop('hidden', true);

			// Show the filter bar
			this.scope.find('[data-role="messageListFilters"]').prop('hidden', false);

			// Reset page actions
			this._resetListActions();

			// Reset infinite scroll url
			this.scope.attr('data-ipsInfScroll', this._infScrollURL);
			this.scope.trigger('refresh.infScroll');
		},

		/**
		 * Internal method which highlights the message with the given ID
		 *
		 * @param 		{number} 	id 		ID of message to highlight
		 * @returns 	{void}
		 */
		_selectMessage(id) {
			this._messageList
				.find('[data-messageid]')
					.removeClass('ipsData__item--active')
				.end()
				.find('[data-messageid="' + id + '"]')
					.addClass('ipsData__item--active');
			
			this._currentMessageID = id;
		},

		/**
		 * Internal method which highlights multiple messages with the given IDs
		 *
		 * @param 		{array} 	IDs 	Array of IDs of messages to select
		 * @returns 	{void}
		 */
		_selectMessages(IDs) {
			var self = this;

			this._messageList
				.find('[data-messageid]')
					.removeClass('ipsData__item--active');

			for (const id of IDs) {
				self._messageList
					.find('[data-messageid="' + id + '"]')
						.addClass('ipsData__item--active');
			};

			this._currentMessageID = IDs;
		},

		/**
		 * Internal handler which triggers an event to get the contents of a folder
		 *
		 * @param 		{string} 	newFolder 		ID of the new folder to get
		 * @returns 	{void}
		 */
		_getFolder( newFolder ) {
			this.trigger('loadFolder.messages', {
				folder: newFolder,
				filter: this._currentOptions.filter,
				sortBy: this._currentOptions.sortBy
			});
			
			this._currentFolder = newFolder;
		},

		/**
		 * Hides the 'no messages' text
		 *	
		 * @returns 	{void}
		 */
		_hideEmpty() {
			this.scope.find('[data-role="emptyMsg"]').hide();
		},

		/**
		 * Reset page action/auto check boxes
		 *	
		 * @returns 	{void}
		 */
		_resetListActions() {
			// Refresh the page action so it hides
			try {
				ips.ui.pageAction.getObj( this.scope.find('[data-ipsPageAction]') ).reset();
				ips.ui.autoCheck.getObj( this.scope.find('[data-ipsAutoCheck]') ).refresh();
			} catch (err) {}
		}
	});
}(jQuery));