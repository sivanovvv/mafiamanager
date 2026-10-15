/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.messages.main.js - Main messenger controller
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.front.messages.main', {

		_currentMessageID: null,
		_ready: {},
		_protectedFolders: ['myconvo'],
		_params: { 'sortBy': 'mt_last_post_time', 'filter': 'all' },
		_currentFolder: null,

		initialize() {
			// Main interface events
			this.on( 'menuItemSelected', '#elMessageFolders', this.changeFolder );
			this.on( 'menuItemSelected', '#elFolderSettings', this.folderAction );
			this.on( 'click', '[data-action="addFolder"]', this.addFolder );

			// Modal events
			this.on( document, 'addFolderLoading.messages renameFolderLoading.messages ' + 
						'markFolderLoading.messages emptyFolderLoading.messages ' +
						'deleteMessageLoading.messages deleteMessagesLoading.messages moveMessageLoading.messages ' +
						'deleteFolderLoading.messages', this.folderActionLoading );
			this.on( document, 'addFolderFinished.messages renameFolderFinished.messages ' + 
						'markFolderFinished.messages emptyFolderFinished.messages ' +
						'deleteMessageFinished.messages deleteMessagesFinished.messages moveMessageFinished.messages ' + 
						'deleteFolderFinished.messages', this.folderActionDone );

			this.on( document, 'deleteFolderDone.messages deleteMessageDone.messages deleteMessagesDone.messages ' +
						'emptyFolderDone.messages moveMessageDone.messages', this.updateCounts );
			//--
			this.on( document, 'addFolderDone.messages', this.addFolderDone );
			this.on( document, 'renameFolderDone.messages', this.renameFolderDone );
			this.on( document, 'markFolderDone.messages', this.markFolderDone );
			this.on( document, 'emptyFolderDone.messages', this.emptiedFolder );
			this.on( document, 'deleteFolderDone.messages', this.deletedFolder );

			// Events from the list
			this.on( 'setInitialMessage.messages', this.setInitialMessage );
			this.on( 'setInitialFolder.messages', this.setInitialFolder );
			this.on( 'changeSort.messages changeFilter.messages', this.updateParam );
			this.on( 'input', '[data-role="moderation"]', this.moderationInput );
			this.applyModMenuSelection();

			//this.on( 'selectMessage.messages', this.selectMessage );
			this.on( 'loadMessage.messages', this.loadMessage );

			// Events from the view
			this.on( 'changePage.messages', this.changePage );

			// Document events
			this.on( document, 'controllerReady', this.controllerReady );
			this.on( document, 'openDialog', '#elAddFolder', this.addFolderDialogOpen );
			this.on( document, 'openDialog', '#elFolderRename', this.renameFolderDialogOpen );

			// Primary event that watches for URL changes
			this.on( window, 'historychange:messages', this.stateChange );
		},

		/**
		 * Responds to sub-controllers indicating they are initialized
		 * Allows us to check all sub-controllers are initialized before going any further
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		controllerReady(e, data) {
			this._ready[ data.controllerType ] = true;

			if( this._ready['messages.list'] && this._ready['messages.view'] &&
					data.controllerType == 'core.front.messages.list' || data.controllerType == 'core.front.messages.view' ){
				this.trigger('messengerReady.messages');
			}
		},

		/**
		 * Responds to an event from the list controller informing us of the initial message ID that's selected
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		setInitialMessage(e, data) {
			this._currentMessageID = data.messageID;
		},

		/**
		 * Responds to an event from the list controller informing us of the initial folder ID
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		setInitialFolder(e, data) {
			Debug.log( data );
			this._currentFolder = data.folderID;
		},

		/**
		 * Responds to event from view controller indicating the message page has changed (from pagination)
		 * Updates the URL with the new page number
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		changePage(e, data) {
			this._updateURL({
				id: data.id,
				page: data.pageNo
			}, {
				id: data.id, // reset message id
				page: data.pageNo
			});
		},

		/**
		 * Event handler for the folder action menu
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		folderAction(e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			if( this._currentFolder == null ){

			}

			// Can't delete or rename protected folders
			if( ( this._protectedFolders ).indexOf( this._currentFolder ) !== -1 && 
					['delete', 'rename'].indexOf(data.selectedItemID) !== -1 ){
				return;
			}

			switch( data.selectedItemID ){
				case 'markRead':
					this._actionMarkRead( data );
				break;
				case 'delete':
					this._actionDelete( data );
				break;
				case 'empty':
					this._actionEmpty( data );
				break;
				case 'rename':
					this._actionRename( data );
				break;
			}
		},

		/**
		 * Event handler for all 'folder action' loading events
		 * Displays a loading thingy in the messenger header
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		folderActionLoading(e, data) {
			var loading = this.scope.find('[data-role="loadingFolderAction"]');
			ips.utils.anim.go( 'fadeIn', loading );
		},

		/**
		 * Event handler for all 'folder action' loading done events
		 * Hides the loading thingy
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		folderActionDone(e, data) {
			var loading = this.scope.find('[data-role="loadingFolderAction"]');
			ips.utils.anim.go( 'fadeOut', loading );
		},

		/**
		 * Method to handle adding a folder
		 * Displays the dialog which contains the form
		 *	
		 * @param 		{Event} 	e 	Event object
		 * @returns 	{void}
		 */
		addFolder(e) {
			var button = $( e.currentTarget );

			if( ips.ui.dialog.getObj( button ) ){
				ips.ui.dialog.getObj( button ).show();
			} else {
				button.ipsDialog( {
					content: '#elAddFolder_content',
					title: ips.getString('addFolder'),
					size: 'narrow'
				});
			}
		},

		/**
		 * Responds to event from modal indicating a new folder has been added
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		addFolderDone(e, data) {
			var newItem = ips.templates.render('messages.main.folderMenu', {
				key: data.key,
				count: 0,
				name: data.folderName
			});

			// Find last menu item
			$('#elMessageFolders_menu')
				.find('[data-role="folderInMenu"]')
					.last()
					.after( newItem );
				
			// Browse to new folder
			$('#elMessageFolders_menu [data-ipsMenuValue="' + data.key + '"]')[0].dispatchEvent(new Event("click", {bubbles: true}));
		},

		/**
		 * Responds to event from modal indicating a folder has been renamed
		 * Updates the relevant menu item, and main messenger title
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		renameFolderDone(e, data) {
			var realFolderName = this._getRealFolder( data.folder );

			// Rename the menu item
			$('#elMessageFolders_menu')
				.find('[data-ipsMenuValue="' + data.folder + '"]')
					.find('[data-role="folderName"]')
						.text( data.folderName );

			// Rename the main title
			this.scope
				.find('[data-role="currentFolder"]')
					.text( data.folderName );

			// Show message
			ips.ui.flashMsg.show( ips.getString('renamedTo', {
				folderName: realFolderName,
				newFolderName: data.folderName
			}) );
		},

		/**
		 * Responds to modal event indicating a folder is marked read
		 * Displays a message box
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		markFolderDone(e, data) {
			var realFolderName = this._getRealFolder( data.folder );
			ips.ui.flashMsg.show( ips.getString('messengerMarked', {
				folderName: realFolderName
			}) );
		},

		/**
		 * Responds to modal event indicating a folder has been emptied
		 * Updates the count value in the folder menu
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		emptiedFolder(e, data) {
			var menuItem = $('#elMessageFolders_menu').find('[data-ipsMenuValue="' + data.folder + '"]');
			menuItem.find('.ipsMenu_itemCount').html('0');

			this.trigger( 'loadFolder', {
				folder: this._currentFolder,
				sortBy: this._params['sortBy'],
				filter: this._params['filter']
			});
		},

		/**
		 * Responds to modal event indicating a folder has been deleted
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		deletedFolder(e, data) {
			// Remove the folder from the folder list, then click the myconvos folder to load it.
			// Our event handlers will handle it from there.
			this.scope
				.find('#elMessageFolders_menu')
					.find('[data-ipsMenuValue="' + data.folder + '"]')
						.remove();
			
			this.scope.find('[data-ipsMenuValue="myconvo"]')[0].dispatchEvent(new Event("click", {bubbles: true}));

			// Show a flash message
			ips.ui.flashMsg.show( ips.getString('folderDeleted') );
		},

		/**
		 * Responds to the list event triggered when a new message needs to be loaded
		 * Updates the URL with the new message ID
		 * The view controller handles actually loading the message from the modal
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		loadMessage(e, data) {
			if( !data.messageID ){
				return;
			}

			this._newMessageID = data.messageID;
			this._updateURL( {
				id: data.messageID,
				url: data.messageURL
			}, {}, data.messageTitle );
		},

		/**
		 * Responds to the list event informing us that a sort/filter param has changed
		 * Stores this for later use in URL updates
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		updateParam(e, data) {
			if( data.param !== undefined && data.value !== undefined ){
				this._params[ data.param ] = data.value;
			}

			this._updateURL( false, this._params );
		},

		/**
		 * Event handler for the folder navigation menu
		 * Updates the URL with the new folder ID so we can navigate to a new folder
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		changeFolder(e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			var folderID = data.selectedItemID;
			var folderURL = $(data.menuElem).find('[data-ipsMenuValue="' + data.selectedItemID + '"]').attr('href');
			var folderName = $(data.menuElem).find('[data-ipsMenuValue="' + data.selectedItemID + '"]').find('[data-role="folderName"]').text();

			if( folderID === undefined ){
				return;
			}

			this._currentMessageID = null;

			this.scope.find('[data-ipsFilterBar]').trigger('switchTo.filterBar', {
				switchTo: 'filterBar'
			});

			this._updateURL( Object.assign( { 
				folder: folderID,
				url: folderURL
			}, this._params ), {
				folder: folderID,
				id: null, // reset message id
				page: null
			}, folderName );
		},

		/**
		 * Handles an event.openDialog event for the add folder dialog
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		addFolderDialogOpen(e, data) {
			$( data.dialog )
				.find('input[type="text"]')
					.attr('data-folderID', this._currentFolder )
					.val('')
					.trigger('focus');
		},

		/**
		 * Handles an event.openDialog event for the rename folder dialog
		 *
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		renameFolderDialogOpen(e, data) {
			var realFolderName = this._getRealFolder( this._currentFolder );
			$( data.dialog )
				.find('[data-role="folderName"]')
					.attr('data-folderID', this._currentFolder )
					.val( ips.utils.unescapeHTML( realFolderName ) )
					.trigger('focus');
		},

		/**
		 * Responds to URL state changes
		 * Check whether the folder has changed, and load a new one if necessary
		 *	
		 * @returns 	{void}
		 */
		stateChange() {
			const state = ips.utils.history.getState('messages')
			// Folder change?
			if (state?.controller === 'messages' && state.folder !== this._currentFolder) {
				this._updateFolder(state.folder);
			}
		},

		/**
		 * Updates the browser URL
		 *	
		 * @param 		{object} 	urlParams 		Values which will be inserted into the URL
		 * @param 		{object} 	newValues 		Values which will be passed into the data object stored with the state
		 * @returns 	{void}
		 */
		_updateURL(urlParams, newValues, newTitle) {
			let url = '';
			const title = newTitle || document.title;

			if( urlParams === false ){
				url = window.location.href;
				if ( window.location.hash ) {
					url = url.substr( 0, url.length - window.location.hash.length );
				}
			} else if( urlParams.url ){
				url = urlParams.url;
			} else {
				url = [];

				url.push( '?app=core&module=messaging&controller=messenger' );

				for (const [idx, value] of Object.entries(urlParams)){
					if( idx != 'page' || ( idx == 'page' && value != 1 ) ){
						url.push( idx + "=" + value );
					}
				};

				url = url.join('&');
			}

			const defaultObj = {
				id: this._newMessageID,
				folder: this._currentFolder,
				params: this._params,
				controller: 'messages',
			};

			ips.utils.history.pushState(
				{
					...defaultObj,
					...(newValues || {})
				},
				'messages',
				url
			);
			document.title = title
		},

		/**
		 * Updates the quota progressbar and tooltip, and the folder counts
		 *	
		 * @param 		{Event} 	e 		Event object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		updateCounts(e, data) {
			// Update quota tooltip text and width
			this.scope
				.find('[data-role="quotaTooltip"]')
					.attr('data-ipsTooltip', data.quotaText )
					.find('[data-role="quotaWidth"]')
					.val(parseInt(data.quotaPercent))
					.end()
					.find('[data-role="quotaValue"]')
						.text( parseInt( data.quotaPercent ) );
			
			// Update folder counts
			$('#elMessageFolders_menu').find('[data-ipsMenuValue]').each( function () {
				if( data.counts )
				{
					$( this ).find('.ipsMenu_itemCount').text( parseInt( data.counts[ $( this ).attr('data-ipsMenuValue') ] ? data.counts[ $( this ).attr('data-ipsMenuValue') ] : '0' ) );
				}
			});
		},

		/**
		 * Handles changing to a new folder.
		 * Updates the name of the folder in the header, and enables/disables action menu options as needed
		 * Actually loading a new folder is handled in the list/view controllers
		 *	
		 * @param 		{string} 	newFolder 		New folder name
		 * @returns 	{void}
		 */
		_updateFolder(newFolder) {

			var folderName = $('[data-ipsMenuValue="' + newFolder + '"]').find('[data-role="folderName"]').text();
			var self = this;

			// Remove all disabled states
			$('#elFolderSettings_menu')
				.find('[hidden]')
				.prop('hidden', false);

			// Update the settings menu URLs with the new folder (the JS handles the correct ajax URL, but
			// updating it here prevents any issues if there's a JS error)
			$('#elFolderSettings_menu a').each( function () {
				$( this ).attr( 'href', $( this ).attr('href').replace( '&folder=' + self._currentFolder, '&folder=' + newFolder ) );
			});

			// See if we need to apply them again
			if( ( this._protectedFolders ).indexOf( newFolder ) !== -1 ){
				$('#elFolderSettings_menu')
					.find('[data-ipsMenuValue="delete"], [data-ipsMenuValue="rename"]')
						.prop('hidden', true);
			}

			// Update folder name
			this.scope.find('[data-role="currentFolder"]').text( folderName );

			this._currentFolder = newFolder;
		},

		/**
		 * Method to handle folder renaming
		 * Displays the dialog which contains the form
		 *	
		 * @param 		{object} 	data 	Event data object from this.folderAction
		 * @returns 	{void}
		 */
		_actionRename(data) {
			var dialog = $('#elFolderSettings_menu').find('[data-ipsMenuValue="rename"]');

			if( ips.ui.dialog.getObj( dialog ) ){
				ips.ui.dialog.getObj( dialog ).show();
			} else {
				dialog.ipsDialog( {
					content: '#elFolderRename_content',
					title: ips.getString('renameFolder'),
					size: 'narrow'
				});
			}
		},

		/**
		 * Method to handle folder deleting
		 *	
		 * @param 		{object} 	data 	Event data object from this.folderAction
		 * @returns 	{void}
		 */
		_actionDelete(data) {
			var self = this;

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('messengerDeleteConfirm'),
				subText: ips.getString('cantBeUndone'),
				callbacks: {
					ok() {
						self.trigger( 'deleteFolder.messages', {
							folder: self._currentFolder
						});
					}
				}
			});
		},

		/**
		 * Method to handle marking a folder as reason
		 * Displays a confirmation box, and on success triggers an event for the modal
		 *	
		 * @param 		{object} 	data 	Event data object from this.folderAction
		 * @returns 	{void}
		 */
		_actionMarkRead(data) {
			var realFolderName = this._getRealFolder( this._currentFolder );
			var self = this;
			
			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('messengerMarkRead', {
					folderName: realFolderName
				}),
				callbacks: {
					ok() {
						self.trigger( 'markFolder.messages', {
							folder: self._currentFolder
						});
					}
				}
			});	
		},

		/**
		 * Method to handle folder emptying
		 * Displays a confirmation box, and on success triggers an event for the modal
		 *	
		 * @param 		{object} 	data 	Event data object from this.folderAction
		 * @returns 	{void}
		 */
		_actionEmpty(data) {
			var realFolderName = this._getRealFolder( this._currentFolder );
			var self = this;

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('messengerDeleteContents', {
					folderName: realFolderName
				}),
				subText: ips.getString('cantBeUndone'),
				callbacks: {
					ok() {
						self.trigger( 'emptyFolder.messages', {
							folder: self._currentFolder
						});
					}
				}
			});		
		},

		/**
		 * Returns the real folder name based on the folder key
		 *	
		 * @param 		{string} 	folder 		Folder key
		 * @returns 	{string} 	Real folder name
		 */
		_getRealFolder(folder) {
			var menuItem = $('#elMessageFolders_menu').find('[data-ipsMenuValue="' + folder + '"]');
			return menuItem.find('[data-role="folderName"]').html();
		},

		/**
		 * Store the moderation details
		 * @param {Event} e
		 */
		moderationInput(e) {
			const currentData = ips.utils.db.get('messages', 'mod_menu_checked') || {};
			const id = e.target.name;
			if (!id) {
				return;
			}
			if (e.target.checked) {
				currentData[id] = e.target.dataset.actions || "";
			} else {
				delete currentData[id];
			}

			ips.utils.db.set('messages', 'mod_menu_checked', currentData);
		},

		applyModMenuSelection() {
			const currentData = ips.utils.db.get('messages', 'mod_menu_checked');
			const pageAction = this.elem.querySelector('[data-ipspageaction]');
			if (pageAction && currentData && typeof currentData === "object" && Object.keys(currentData).length) {
				const messageSelector = [...Object.keys(currentData)]
					.map(id => `[name="${id}"]`)
					.join(',');

				const remainingIds = new Set(Object.keys(currentData));
				this.elem
					.querySelectorAll(`input[data-role="moderation"]:is(${messageSelector})`)
					.forEach(el => {
						remainingIds.delete(el.name);
						el.checked = true;
						$(el).trigger('change');
					});

				if (remainingIds.size) {
					remainingIds.forEach(id => {
						$(pageAction).trigger("addManualItem.pageAction", {
							id: id,
							actions: typeof currentData[id] === "string" ? currentData[id] : ''
						})
					});

					$(this.elem.querySelector('[data-ipsautocheck]')).trigger('setInitialCount.autoCheck', {count: remainingIds.size})
				}
			}
		}
	});
}(jQuery));