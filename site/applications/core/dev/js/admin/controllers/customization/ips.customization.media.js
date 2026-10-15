/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * Author: Matt Mecham (Rikki Tissier)
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.customization.media', {

		_fileListing: null,
		_sidebar: null,
		_cachedFileInfo: {},
		_searchTimer: null,
		_uploadURL: '',

		initialize: function () {
			this.on( 'click', '[data-role="mediaItem"]', this.clickItem );
			this.on( 'click', '[data-action="deleteSelected"]', this.deleteSelected );
			this.on( 'keyup', '[data-role="mediaSearch"]', this.doSearch );
			this.on( 'submitDialog', '[data-role="uploadButton"]', this.dialogSubmitted );
			this.on( 'submitDialog', '[data-role="replaceFile"]', this.replaceDialogSubmitted );
			this.on( 'click', '[data-role="replaceFile"]', this.uploadNewFile );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			this._fileListing = this.scope.find('[data-role="fileListing"]');
			this._searchResults = this.scope.find('[data-role="searchResults"]');
			this._sidebar = this.scope.find('[data-role="mediaSidebar"]');
			this._uploadURL = this.scope.find('[data-role="uploadButton"]').attr('href');
			this._searchStyleTag = this.scope.find('[data-role="searchStyleTag"]');
			
			this.scope.find('[data-role="uploadButton"]').attr('href', this._uploadURL );

			this._unselectAll();
			this._updatePreview();
			this._checkDeleteButton();

		},

		/**
		 * Dialog submit handler from uploading process
		 * The dialog response will include an array of media items. We'll use
		 * this data to rebuild the file listing, thereby showing the new files immediately.
		 * 
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Event data object
		 * @returns {void}
		 */
		dialogSubmitted: function (e, data) {
			var newHTML = [];

			for (const [key, file] of Object.entries(data.response.rows)) {
				newHTML.push( file );
			};

			this._buildFileListing( newHTML );

			ips.ui.flashMsg.show( ips.pluralize( ips.getString('mediaUploadedCount'), data.response.count ) );
		},

		/**
		 * Dialog submit handler from uploading process
		 * The dialog response will include an array of media items. We'll use
		 * this data to rebuild the file listing, thereby showing the new files immediately.
		 * 
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Event data object
		 * @returns {void}
		 */
		replaceDialogSubmitted: function (e, data) {
			var newHTML = [];

			for (const [key, file] of Object.entries( data.response.rows )){
				newHTML.push( file );
			};

			this._buildFileListing( newHTML );
			delete this._cachedFileInfo[ data.response.fileID ];

			ips.ui.flashMsg.show( ips.getString('mediaUploadedReplace') );

			this._fileListing.find('[data-fileid="' + data.response.fileID + '"]').trigger('click');
		},

		/**
		 * Prompts and deletes selected files
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		deleteSelected: function (e) {

			e.preventDefault();
			
			var self = this;
			var selected = this._getSelected().closest('[data-role="mediaItem"]');
			var selectedIDs = [];

			$.each( selected, function () {
				selectedIDs.push( $( this ).attr('data-fileid') );
			});

			// Confirm with user
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.pluralize( ips.getString('mediaConfirmDelete'), selected.length ),
				icon: 'warn',
				callbacks: {
					ok: function () {
						selected.find('.cMedia_itemSelected').removeClass('cMedia_itemSelected')

						// Hide and remove them
						ips.utils.anim.go( 'fadeOutDown', selected )
							.done( function () {
								selected.remove();
								self._updatePreview();
								self._checkDeleteButton();
							});

						// Delete them on the server
						ips.getAjax()( '?app=core&module=customization&controller=media&do=deleteByFileIds&set_id=' + self.scope.attr('data-theme-id'), {
							data: {
								fileIds: selectedIDs
							}
						})
							.fail( function () {
								ips.ui.alert.show({
									type: 'alert',
									message: ips.pluralize( ips.getString('mediaErrorDeleting'), selected.length )
								});
							})
					}
				}
			});
		},

		/**
		 * Event handler for clicking a file in the file listing
		 * Modifier keys change how we handle the selection in order to mimic file managers
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		clickItem: function (e) {
			var item = $( e.currentTarget ).find('> .cMedia_item');
			var metaPressed = e.metaKey;

			if( !metaPressed  ){
				// If no special keys are pressed, unhighlight all and highlight this one
				this._unselectAll();
				item.addClass('cMedia_itemSelected');
			} else if( metaPressed ) {

				// If meta key is pressed, toggle the state of the clicked image
				item.toggleClass( 'cMedia_itemSelected', ( !item.hasClass('cMedia_itemSelected') ) );
			}

			this._updatePreview();
			this._checkDeleteButton();
		},

		/**
		 * Show the dialog to replace the current file we are viewing
		 *
		 * @returns {void}
		 */
		 uploadNewFile: function( e ) {
		 	if( e ){
		 		e.preventDefault();
		 	}
		 	
		 	var itemId = this._getSelected().closest('[data-role="mediaItem"]').attr('data-fileid');
		 	
			$( e.currentTarget ).ipsDialog( {
				remoteSubmit: true,
				forceReload: true,
				url: $( e.currentTarget ).attr('data-baseUrl') + itemId,
                destructOnClose : true,
				title: ips.getString('replaceMediaFile')
			});
		 },

		/**
		 * Checks whether any files are selected and displays the delete button if so
		 *
		 * @returns {void}
		 */
		_checkDeleteButton: function () {
			var selected = this._getSelected().closest('[data-role="mediaItem"]');

			if( selected.length == 0 ){
				this.scope.find('[data-action="deleteSelected"]').addClass('ipsHide');
			} else {
				this.scope.find('[data-action="deleteSelected"]').removeClass('ipsHide');
			}
		},

		/**
		 * Builds the file listing HTML from the given data
		 *
		 * @param	{array} 	data 		Array of file item HTML fragments
		 * @returns {void}
		 */
		_buildFileListing: function (data) {
			var output;

			if( !data.length ){
				output = ips.templates.render('templates.customizationMedia.noItems');
			} else {
				output = ips.templates.render( 'templates.customizationMedia.grid', {
					contents: data.join('')
				});
			}
			console.log( output );
			this._fileListing.html( output );
			$( document ).trigger( 'contentChange', [ this._fileListing ] );
		},

		/**
		 * Updates the preview panel in the sidebar by finding the selected item and extracting
		 * relevant information about it to display
		 *
		 * @returns {void}
		 */
		_updatePreview: function () {
			// How many selected?
			var self = this;
			var selected = this._getSelected().closest('[data-role="mediaItem"]');

			if( selected.length == 0 || selected.length > 1 ){
				// Build the string
				var language = ( selected.length == 0 ) ? ips.getString('mediaNoneSelected') : ips.pluralize( ips.getString('mediaMultipleSelected'), selected.length );
				// Insert it
				this._sidebar.find('[data-role="multipleItemsMessage"]').html( language );
				// Show the message box
				this._sidebar.find('[data-role="itemInformation"]').hide().end().find('[data-role="multipleItems"]').show();
				this._sidebar.find('[data-role="replaceFile"]').hide();
			} else {

				// Build the file info
				var info = {
					itemFilename: selected.attr('data-filename'),
					itemUploaded: selected.attr('data-uploaded'),
					itemTag: '{resource="' + selected.attr('data-path').replace(/^\/|\/$/g, '') + '/' + selected.attr('data-filename') + '" app="core" location="front"}',
					itemUrl: selected.attr('data-url'),
					itemID: selected.attr('data-fileid'),
					itemShowDimensions:  selected.is('[data-filename$=".jpg"], [data-filename$=".png"], [data-filename$=".gif"], [data-filename$=".webp"], [data-filename$=".jpeg"], [data-filename$=".tiff"], [data-filename$=".avif"]'),
					itemFilesize: null,
					itemDimensions: null
				};

				// Dimensions & filesize
				var cache = this._cachedFileInfo[ info.itemID ];

				if( cache !== undefined ){
					info.itemFilesize = cache['itemFilesize'];
					info.itemDimensions = cache['itemDimensions'];
				} else {
					// Do ajax
					this._infoAjax = ips.getAjax()( '?app=core&module=customization&controller=media&set_id=' + this.scope.attr('data-theme-id') + '&do=getFileInfo&id=' + info.itemID )
						.done( function (response) {
							self._cachedFileInfo[ info.itemID ] = {
								itemFilesize: response.fileSize,
								itemDimensions: response.dimensions
							};

							self._sidebar.find('[data-role="itemFilesize"]').text( response.fileSize );
							self._sidebar.find('[data-role="itemDimensions"]').text( response.dimensions );
						});
				}

				// Update the easy info
				for (const [key, value] of Object.entries(info)){
					var elem = self._sidebar.find('[data-role="' + key + '"]');

					if( elem.is('input') ){
						elem.val( value );
					} else if( key == 'itemPreview' ) {
						elem.html( value );
					} else if ( key == 'itemUrl' ) {
						elem.html( $('<a/>').attr('href', value).text( value ).attr('target', '_blank') );
					}
					else if( value === null ){
						elem.html( $('<span/>').addClass('i-color_soft').text('Loading...') );
					} else {
						elem.text( value );
					}
				};

				// If this is an image, show the dimensions row
				this._sidebar.find('[data-role="itemDimensionsRow"]').toggle( info.itemShowDimensions );

				// Pre-select the tag box
				this._sidebar.find('[data-role="itemTag"]').get(0).select();

				// Hide the 'multiple items selected' div and show our info div
				this._sidebar.find('[data-role="itemInformation"]').show().end().find('[data-role="multipleItems"]').hide();
				this._sidebar.find('[data-role="replaceFile"]').show();

				$( document ).trigger( 'contentChange', [ this._sidebar ] );
			}
		},

		/**
		 * Hides all files which don't match the file name from the search input
		 *
		 * @returns {void}
		 */
		doSearch: function () {
			
			var value = this.scope.find('[data-role="mediaSearch"]').val();

			if (value.trim()) {

				// Add value to CSS selector, stripping quotes
				this._searchStyleTag.html('[data-role="mediaItem"]:not([data-filename*="' + value.replace(/['"]+/g, '') + '" i]){ display: none; }');
				this._unselectAll();

			} else {

				this._searchStyleTag.html('');
			}

			this._updatePreview();
			this._checkDeleteButton();
		},

		/**
		 * Returns selected files, from the file listing or search results panels depending
		 * on which is active
		 *
		 * @returns {object}	jQuery collection of selected files
		 */
		_getSelected: function () {
			if( this._fileListing.is(':visible') ){
				return this._fileListing.find('.cMedia_itemSelected');
			} else {
				return this._searchResults.find('.cMedia_itemSelected');
			}
		},

		/**
		 * Resets the search box, hiding the results in the process
		 *
		 * @returns {void}
		 */
		_resetSearch: function () {
			this.scope.find('[data-role="mediaSearch"]').val('');
			this._searchResults.hide();
			this._fileListing.show();
			this._unselectAll();
			this._updatePreview();
			this._checkDeleteButton();
		},

		/**
		 * Unselects all files
		 *
		 * @returns {void}
		 */
		_unselectAll: function () {
			this._fileListing.find('.cMedia_item').removeClass('cMedia_itemSelected');	
			this._searchResults.find('.cMedia_item').removeClass('cMedia_itemSelected');	
		}
	});
}(jQuery));