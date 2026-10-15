/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.editor.insertable.js - Allows items to be inserted into the editor
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	/**
	 * @closure
	 * @type {Object.<string, HTMLImageElement|false>}
	 */
	const IMAGE_CACHE = {};
	ips.controller.register('core.global.editor.insertable', {

		_editorID: '',
		_selectedItems: {},
		_tooltip: null,
		_tooltipTimer: null,

		initialize: function () {
			this.on( 'click', '[data-action="insertFile"]', this.insertFile );
			this.on( 'click', '[data-action="selectFile"]', this.selectFile );
			this.on( 'click', '[data-action="insertSelected"]', this.insertSelected );
			this.on( 'click', '[data-action="clearAll"]', this.clearSelection );
			this.on( 'fileInjected', this.fileInjected );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns	{void}
		 */
		setup: function () {
			this._editorID = this.scope.attr('data-editorID');
			this._selectedItems = {};
		},

		destruct: function () {
			Debug.log('destruct insertable');
		},

		/**
		 * Toggle a file selection
		 *
		 * @param	{Event}		e	Event Object
		 * @returns	{void}
		 */
		selectFile: function (e) {
			e.preventDefault();

			const thisAttach = $(e.currentTarget);
			const thisDataRow = thisAttach.closest('.ipsData__item');

			if (thisAttach.hasClass('ipsAttach_selectionOn')) {
				
				thisAttach.removeClass('ipsAttach_selectionOn');

				if (thisDataRow.length) {
					thisDataRow.removeClass('ipsData__item--selected');
				} else {
					thisAttach.removeClass('ipsAttach_selected');
				}

				this._removeSelectedItem( thisAttach );

			} else {
				thisAttach.addClass('ipsAttach_selectionOn');
				
				if (thisDataRow.length) {
					thisDataRow.addClass('ipsData__item--selected');
				} else {
					thisAttach.addClass('ipsAttach_selected');
				}

				this._addSelectedItem(thisAttach);
			}
		},
		
		/**
		 * Clears currently-selected items
		 *
		 * @param	{Event}		e	Event data
		 * @returns	{void}
		 */
		clearSelection (e) {
			e?.preventDefault?.();
			if (!Object.keys(this._selectedItems).length) {
				return;
			}

			// Empty object
			this._selectedItems = {};

			// Remove class from all elements in the dom
			this.scope
				.find('.ipsAttach_selectionOn')
					.removeClass('ipsAttach_selectionOn')
					.closest('.ipsAttach')
						.removeClass('ipsAttach_selected')
					.end()
					.closest('.ipsData__item')
						.removeClass('ipsData__item--selected');

			// Update buttons
			this._checkSelectedButton();
		},

		/**
		 * Inserts selected files into the editor
		 *
		 * @param	{Event}		e	Event data
		 *
		 * @returns	{void}
		 */
		insertSelected(e) {
			e.preventDefault();
			if (!Object.keys(this._selectedItems).length) {
				return;
			}
			
			if (!this.scope.get(0).closest('[data-role="attachmentArea"]')) {
				this.trigger('closeDialog');
			}

			const editor = $(document.querySelector(`textarea[name="${this._editorID}"]`).closest('[data-ipsEditorv5]')).data('_editor');
			for (const item of Object.values(this._selectedItems)) {
				editor.insertHtml( this._buildInsert( item ) );
			}

			this.clearSelection(e);
		},

		/**
		 * Allows attachments to be inserted into the editor individually
		 *
		 * @param	{Event}		[e]	Event Object
		 *
		 * @returns	{void}
		 */
		async insertFile(e) {
			e?.preventDefault?.();
			
			const editor = $( `textarea[name="${this._editorID}"]` ).closest('[data-ipsEditorV5]').data('_editor');
			const insertData = await this._buildInsertData( $( e.target ) );
			const insertHtml = this._buildInsert(insertData);

			editor.insertHtml( insertHtml );

			if( !this.scope.closest('[data-role="attachmentArea"]').length ){
				this.trigger('closeDialog');
			}
		},
				
		/**
		 * File injected, this fires an event which the uploader uses to actually insert a file if it was pasted in
		 *
		 * @param	{Event}		e		Event Object
		 * @param	{Object}	data	Event data object
		 *
		 * @returns	{void}
		 */
		async fileInjected(e, data) {
			const insertData = await this._buildInsertData(data.fileElem)
			const content = this._buildInsert(insertData)
			data.data?.ready?.(content, insertData)
			$(this.scope).get(0).dispatchEvent(
				new CustomEvent(
					'injectedFileReadyForInsert',
					{
						detail: {
							content,
							data: data.data
						}
					}
				)
			);
		},

		/**
		 * Adds an item to the selected items list
		 *
		 * @param	{jQuery|Element}	element		The file element to be added
		 *
		 * @returns	{void}
		 */
		_addSelectedItem: async function (element) {
			const fileID = $(element).attr('data-fileid');
			this._selectedItems[ fileID ] = await this._buildInsertData( element );
			this._checkSelectedButton();
		},

		/**
		 * Removes an item from the selected items list
		 *
		 * @param	{element}	element		The file element to be removed
		 * @returns	{void}
		 */
		_removeSelectedItem: function (element) {
			var fileID = element.attr('data-fileid');

			if( this._selectedItems[ fileID ] !== undefined ){
				delete this._selectedItems[ fileID ];
			}

			this._checkSelectedButton();
		},

		/**
		 * Enables the 'clear selection' and 'insert selected files' buttons if there's any selected items
		 *
		 * @returns	{void}
		 */
		_checkSelectedButton: function () {
			const button = this.scope.find('[data-action="insertSelected"]');

			this.scope.find('[data-action="clearAll"]').toggleClass('ipsButton--disabled', !Object.keys(this._selectedItems).length );
			button.toggleClass('ipsButton--disabled', !Object.keys(this._selectedItems).length );

			if ( !Object.keys(this._selectedItems).length ){
				button.text( ips.getString('insertSelected') );
			} else {
				button.text( ips.pluralize( ips.getString('insertSelectedNum'), Object.keys(this._selectedItems).length ) );
			}
		},

		/**
		 * Builds insertable element data based on the provided attached file element
		 *
		 * @param	{jQuery|Element}	_element		The element on which the insert is based
		 * @returns	{Promise.<{
				fileID: string,
				fileKey: string,
				type: string,
				title: string,
				link: string,
				fullImage: string,
				extension: string,
				mimeType: string
			}>}
		 */
		async _buildInsertData (_element) {
			const element = $(_element).get(0).closest('.ipsAttach');
			if (!element) {
				return {
					fileID: '',
					fileKey: '',
					type: 'file',
					title: '',
					link: '',
					fullImage: '',
					extension: '',
					naturalWidth: null,
					naturalHeight: null,
				}
			}
			const fileID = element.getAttribute('data-fileid') || '';
			const fileKey = element.getAttribute('data-filekey') || '';
			const type = element.getAttribute('data-fileType') || 'file';
			let url = '',
				image = '',
				mimeType = '',
				naturalWidth = '',
				naturalHeight = '';

			switch (type) {
				case 'image':
					url = element.getAttribute('data-thumbnailurl') || element.getAttribute('data-fullsizeurl') || url;
					if (url !== element.getAttribute('data-fullsizeurl')) {
						image = element.getAttribute('data-fullsizeurl') || '';
					}
					break

				case 'video':
					image = element.getAttribute('data-fullsizeurl');
					mimeType = element.getAttribute('data-mimeType');
					break

				case 'audio':
					mimeType = element.getAttribute('data-mimeType');
					break;

				default:
					url = element.getAttribute('data-filelink') || '';
			}

			return {
				fileID: fileID,
				fileKey: fileKey,
				type: type,
				title: ( type !== 'image' ) ? element.querySelector('[data-role="title"]')?.innerHTML : '',
				link: url,
				fullImage: image,
				extension: element.closest('[data-extension]')?.getAttribute('data-extension') || '',
				mimeType: mimeType,
				naturalWidth,
				naturalHeight
			};
		},

		/**
		 * Builds an element that can be inserted into the editor
		 *
		 * @param	{Object}	item		Item data used to build element
		 *
		 * @returns	{string} The HTML to be inserted
		 */
		_buildInsert: function (item) {
			let element;

			switch (item.type) {
				case 'image':
					// Give the img a unique ID, otherwise removing image in editor when added more than once will only remove one

					element = $('<img/>')
						.attr({
							'data-fileid'	: item.fileID,
							'src'			: item.link,
							'data-unique'	: Math.random().toString(36).substr(2, 9),
						})
						.addClass('ipsImage ipsImage_thumbnailed');

					if (item.fullImage) {
						const link = $('<a>').attr('href', item.fullImage).addClass('ipsAttachLink ipsAttachLink_image');
						element.addClass('ipsImage_thumbnailed');
						link.append(element);
						element = link;
					}


					break;

				case 'video':
					element = $('<video controls>').attr({
						'class': 'ipsEmbeddedVideo',
						'data-controller': 'core.global.core.embeddedvideo',
						'data-fileid': item.fileID,
						'data-unique': Math.random().toString(36).substr(2, 9)
					});

					const sourceElement = $('<source>').attr({
						'src': item.fullImage,
						'type': item.mimeType
					});

					element.append(sourceElement);
					element.append(
						$('<a>')
							.addClass('ipsAttachLink')
							.attr('href', `${ips.getSetting('baseURL')}applications/core/interface/file/attachment.php?id=${item.fileID}${item.fileKey ? `&key=${item.fileKey}` : ''}`)
							.html(item.title)
					);
					break;

				case 'audio':
					element = $('<audio controls>').attr({
						'data-controller': 'core.global.core.embeddedaudio',
						'src': `${ips.getSetting('baseURL')}applications/core/interface/file/attachment.php?id=${item.fileID}${item.fileKey ? `&key=${item.fileKey}` : ''}`,
						'data-fileid': item.fileID,
						'data-unique': Math.random().toString(36).substring(2, 9),
						'type': item.mimeType
					});

					element.append(
						$('<a>')
							.addClass('ipsAttachLink')
							.attr('href', `${ips.getSetting('baseURL')}applications/core/interface/file/attachment.php?id=${item.fileID}${item.fileKey ? `&key=${item.fileKey}` : ''}`)
							.html(item.title)
					);
					break;

				default:
					element = $('<a>')
						.addClass('ipsAttachLink')
						.html(item.title)
						.attr({
							'data-fileid': item.fileID,
							'data-fileext': item.extension,
							'href': item.link ? item.link : `${ips.getSetting('baseURL')}applications/core/interface/file/attachment.php?id=${item.fileID}${item.fileKey ? `&key=${item.fileKey}` : ''}`
						});
			}
			
			if (item.extension) {
				element.attr('data-extension', item.extension);
			}

			return $('<div/>').append( element ).html();
		}
	});
}(jQuery));
