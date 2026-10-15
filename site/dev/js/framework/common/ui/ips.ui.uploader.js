/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.uploader.js - Uploading component, serving as a wrapper to plupload
 *
 * Author: Rikki Tissier 
 */
;( function($){
	const imageExtensions = new Set([ 'jpg', 'jpeg', 'jpe', 'gif', 'png', 'webp', 'avif' ]),
		audioExtensions = new Set([ 'mp3', 'ogg', 'wav', 'm4a' ]),
		videoExtensions = new Set([ 'mp4', '3gp', 'mov', 'ogg', 'ogv', 'mpg', 'mpeg', 'flv', 'webm', 'wmv', 'avi', 'm4v' ]);

	/**
		 * Upload instance
		 * Interfaces with plupload to provide consistent uploading behavior
		 *
		 * @param    {jQuery}    elem        The element this widget is being created on
		 * @param    {object}    options    The options passed into this instance
		 * @param e
		 * @returns {{init:Function, refresh:Function}}
		 */
	const uploadObj = function (elem, options, e) {
		elem = $(elem);

		let pluploadObj,
			runtime,
			listContainer,
			uploadCount = 0,
			totalSize = 0,
			injectIds = {},
			uploaderID = '',
			sound = null;

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		function init() {

			uploaderID = $( elem ).identify().attr('id');

			if( options.listContainer ){
				listContainer = $( options.listContainer );
			} else if( $( elem ).find('[data-role="fileList"]').length ) {
				listContainer = $( elem ).find('[data-role="fileList"]');
			} else {
				listContainer = $( elem );
			}

			// Do we need to insert a wrapper though?
			if( ips.templates.get( options.template + 'Wrapper' ) ){
				listContainer.prepend( ips.templates.render( options.template + 'Wrapper' ) );

				// Move any existing items
				const firstItem = listContainer.children().first();
				firstItem.append( listContainer.children().not( firstItem ) );

				// Set listContainer to the wrapper
				listContainer = firstItem;

				// And initialize any widgets we might have
				$( document ).trigger( 'contentChange', [ listContainer.parent() ] );
			}

			// Add document events
			$( document ).on( 'addUploaderFile', _addUploaderFile );
			$( document ).on( 'removeAllFiles', _removeAllFiles );

			// Any files to start with?
			if( options.existingFiles ){
				try {
					const files = JSON.parse(options.existingFiles);

					if( files.length ){
						_buildExistingFiles( files );
					}
				} catch (err) {
					Debug.error("Couldn't build existing files: " + err );
				}
			}

			ips.utils.cookie.set('editor_supports_drag', _supportsDraggable() ? 'true' : 'false');
			$(elem)
				.find('[data-action="browse"],[data-supports-drag]')
				.attr('data-supports-drag', _supportsDraggable() ? 'true' : 'false');

			// Load the appropriate files
			const load = ips.getSetting('useCompiledFiles') ?
				['core/interface/plupload/plupload.full.min.js'] :
				['core/interface/plupload/moxie.js', 'core/interface/plupload/plupload.dev.js'];

			ips.loader.get( load ).then( function () {
				_setUpUploader();
				_initUploader();
				_postInitEvents();
				_setUpFormEvents();
			});
		}

		/**
		 * Refreshes the pluploader, if available
		 *
		 * @returns   {void}
		 */
		function refresh() {
			if (pluploadObj) {
				Debug.log("Refreshing");
				pluploadObj.refresh();
			}
		}

		/**
		 * Sets up form handling, allowing us to stop a form submit if an upload is in progress
		 *
		 * @returns   {void}
		 */
		function _setUpFormEvents() {
			const form = _getForm();
			if (!form.length) {
				return;
			}

			/* Stock photo handler init */
			if ( options.allowStockPhotos !== false ) {
				$( elem ).find('[data-action="stockPhoto"]').on( 'click', function(e) {
					e.preventDefault();
					e.stopPropagation();

					const dialogRef = ips.ui.dialog.create({
						title: ips.getString("stockphoto_header"),
						fixed: false,
						destructOnClose: true,
						url: ips.getSetting('baseURL') + '?app=core&module=system&controller=pixabay&uploader=' + $(elem).attr('data-ipsUploader-name'),
					});
					dialogRef.show();
				} );
			}

			// plupload.STOPPED indicates either nothing has been uploaded or all files
			// have finished uploading. For any other state, we'll stop the form submitting.
			form.on( 'submit', function (e) {
				if( pluploadObj.state !== plupload.STOPPED ){
					e.preventDefault();
					e.stopPropagation();

					ips.ui.alert.show({
						type: 'alert',
						message: ips.getString('filesStillUploading'),
						subText: ips.getString('filesStillUploadingDesc'),
						icon: 'warn'
					});

					$(elem).trigger('fileStillUploading');
				}
			});
		}

		/**
		 * Responds to event and adds an uploaded file to the uploader container
		 *
		 * @param 	  {event} 	e 		Event object
		 * @param 	  {object} 	data	Event data object
		 * @returns   {void}
		 */
		function _addUploaderFile(e, data) {
			if (data.uploaderID === uploaderID) {
				data.extIcon = ips.ui.uploader.getExtensionIcon( data.title );
				listContainer.append( ips.templates.render( _getTemplateName(data), data ) );
			}
		}

		/**
		 * Return the appropriate template name based on options.template or the data type
		 *
		 * @param 	  {object} 	data	Event data object
		 * @returns   {string}
		 */
		function _getTemplateName(data) {
			if( options.template !== null ){
				return options.template;
			}

			let type = 'fileItem'; // Default type

			// Show the appropriate container for this kind of file
			if( data.isImage ){
				type = 'imageItem';
			} else if( data.isVideo ){
				type = 'videoItem';
			}

			return `core.attachments.${type}`;
		}

		/**
		 * Responds to event and removes all the files in the uploader
		 *
		 * @returns   {void}
		 */
		function _removeAllFiles() {
			listContainer.find('[data-role="file"]').remove();
		}

		/**
		 * Builds existing file items using the parsed JSON from the widget settings
		 *
		 * @param 	  {{
		 imagesrc:string|undefined,
		 thumbnail: string|undefined,
		 originalFileName: string,
		 size:  *,
		 default,
		 id,
		 hasThumb
		 }[]} 	files 	Object containing file data
		 * @returns   {void}
		 */
		function _buildExistingFiles(files) {
			if( !files.length ){
				return;
			}

			for (let file of files) {
				const data = {
					id: file.id,
					imagesrc: file.imagesrc,
					thumbnail: file.thumbnail ? file.thumbnail : '',
					thumbnail_for_css: file.thumbnail ? file.thumbnail.replace('(', '\\(').replace(')', '\\)') : '',
					title: file.originalFileName,
					size: file.size,
					field_name: $(elem).attr('data-ipsUploader-name'),
					newUpload: false,
					insertable: !options.insertable,
					done: true,
					'default': file.default ? file.default : null,
					supportsDelete: options.supportsDelete,
					extIcon: ips.ui.uploader.getExtensionIcon(file.originalFileName)
				};

				if (file.id === $(elem).attr('data-ipsUploader-default')) {
					data['checked'] = "checked";
				}
				if (file.hasThumb) {
					data['thumb'] = "<img src='" + ( file['thumbnail'] ? file['thumbnail'] : file['imagesrc'] ) + "' class='ipsImage' alt='An uploaded image'>";
				}

				listContainer.append(ips.templates.render(options.template, data));

				$('#' + file.id)
					.trigger( 'newItem', [ $('#' + file.id) ] );
			}

			$(elem).trigger('fileAdded', {
				count: files.length,
				uploader: options.name
			});
		}

		/**
		 * Passes a settings object through to plupload, but does not initialize it yet
		 *
		 * @returns   {void}
		 */
		 function _setUpUploader() {
			pluploadObj = new plupload.Uploader( _getUploaderSettings() );
			pluploadObj.bind('Init', events.init );
			listContainer.find( '[data-role="file"]' ).each( function () {
				const fileElem = $(this);
				fileElem.on( 'click', '[data-role="deleteFile"]', _deleteFile.bind( fileElem, fileElem ) );
				uploadCount++;
			});
		}

		/**
		 * Get the form this uploader belongs to
		 *
		 * @return {*|jQuery}
		 *
		 * @private
		 */
		function _getForm() {
			let form = $(elem).parentsUntil('', 'form');
			if (!form.length && options.postkey) {
				form = $(`[data-ipseditorv5-postkey="${options.postkey}"]`).closest('form');
			}

			return form;
		}

		/**
		 * Builds the settings object which will be passed to plupload
		 *
		 * @returns   {object}
		 */
		 function _getUploaderSettings() {

			// If there is no action, find one
			const form = _getForm();
			if ( options.action === null ) {
				options.action = form.attr('action');
			}
			if ( options.key === null ) {
				options.key = form.children("[name='plupload']").val();
			}

			// Init Plupload Options
			const pluploadOptions = {
				runtimes: 'html5,flash,silverlight,html4',
				multi_selection: options.multiple,
				url: encodeURI(_decodeUrl(options.action)),
				file_data_name: options.name,
				flash_swf_url: 'applications/core/interface/plupload/Movie.swf',
				silverlight_xap_url: 'applications/core/interface/plupload/Movie.xap',
				browse_button: $(elem).find(options.button).identify().attr('id'),
				headers: {'x-plupload': options.key},
				chunk_size: options.maxChunkSize + 'mb'
			};

			/*if( options.maxFileSize ) {
				pluploadOptions.filters = {
					'max_file_size': ( options.maxFileSize > 1 ) ? options.maxFileSize + 'mb' : ( options.maxFileSize * 1024 ) + 'kb'
				};
			}*/
			/*if ( options.maxFileSize ) {
				pluploadOptions.max_file_size = ( options.maxFileSize > 1 ) ? options.maxFileSize + 'mb' : ( options.maxFileSize * 1024 ) + 'kb';
			}*/

			// Dragdrop target
			if( options.dropTarget ){
				pluploadOptions.drop_element = $( options.dropTarget ).attr('id');
			} else if( $( elem ).hasClass('ipsAttachment_dropZone') ){
				pluploadOptions.drop_element = $( elem ).attr('id');
			} else if( $( elem ).find('.ipsAttachment_dropZone').length ){
				pluploadOptions.drop_element = $( elem ).find('.ipsAttachment_dropZone').identify().attr('id');
			}

			return pluploadOptions;
		}

		/**
		 * Tests to see if the URL is encoded or not
		 *
		 * @returns   boolean
		 */
		 function _isEncoded(url) {
			url = url || '';

			return url !== decodeURI( url );
		}

		/**
		 * Decode an encoded URL
		 *
		 * @returns   {string}
		 */
		function _decodeUrl(url) {
			while( _isEncoded( url ) ) {
				url = decodeURI( url );
			}
			return url;
		}

		/**
		 * Inits pluploader
		 *
		 * @returns   {void}
		 */
		function _initUploader() {
			pluploadObj.init();
		}

		/**
		 * Binds all of the post-init events for pluploader
		 *
		 * @returns   {void}
		 */
		function _postInitEvents() {
			pluploadObj.bind('Error', events.error );						// An error occurred
			pluploadObj.bind('FilesAdded', events.filesAdded );				// Files added to the queue
			pluploadObj.bind('FilesRemoved', events.filesRemoved );			// Files are removed from the queue
			pluploadObj.bind('UploadFile', events.uploadFile );				// A file is starting
			pluploadObj.bind('UploadProgress', events.uploadProgress );		// There's progress on a file
			pluploadObj.bind('FileUploaded', events.fileUploaded );			// A file finished
			pluploadObj.bind('UploadComplete', events.uploadComplete );		// All files in the queue finished

			$( elem )
				.on( 'injectFile', function( e, data ){
					data = data === undefined ? e.originalEvent?.data : data;
					if (typeof data !== 'object' || !(data.file instanceof File) || !('data' in data)) {
						Debug.log('Cannot handle the file injection because there is no file to inject');
						return;
					}
					const pluploadFile = new plupload.File(new moxie.file.File(getRuntimeUid(), data.file));
					injectIds[pluploadFile.id] = data.data;

					pluploadObj.addFile( pluploadFile );
				} )
				.on( 'resetUploader', function ( data ){
					_resetUploader();
				} );

			$(window).on( 'resize', function(){
				pluploadObj.refresh();
			} );
		}

		/**
		 * Gets runtime UID
		 *
		 * @returns	{obj}
		 */
		 function getRuntimeUid() {
			if( !runtime )
			{
				runtime = new (moxie.runtime.Runtime.getConstructor(pluploadObj.runtime))();
				runtime.init();
			}

			return runtime.uid;
		}

		/**
		 * Resets this uploader instance, clearing it of files
		 *
		 * @returns 	{void}
		 */
		function _resetUploader() {
			// Update upload count
			uploadCount = 0;
			totalSize = 0;
			_updateCount();

			$( elem ).trigger( 'removeAllFiles', { uploaderID: uploaderID } );
		}

		/**
		 * Begins the upload process (called automatically when files are added)
		 *
		 * @returns 	{void}
		 */
		 function _startUpload() {
			Debug.log('Starting upload process...');
			pluploadObj.start();
		}

		/**
		 * Returns a human-readable, translated status string
		 *
		 * @param 	{number}	status 		Status code
		 * @returns {string}
		 */
		function _getStatus(status) {
			switch( status ) {
				case plupload.QUEUED:
					return ips.getString('attachQueued');
				case plupload.UPLOADING:
					return ips.getString('attachUploading');
				case plupload.FAILED:
					return ips.getString('attachFailed');
				case plupload.DONE:
					return ips.getString('attachDone');
			}
		}

		/**
		 * Updates a file element with the current status
		 *
		 * @param 	{object} 	file 	File information object from plupload
		 * @returns {jQuery} 	The file element
		 */
		function _updateFileElement(file) {
			const fileElem = _findFileElem(file);

			_removeStatusClasses( fileElem );
			_updateStatus( fileElem, file.status );
			_updateCount();

			return fileElem;
		}

		/**
		 * Returns the file element for a given file object
		 *
		 * @param 	{object}	file 	 	File object from plupload
		 * @returns {jQuery}
		 */
		function _findFileElem(file) {
			return $( elem ).find('#' + file.id);
		}

		/**
		 * Updates the relevant elements within a file element with the current file status
		 *
		 * @param 	{jQuery}	fileElem 	The element that represents this file
		 * @param	{number} 	status 	 	Current status code
		 * @returns {void}
		 */
		function _updateStatus(fileElem, status) {
			$(fileElem).find('[data-role="status"]').html( _getStatus(status) );
			$(fileElem).toggleClass('ipsAttach_error', status === plupload.FAILED);
		}

		/**
		 * Removes the 4 status classes from the provided file element
		 *
		 * @param 	{element}	fileElem 	The element that represents this file
		 * @returns {void}
		 */
		function _removeStatusClasses(fileElem) {
			for (const type of ['uploading', 'done', 'error', 'queued']) {
				fileElem.removeClass( 'ipsAttach_' + type );
			};
		}

		/**
		 * Updates relevant elements with the uploaded count, and fires an event to let everyone know
		 *
		 * @returns 	{void}
		 */
		function _updateCount() {
			$( elem ).find('[data-role="count"]').text( uploadCount );

			elem.trigger('uploadedCountChanged', {
				count: uploadCount,
				percent: pluploadObj.total.percent,
				uploader: options.name
			});
		}

		/**
		 * Updates relevant element within a file element with the percentage completed
		 *
		 * @param 	{element}	fileElem 	The element that represents this file
		 * @param	{number} 	percent 	Percentage complete
		 * @returns {void}
		 */
		function _setPercent(fileElem, percent) {
			$(fileElem).find('[data-role="progressbar"]').attr('value', percent);

			if( percent === 100 ){
				fileElem.find('.ipsMeter').slideUp();
			}
		}

		/**
		 * Builds a thumbnail element
		 *
		 * @param 	{element}	fileElem 	The element that represents this file
		 * @param	{object} 	file 	 	File information object
		 * @param	{object} 	info 	 	Info object from events.uploadDone
		 * @returns {void}
		 */
		function _buildThumb(fileElem, file, info) {
			let toInsert = '';

			if( info.imagesrc ){

				Debug.log( fileElem.find('[data-role="preview"]') );

				toInsert = $('<img/>').attr( { src: info.thumbnail ? info.thumbnail : info.imagesrc, alt: '' } );
				fileElem
					.attr( 'data-fullsizeurl', info.imagesrc )
					.attr( 'data-thumbnailurl', info.thumbnail ? info.thumbnail : info.imagesrc )
					.find('[data-role="preview"]')
						.html( toInsert );
			} else if( info.videosrc ){
				toInsert = $('<video/>').append( $('<source/>').attr( { src: info.videosrc, type: fileElem.attr('data-mimeType') } ) );
				fileElem
					.attr( 'data-fullsizeurl', info.videosrc )
					.find('[data-role="preview"]')
						.html( toInsert );
			}


			fileElem.attr( 'data-fileid', info.id );
			if ( info.securityKey ) {
				fileElem.attr( 'data-filekey', info.securityKey );
			}
		}

		/**
		 * Deletes a pre-existing file
		 *
		 * @param 	{element}	fileElem 	The element that represents this file
		 * @param	{event} 	e 	 		Info object from events.uploadDone
		 * @returns {void}
		 */
		function _deleteFile(fileElem, e) {
			e.preventDefault();
			e.stopPropagation();

			let baseUrl = options.action;

			if( baseUrl.match(/\?/) ) {
				if( baseUrl.slice(-1) !== '?' ){
					baseUrl += '&';
				}
			} else {
				baseUrl += '?';
			}

			// Delete via ajax
			ips.getAjax()( baseUrl + 'getUploader&postKey=' + options.postkey + '&deleteFile=' + encodeURIComponent( fileElem.attr('data-fileid') ) );

			// Update upload count
			uploadCount--;
			totalSize = totalSize - fileElem.attr('data-filesize');
			_updateCount();

			// Remove element
			/*fileElem.animationComplete( function () {
				fileElem.remove();

				// Let the document know
				elem.trigger( 'fileDeleted', { fileElem: fileElem, uploader: options.name, count: uploadCount } );
			});

			ips.utils.anim.go( 'fadeOutDown', fileElem );*/

			fileElem.fadeOut( function () {
				fileElem.remove();
				// Let the document know
				elem.trigger( 'fileDeleted', { fileElem: fileElem, uploader: options.name, count: uploadCount, postkey: options.postkey } );
			});
		}

		/**
		 * Returns boolean indicating if dragging is supported
		 *
		 * @returns {boolean}	Supports draggable?
		 */
		function _supportsDraggable() {
			return 'draggable' in document.createElement('span') && FileReader !== undefined && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		}

		/**
		 * Fix the z-index of the upload messages prompt. For some reason, plupload and/or moxie.js sets the z-index to 1 but we don't need that.
		 *
		 * @returns {void}
		 *
		 * @private
		 */
		function _fixZIndex() {
			$(elem).get(0).querySelector(options.button)?.style.setProperty('z-index', '')
		}

		// Events object
		let events = {
			/**
			 * Init
			 */
			init(up) {
				_fixZIndex();
				if( _supportsDraggable() ) {
					const dropElement = $(up.settings.drop_element);

					// Handles adding the dragging class to the upload element.
					// dragleave is a pain and works like mouseout instead of mouseleave in that it fires as soon as we leave the parent,
					// even if we're actually in a child now. So we have to get creative about detecting it correctly by listening for
					// dragenters on the whole document, and seeing whether they're children of our upload element.
					let currentElem = null;

					$( document )
						.on('dragenter', function (e) {
							if( currentElem && !$( e.target ).is( dropElement) && !$.contains( dropElement.get(0), currentElem ) ){
								dropElement.removeClass('ipsDragging');
								currentElem = null;
							}
						});

					dropElement
						.on('dragleave', function () {
							if( !$( currentElem ).is( dropElement) && !$.contains( dropElement.get(0), currentElem ) ){
								dropElement.removeClass('ipsDragging');
								currentElem = null;
							}
						})
						.on('dragenter', function (e) {
							const target = $(e.target);

							if( target.is( dropElement ) || $.contains( dropElement.get(0), e.target ) ){
								dropElement.addClass('ipsDragging');
								currentElem = e.target;
							}
						})
						.on('drop', function () {
							dropElement.removeClass('ipsDragging');
							currentElem = null;
						});
				}
			},

			/**
			 * Files Added
			 */
			filesAdded(up, files) {
				_fixZIndex();
				if (!options.multiple) {
					listContainer.find( '[data-role="deleteFile"]' ).trigger('click');
					if (files.length > 1) {
						ips.ui.alert.show({
							type: 'alert',
							icon: 'warn',
							message:ips.getString('uploadSingleErr')
						});

						for (const file of files) {
							up.removeFile(file);
						}

						return false;
					}
				} else if (options.maxFiles) {
					if (files.length > options.maxFiles || ( uploadCount + files.length ) > options.maxFiles) {
						ips.ui.alert.show( {
							type: 'alert',
							icon: 'warn',
							message: ips.pluralize( ips.getString( 'uploadMaxFilesErr' ), options.maxFiles ),
							callbacks: {}
						});

						for (const file of files) {
							up.removeFile( file );
						}

						return false;
					}
				} else if (options.maxTotalSize && totalSize > ( options.maxTotalSize * 1048576 )) {

					ips.ui.alert.show( {
						type: 'alert',
						icon: 'warn',
						message: ips.getString( 'uploadTotalErr', {
							size: parseFloat(
								( options.maxTotalSize >= 1 ) ? options.maxTotalSize : ( options.maxTotalSize * 1024 )
							).toLocaleString( $('html').attr('lang') ),
							size_suffix: ( options.maxTotalSize >= 1 ) ? ips.getString('size_mb') : ips.getString('size_kb')
						} ),
						callbacks: {}
					});

					for (const file of files) {
						up.removeFile( file );
					}

					return false;
				}

				const allowedFileTypes = (options.allowedFileTypes !== null) ? new Set(JSON.parse(options.allowedFileTypes?.toLowerCase?.()) || []) : '';
				let tooLarge = 0,
					overTotalLimit = 0,
					badType = 0,
					sizeAllowance = options.maxTotalSize ? (options.maxTotalSize * 1048576) - totalSize : null,
					fileSizeAllowance = options.maxFileSize ? options.maxFileSize * 1048576 : null

				for (let file of files) {
					// Check the size of this file
					if (fileSizeAllowance !== null && file.size > fileSizeAllowance) {
						// The file is too big, so remove it
						tooLarge++;
						up.removeFile( file );
						continue;
					}

					// Check max size allowed
					if (sizeAllowance !== null) {
						if (sizeAllowance < file.size) {
							// The file would put us over our limit, so remove it
							overTotalLimit++;
							up.removeFile( file );
							continue;
						}
						sizeAllowance -= file.size;
					}

					// And the extension
					const ext = file.name.split('.').pop().toLowerCase();
					if ( allowedFileTypes?.size && !allowedFileTypes.has(ext)) {
						badType++;
						up.removeFile( file );
						continue;
					}

					const size = plupload.formatSize( file.size ),
						status = _getStatus( file.status );

					// Trigger event for adding the file element, to allow controllers to intercept
					$( elem ).trigger( 'addUploaderFile', {
						uploaderID: uploaderID,
						id: file.id,
						title: file.name,
						mime: file.type,
						size: size,
						sizeRaw: file.size,
						status,
						statusCode: file.status,
						statusText: ips.getString('attachStatus', { size: size, status: status } ),
						field_name: elem.attr('data-ipsUploader-name'),
						newUpload: true,
						insertable: true,
						isImage: imageExtensions.has(ext),
						isVideo: videoExtensions.has(ext),
						isAudio: audioExtensions.has(ext),
						supportsDelete: options.supportsDelete
					} );

					$('#' + file.id)
						.addClass( 'ipsAttach_queued' )
						.trigger( 'newItem', [ $('#' + file.id) ] );
				}

				// Do we need to warn the user?
				if (tooLarge) {
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: ips.pluralize(
							ips.getString(
								'uploadSizeErr',
								{
									max_file_size: parseFloat(( options.maxFileSize > 1 ) ? options.maxFileSize : ( options.maxFileSize * 1024 ))
										.toLocaleString(document.documentElement.lang),
									size_suffix: ( options.maxFileSize > 1 ) ? ips.getString('size_mb') : ips.getString('size_kb')
								}),
							[tooLarge, tooLarge])
					});
					for (const file of files) {
						up.removeFile(file);
					}
				}

				if (overTotalLimit) {
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: ips.pluralize(
							ips.getString(
								'uploadSizeTotalErr',
								{
									max_file_size: parseFloat(options.maxTotalSize > 1 ? options.maxTotalSize : options.maxTotalSize * 1024)
										.toLocaleString(document.documentElement.lang),
									size_suffix: ( options.maxTotalSize > 1 ) ? ips.getString('size_mb') : ips.getString('size_kb')
								}),
							[overTotalLimit, overTotalLimit]
						),
						callbacks: {}
					});
				}

				if (badType) {
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: ips.pluralize(
							ips.getString(
								'pluploaderr_-601',
								{ allowed_extensions: [...allowedFileTypes].join(', ') }
							),
							[tooLarge, tooLarge]
						),
						callbacks: {}
					});
				}

				// If we still have some files, we can start them
				if (up.files.length) {
					$(elem).trigger('fileAdded', {
						count: up.files.length,
						uploader: options.name
					});

					if (options.autoStart) {
						_startUpload();
					}
				}
			},

			filesRemoved(uploader, files) {
				if (files instanceof Array || Symbol.iterator in files) {
					for (const file of files) {
						if (file.id && injectIds[file.id]?.error instanceof Function) {
							try {
								injectIds[file.id].error();
							} catch (e) {
								console.error(e);
							}
						}
					}
				}
				_fixZIndex();
				Debug.log('removed');
			},

			/**
			 * Upload File
			 */
			uploadFile(up, file) {
				_fixZIndex();
				$(elem).find('.ipsAttachment_loading').show();
				_updateFileElement( file ).addClass('ipsAttach_uploading');
			},

			/**
			 * Upload Progress
			 */
			uploadProgress(up, file) {
				_fixZIndex();
				const fileElem = _updateFileElement(file);
				fileElem.addClass('ipsAttach_uploading');

				// Set the progress percent
				_setPercent( fileElem, file.percent );

				elem.trigger('uploadProgress', {
					count: uploadCount,
					percent: pluploadObj.total.percent,
					uploader: options.name
				});
			},

			/**
			 * All files have finished uploading
			 * We'll show a notification & sound if supported
			 */
			uploadComplete(up, files) {
				_fixZIndex();
				let success = 0;
				let error = 0;

				// Figure out how many files were successful/errors, ignore other statuses
				for (const file of files){
					if( file.status === 5 ){
						success++;
					} else if ( file.status === 4 ){
						error++;
					}
				};

				const total = success + error;


				/* Make sure the spinner is reset */
				$(elem).find('.ipsAttachment_loading').hide();

				elem.trigger('uploadComplete', {
					success: success,
					error: error,
					total: total,
					uploader: options.name
				});

				// Only if we aren't active on the page
				if( ips.utils.events.getVisibilityProp() !== undefined || !document[ ips.utils.events.getVisibilityProp() ] ){
					return;
				}

				const text = [];

				if( !total ){
					return;
				}

				if( success ){
					text.push( ips.pluralize( ips.getString('notifyUploadSuccess'), [ success ] ) );
				}

				if( error ){
					text.push( ips.pluralize( ips.getString('notifyUploadError'), [ error ] ) );
				}

				if( ips.utils.notification.hasPermission() ){
					ips.utils.notification.create({
						title: ips.pluralize( ips.getString('yourUploadsFinished'), [ total ] ),
						body: text.join(' '),
						icon: ips.getSetting('upload_imgURL'),
						onClick: function () {
							try {
								window.focus();
							} catch (err) {}
						}
					}).show();
				}

				if( sound ){
					try {
						sound.play();
					} catch (err) { }
				}
			},

			/**
			 * File Uploaded
			 */
			fileUploaded(up, file, info) {
				_fixZIndex();

				// Update count of completed files
				uploadCount++;

				totalSize += file.size;

				const fileElem = _updateFileElement(file);

				fileElem.addClass('ipsAttach_done');

				if( options.insertable ){
					ips.utils.anim.go('fadeIn', fileElem.find('[data-role="insert"]') );
				}

				fileElem.find('[data-role="deleteFileWrapper"]').slideDown();
				//ips.utils.anim.go('fadeIn',  );

				// Set the progress percent
				_setPercent( fileElem, 100 );

				// Do we have an image to process?
				try {
					const jsonInfo = JSON.parse(info.response);

					elem.before( $('<input type="hidden">').attr( 'name', elem.attr('data-ipsUploader-name') + '_existing[' + file.id + ']' ).attr( 'value', jsonInfo.id ) );

					if( jsonInfo['error'] ){
						fileElem.on( 'click', '[data-role="deleteFile"]', _deleteFile.bind( fileElem, fileElem ) );
						file.status	= plupload.FAILED;

						up.trigger('error', {
							code: jsonInfo['error'],
							extra: jsonInfo['extra'],
							subText: jsonInfo['sub'],
							file: file,
							uploader: options.name
						});

						return;
					}

					if( jsonInfo ){
						_buildThumb( fileElem, file, jsonInfo );
						fileElem.on( 'click', '[data-role="deleteFile"]', _deleteFile.bind( fileElem, fileElem ) );
					}
				} catch (err) {

					fileElem.on( 'click', '[data-role="deleteFile"]', _deleteFile.bind( fileElem, fileElem ) );
					file.status	= plupload.FAILED;

					up.trigger('error', {
						code: 'upload_error',
						extra: err.message,
						file: file,
						uploader: options.name
					});

					Debug.warn( err );
				}

				// Are we handling this immediately?
				if ( file.id && injectIds[ file.id ] ) {
					$( elem ).trigger( 'fileInjected', { 'fileElem': fileElem, 'data': injectIds[ file.id ] } );
					delete injectIds[ file.id ];
				}
			},

			/**
			 * Error
			 */
			error(up, err) {
				_fixZIndex();
				if( err.file ){
					const {file} = err;
					if (file.id && file.id in injectIds && injectIds[file.id].error instanceof Function) {
						injectIds[file.id].error();
					}
					_updateFileElement( file );
				}

				// If this is a 'too large' error, we won't
				if( err.code === -600 || err.code === -601 ){
					return;
				}

				let errorMessage = ips.getString('pluploaderr_' + err.code, {
					max_file_size: parseFloat(
						(options.maxFileSize > 1) ? options.maxFileSize : (options.maxFileSize * 1024)
					).toLocaleString($('html').attr('lang')),
					size_suffix: (options.maxFileSize > 1) ? ips.getString('size_mb') : ips.getString('size_kb'),
					allowed_extensions: (options.allowedFileTypes !== null) ? JSON.parse(options.allowedFileTypes).join(',') : '',
					server_error_code: (err.extra !== null) ? err.extra : 0,
				});

				if ( !errorMessage ) {
					errorMessage = ips.getString( 'pluploaderr_SERVER_CONFIGURATION', {
						server_error_code: err.code
					} );

					err.subText = ips.getString('pluploaderr_error_code', { code: err.code });
				}

				if (typeof err?.file?.id === 'string') {
					delete injectIds[err.file.id];
				}

				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: errorMessage,
					callbacks: {},
					subTextHtml: err.subText ? err.subText : null
				});
			}
		};

		init();

		return {
			init,
			refresh
		};
	};
	"use strict";

	const iconMap = {
		'txt': 'file-lines',
		'rtf': 'file-lines',
		'csv': 'file-lines',
		'pdf': 'file-pdf',
		'doc': 'file-word',
		'docx': 'file-word',
		'xls': 'file-excel',
		'xlsx': 'file-excel',
		'xlsm': 'file-excel',
		'zip': 'file-archive',
		'tar': 'file-archive',
		'gz': 'file-archive',
		'ppt': 'file-powerpoint',
		'pptx': 'file-powerpoint',
		'ico': 'file-image',
		'gif': 'file-image',
		'jpeg': 'file-image',
		'jpg': 'file-image',
		'jpe': 'file-image',
		'png': 'file-image',
		'avif': 'file-image',
		'psd': 'file-image',
		'webp': 'file-image',
		'aac': 'file-audio',
		'mp3': 'file-audio',
		'ogg': 'file-audio',
		'ogv': 'file-audio',
		'wav': 'file-audio',
		'm4a': 'file-audio',
		'flv': 'file-video',
		'mkv': 'file-video',
		'mp4': 'file-video',
		'mpg': 'file-video',
		'mpeg': 'file-video',
		'3gp': 'file-video',
		'webm': 'file-video',
		'wmv': 'file-video',
		'avi': 'file-video',
		'm4v': 'file-video',
		'mov': 'file-video',
		'css': 'file-code',
		'html': 'file-code',
		'js': 'file-code',
		'xml': 'file-code',
	};

	ips.createModule('ips.ui.uploader', function(){

		const defaults = {
			multiple: false,
			allowedFileTypes: null,
			maxFileSize: null, // in megabytes
			maxTotalSize: null, // in megabytes
			maxChunkSize: null,
			action: null,
			name: 'upload',
			button: '.ipsButton--primary',
			key: null,
			autoStart: true,
			insertable: false,
			template: 'core.attachments.fileItem',
			postkey: '',
			supportsDelete: true,
			allowStockPhotos: false,
		};

		function respond(elem, options) {
			if( !$( elem ).data('_uploader') ){
				$( elem ).show();
				$( elem ).data('_uploader', uploadObj(elem, { ...defaults, ...options } ) );
			} else {
				try {
					const obj = $(elem).data('_uploader');
					obj.refresh();
				} catch (err) {
					Debug.log("Couldn't refresh uploader " + $( elem ).identify().attr('id') );
				}
			}
		}

		/**
		 * Refresh an existing uploader instance
		 *
		 * @param	{element} 	elem 		The element to refresh
		 * @returns {void}
		 */
		function refresh(elem) {
			try {
				const obj = $(elem).data('_uploader');
				obj.refresh();
			} catch (err) {
				Debug.log("Couldn't refresh uploader " + $( elem ).identify().attr('id') );
			}
		}

		/**
		 * Retrieve the uploader instance (if any) on the given element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {*} 	The uploader instance or undefined
		 */
		function getObj(elem) {
			if( $( elem ).data('_uploader') ){
				return $( elem ).data('_uploader');
			}

			return undefined;
		}

		/**
		 * Return an appropriate file type icon based on a provided filename extension
		 *
		 * @param	{string} 	filename 		The filename to use
		 * @returns {string} 	A fontawesome classname
		 */
		function getExtensionIcon(filename) {
			const extRegex = /(?:\.([^.]+))?$/;
			const ext = extRegex.exec(filename);

			if( iconMap[ext[1]] !== undefined ){
				return iconMap[ext[1]];
			}

			return 'file';
		}

		ips.ui.registerWidget('uploader', ips.ui.uploader, [ 
			'multiple', 'allowedFileTypes', 'maxFileSize', 'maxTotalSize', 'maxChunkSize', 'action', 'name', 'button', 'key', 
			'maxFiles', 'dropTarget', 'listContainer', 'autoStart', 'insertable', 'template', 'existingFiles', 'postkey',
			'supportsDelete', 'allowStockPhotos'
		] );

		return {
			respond: respond,
			refresh: refresh,
			getObj: getObj,
			getExtensionIcon: getExtensionIcon
		};
	});

}(jQuery));