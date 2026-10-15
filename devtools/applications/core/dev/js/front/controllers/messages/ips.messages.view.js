/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.messages.view.js - Controller for message view pane in messenger
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.front.messages.view', {

		_currentMessageID: null,
		_currentPage: 1,

		initialize() {
			// Events from within
			this.on( 'paginationClicked paginationJump', this.paginationClicked );
			this.on( 'addToCommentFeed', this.addToCommentFeed );

			this.on( document, 'click', '[data-action="deleteConversation"]', this.deleteConversation );

			this.on( document, 'menuItemSelected', '[data-role="userActions"]', this.userAction );

			this.on( 'submit', '[data-role="addUser"]', this.addUsersSubmit );

			// Events bubbled from the list
			this.on( document, 'selectedMessage.messages', this.selectedMessage );
			this.on( document, 'setInitialMessage.messages', this.setInitialMessage );

			// Events from the main controller
			this.on( document, 'getFolder.messages', this.getFolder );

			// Model events
			this.on( document, 'loadMessageLoading.messages', this.loadMessageLoading );
			this.on( document, 'loadMessageDone.messages', this.loadMessageDone );
			this.on( document, 'deleteMessageDone.messages', this.deleteMessageDone );
			this.on( document, 'blockUserDone.messages', this.blockUserDone );
			this.on( document, 'addUserDone.messages', this.addUserDone );
			this.on( document, 'addUserError.messages', this.addUserError );

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
			if ( this.scope.attr('data-current-id') )
			{
				this._currentMessageID = this.scope.attr('data-current-id');
			}
		},

		/**
		 * A reply to the conversation
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @param 		{object} 	data	Data object	from model
		 * @returns 	{void}
		 */
		addToCommentFeed(e, data) {
			if( data.totalItems ){
				this.trigger( 'updateReplyCount.messages', {
					messageID: this._currentMessageID,
					count: data.totalItems
				});
			}
		},

		/**
		 * Adding a user to the conversation failed
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data	Data object from model
		 * @returns 	{void}
		 */
		addUserError(e, data) {
			if( data.error ){
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: data.error,
					callbacks: {}
				});
			}
		},

		/**
		 * One or more users have been added to this conversation
		 * Inserts or replaces new HTML in the participants list and shows a flashMsg
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @param 		{object} 	data	Data object	from model
		 * @returns 	{void}
		 */
		addUserDone(e, data) {
			if( data.id !== this._currentMessageID ){
				return;
			}

			if( data.error ){
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: data.error,
					callbacks: {}
				});
				return;
			}

			const numberMembers = data.members ? Object.keys(data.members).length : 0;

			if( data.members && numberMembers ){
				for(const i in data.members ){
					const participant = this.scope.find('.cMessage_members').find('[data-participant="' + i + '"]');

					Debug.log('Ajax response:');
					Debug.log( data.members[ i ] );

					// If this user already exists, replace them
					if( participant.length ){
						participant.replaceWith( data.members[ i ] );	
					} else {
						// New record, so append it
						this.scope.find('.cMessage_members [data-role="addUserItem"]').before( data.members[ i ] );
					}					
				}
			}

			let message = ips.getString('messageUserAdded');

			if( numberMembers > 1 ){
				message = ips.pluralize( ips.getString( 'messageUsersAdded' ), numberMembers );
			}

			ips.ui.flashMsg.show( message );

			if( data.failed && parseInt( data.failed ) > 0 ){
				ips.ui.flashMsg.show( ips.getString('messageNotAllUsers') );
			}

			// Hide the 'add' menu
			const menu = this.scope.find('#elInviteMember' + this._currentMessageID + '_menu');
			if(menu[0].matches("[popover]")){
				menu[0].hidePopover();
			}

			// Clear the autocomplete
			var autocomplete = ips.ui.autocomplete.getObj( this.scope.find('textarea[name="member_names"]') );

			autocomplete.removeAll();
		},

		/**
		 * Event handler for submitting the 'invite users' form
		 * Triggers the addUser event
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		addUsersSubmit(e) {
			e.preventDefault();

			const names = $(e.currentTarget).find('[name="member_names"]').val();

			this.trigger( 'addUser.messages', {
				id: this._currentMessageID,
				names: names
			});
		},

		/**
		 * The model has blocked a user
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @param 		{object} 	data 	Data object	from model
		 * @returns 	{void}
		 */
		blockUserDone(e, data) {
			if( data.id != this._currentMessageID ){
				return;
			}

			// Find participant & replace
			var participant = this.scope.find('.cMessage_members').find('[data-participant="' + data.member + '"]');
			participant.replaceWith( data.response );

			ips.ui.flashMsg.show( ips.getString('messageRemovedUser') );
		},

		/**
		 * Event handler for the user actions menu
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @param 		{object} 	data	Data object	from model
		 * @returns 	{void}
		 */
		userAction(e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			var userID = $( data.triggerElem ).closest('[data-participant]').attr('data-participant');

			switch( data.selectedItemID ){
				case 'block':
					this.trigger('blockUser.messages', {
						member: userID,
						id: this._currentMessageID
					});
				break;
				case 'unblock':
					this.trigger('addUser.messages', {
						member: userID,
						id: this._currentMessageID,
						unblock: true
					});
				break;
			}
		},

		/**
		 * The model has deleted a message. If it's the one we're viewing, then remove the content and
		 * show the placeholder.
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @param 		{object} 	data	Data object	from model
		 * @returns 	{void}
		 */
		deleteMessageDone(e, data) {
			var url = ipsSettings['baseURL'] + '?app=core&module=messaging&controller=messenger'
			window.location = url;
		},

		/**
		 * Event handler for clicking the delete conversation button.
		 * Confirms the user actually wants to delete it
		 *
		 * @param 		{Event} 	e 		Event object	
		 * @returns 	{void}
		 */
		deleteConversation(e) {
			e.preventDefault();

			var self = this;

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('messagesDelete'),
				subText: ips.getString('messagesDeleteSubText'),
				callbacks: {
					ok() {
						self.trigger( 'deleteMessage.messages', { 
							id: self._currentMessageID
						});
					}
				}
			});
		},

		/**
		 * Responds to the model loading message event
		 * Shows the loading thingy in the message pane
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		loadMessageLoading(e, data) {
			this.cleanContents();
			this.scope.html( 
				$('<div/>')
					.addClass('ipsLoading')
					.html('&nbsp;')
					.css( { minHeight: '150px' } )
			);
		},

		/**
		 * Responds to the model loaded message event
		 * Displays the loaded message in the message pane
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		loadMessageDone(e, data) {
			//this.cleanContents();
			this.scope.html( data.response );
			$( document ).trigger( 'contentChange', [ this.scope ] );
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

			/*this.trigger('changePage.messages', {
				pageNo: data.pageNo,
				perPage: data.perPage,
				id: this._currentMessageID
			});*/
		},

		/**
		 * Responds to event from main messages controller, informing us a message (or messages)
		 * have been selected. For a single message, we emit an event here to load the contents
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		selectedMessage(e, data) {
			//if( Array.isArray( data.messageID ) ){
				//this.scope.html('');
			//} else {
				this.trigger( 'loadMessage.messages', { 
					messageID: data.messageID,
					messageURL: data.messageURL,
					messageTitle: data.messageTitle
				});
			//}

			this._currentMessageID = data.messageID;
		},

		/**
		 * Responds to the browser url changing
		 * We're only interested in watching for the message ID here. If it changes, we fetch a new message
		 *	
		 * @returns 	{void}
		 */
		stateChange() {
			const state = ips.utils.history.getState('messages');
			if (state?.controller !== 'messages') {
				return;
			}

			if (state.id == null) {
				this.cleanContents();
				this.scope.html( ips.templates.render('messages.view.placeholder') );

				// Reset values
				this._currentMessageID = null;
				this._currentPage = null;
				return;
			}

			if (state.id !== this._currentMessageID) {
				// Get message from le model
				this.trigger( 'fetchMessage.messages', {
					id: state.id,
					page: state.page || 1
				});

				// Track page view
				ips.utils.analytics.trackPageView( window.location.href );

				// Reset values
				this._currentMessageID = state.id;
				this._currentPage = state.page || 1;
			} else if (state.page !== this._currentPage) {
				this.trigger( 'fetchMessage.messages', {
					id: this._currentMessageID,
					page: state.page
				});

				this._currentPage = state.page;
			}
		},

		/**
		 * Responds to an event from the main controller letting us know the initially-selected message ID
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object	
		 * @returns 	{void}
		 */
		setInitialMessage(e, data) {
			this._currentMessageID = data.messageID;
		},

		/**
		 * Responds to an event from the main controller indicating the selected folder has changed
		 * We remove any message present and replace it with the placeholder
		 *
		 * @returns 	{void}
		 */
		getFolder() {
			this.cleanContents();
			this.scope.html( ips.templates.render('messages.view.placeholder') );
			ips.utils.anim.go( 'fadeIn', this.scope );
		},
	});
}(jQuery));
