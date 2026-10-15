/**
 * IPS Social Suite 4
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.stockart.pixabay.js - Controller for Pixabay Actions
 *
 * Author: Daniel Fatkic
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.stockart.pixabay', {

		initialize: function () {
			this.on( 'click', '.ipsPixabayImage', this.selectImage );
			this.on( 'focus', '[data-role="pixabaySearch"]', this.searchPixabay );
			this.on( 'blur', '[data-role="pixabaySearch"]', this.stopSearchPixabay );
			$('[data-role="pixabayResults"]').on( 'scroll', this.scrollEvent.bind(this) );
			this.setup();
		},
		_typeTimer: null,
		_lastVal: '',
		_perPage: 20,
		_status: 'init',
		
		setup: function () {
			this.uploader = $(document).find('[data-ipsUploader-name="'+ this.scope.attr('data-uploader') + '"]');
			this._doSearch(null);
		},


		searchPixabay: function (e) {
			this._typeTimer = setInterval( this._typing.bind(this), 1500 );
		},
		
		/**
		 * Event handler for scrolling
		 * 
		 * @param 		{event}	 	e 		Event object
		 * @returns 	{void}
		 */
		scrollEvent: function (e) {
			
			var scrollScope = $('[data-role="pixabayResults"]');
			var scrollHeight = scrollScope[0].scrollHeight;
			const height = scrollScope.height();
			var distanceFromBottom = scrollHeight - scrollScope.height() - scrollScope.scrollTop();
			
			if ( this._status != 'ready' ) {
				return;
			}
			
			if( distanceFromBottom <= height * 1.2 ){
				this._status = 'loading';
				
				var offset = parseInt( this.scope.find('[data-role="pixabayMore"]').attr('data-offset') );
				this.scope.find('[data-role="pixabayMore"]').attr('data-offset', offset + this._perPage );
				
				this.scope.find('[data-role="pixabayMoreLoading"]').removeClass('ipsHide');
				
				this._doSearch( this._lastVal );
			}
		},
		
		/**
		 * The search box has blurred
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		stopSearchPixabay: function (e) {
			if( this._typeTimer ){
				clearInterval( this._typeTimer );
				this._typeTimer = null;
			}
			/* Clear Results */
		},

		/**
		 * Runs a continuous interval to check the current search value, and call the search function
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		_typing: function () {
			var textElem = this.scope.find('[data-role="pixabaySearch"]');

			if( this._lastVal == textElem.val() ){
				return;
			}
			
			this.scope.find('[data-role="pixabayMore"]').attr('data-offset', 0);
			
			this._doSearch( textElem.val() );
			
			this._lastVal = textElem.val();
		},

		/**
		 * AJAX call to fetch the images
		 *
		 * @param 		{string} 	value  		Search value
		 * @returns 	{void}
		 */
		async _doSearch(value) {
			var resultsbox = this.scope.find('[data-role="pixabayLoading"]');
			var offset = parseInt( this.scope.find('[data-role="pixabayMore"]').attr('data-offset') );

			const changed = value !== this._lastVal
			this.elem.classList.add('ipsLoading');
			if (changed) {
				this.elem.classList.add('ipsPixabay--loading-new-search');
			}
			this._status = 'loading';

			value = typeof value === 'string' ? value.trim() : value;
			let response;
			const cacheKey  = JSON.stringify({value, offset, perPage: this._perPage});
			if (ips.utils.db.get('pixabaySearch', cacheKey)) {
				response = ips.utils.db.get('pixabaySearch', cacheKey);
			} else {
				response = await ips.fetch(ips.getSetting('baseURL') + '?app=core&module=system&controller=pixabay&do=search&offset=' + offset + '&limit=' + this._perPage, {
					type: 'POST',
					data: {
						'search': value
					}
				});
				ips.utils.db.set('pixabaySearch', cacheKey, response, false, Date.now() / 1000 + 900); // 15 min cache
			}

			this.elem.classList.remove('ipsLoading');
			this.elem.classList.remove('ipsPixabay--loading-new-search');

			if ( response.error )
			{
				resultsbox.html(`<div class="ipsMessage ipsMessage--warning">${response.error}</div>`);
				this.status = 'error';
			}
			else
			{
				if (changed) {
					resultsbox.html('');
					this.elem.scrollTo({top: 0});
				}
				for (const term of response.images ){
					const div = document.createElement('div');
					div.innerHTML = ips.templates.render('core.editor.pixabayThumb', {
						thumb: term.thumb,
						url: term.url,
						imgid: term.imgid,
						height: term.thumbHeight,
						width: term.thumbWidth,
						ratio: term.thumbWidth / term.thumbHeight,
					} );

					const content = div.querySelector('.ipsPixabayThumb');
					if (content) {
						resultsbox.append(content);
					}
				};
				if ( offset > 0 || response.pagination.total_count > offset + this._perPage ) {
					this.scope.find('[data-role="pixabayMoreLoading"]').addClass('ipsHide');
					this._status = 'ready';
				}

				// No more available
				if ( response.pagination.total_count <= offset + this._perPage ) {
					this.scope.find('[data-role="pixabayMoreLoading"]').addClass('ipsHide');
					this._status = 'done';
				}
			}
		},
		
		selectImage: function(e)
		{
			var image = $( e.target );

			var pluploadObj = this.uploader.get(0);

			ips.getAjax()( ips.getSetting('baseURL') + '?app=core&module=system&controller=pixabay&do=getById&id=' + image.attr('data-id') ).done( async function (response) {
				var randomId = Math.random().toString(36).substring(7);
				var bstr = atob( response.content );
				var n = bstr.length;
				var u8arr = new Uint8Array(n);
				while(n--) {
					u8arr[n] = bstr.charCodeAt(n);
				}
				var file = new File( [u8arr], response.filename, { type: response.type } );

				const editorObj = await ips.ui.editorv5.getObjWithInit(pluploadObj.closest('.ipsComposeArea')?.querySelector('[data-ipseditorv5]'))
				if (editorObj) {
					editorObj.getInstance().commands.injectAttachments([file])
				} else {
					pluploadObj.dispatchEvent(new AttachmentInsertEvent({
						file,
						data: {
							ready(content, data) {
								const insertable = pluploadObj.querySelector(`[data-fileid="${data.fileID}"] [data-action="insertFile"]`)
								insertable?.click();
							}
						}
					}));
				}
			} );
			
			
			/* Now clear search and close the menu */
			this._status = 'init';
			this.scope.find('[data-role="pixabaySearch"]').val('');
			this.scope.find('[data-role="pixabayLoading"]').html('');
			this.elem.classList.add('ipsLoading');
			this.scope.trigger( 'closeDialog' );
		}
	});

	class AttachmentInsertEvent extends Event {
		constructor(data) {
			super('injectFile')
			this.data = data;
		}
	}
}(jQuery));