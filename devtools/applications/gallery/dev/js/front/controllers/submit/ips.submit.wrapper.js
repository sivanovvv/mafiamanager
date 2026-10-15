/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.main.js - Main gallery submit dialog controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.submit.wrapper', {

		_expanded: false,
		_currentErrors: {},

		/**
		 * Initialize the controller
		 *
		 * @returns {void}
		 */
		initialize: function () {
			// Intercept form submissions
			this.on( 'submit', 'form', this.submitForm );
			this.on( 'click', '[data-role="submitForm"]', this.maybeSubmitForm );

			// If another controller tells us to do something, do it
			this.on( 'gallery.submit.response', this._updateWrapper );

			// Handle uploader "clicks"
			this.on( 'click', '[data-role="addFiles"]', this.dropzoneClick );
			this.on( 'click', '[data-action="closeDialog"]', this.confirmClose );

			// Handle image details
			this.on( 'click', '[data-role="file"][data-fileid]', this.setUpImageDetailsForm );
			this.on( 'click', '[data-role="imageDescriptionUseEditor"]', this.setUpImageDescriptionRich );
			this.on( 'click', '[data-role="imageDescriptionUseTextarea"]', this.setUpImageDescriptionPlain );
			this.on( 'click', '[data-role="addCopyrightCredit"]', this.showCopyrightCredit );
			this.on( 'click', '[data-role="saveDetails"]', this.saveDetails );

			// Handle events from uploader
			this.on( 'gallery.activateSubmitButton', this.activateSubmitButton );
			this.on( 'gallery.disableSubmitButton', this.disableSubmitButton );
			this.on( 'gallery.uploadErrors', this.uploadErrors );
			this.on( 'gallery.enlargeUploader', this.enlargeUploader );
			this.on( 'gallery.updateTitle', this.updateTitle );

			// Set us up
			this.setup();

			// Let everyone know we're done in case they're waiting
			this.trigger('gallery.wrapperInit');
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			// On initial load, destroy the tiptap object as it will be recreated for each individual form
			ips.ui.editorv5.destruct( this.scope.find('[data-ipseditorv5]') );

			if( this.scope.find('.cGalleryDialog_imageForm').is(':visible') ){
				this._enlargeUploadStep();
			}
		},

		/**
		 * Event handler, allows other controllers to update the title
		 *
		 * @param 	{string} 	url 	URL to call
		 * @param 	{object} 	data	Data to pass to ajax handler
		 * @returns {void}
		 */
		updateTitle: function (e, data) {
			if( data.title ){
				this._updateTitle( data.title );
			}
		},

		/**
		 * Actually updates the title of the dialog
		 *
		 * @param 	{string} 	url 	URL to call
		 * @param 	{object} 	data	Data to pass to ajax handler
		 * @returns {void}
		 */
		_updateTitle: function (title) {
			this.scope.find('[data-role="dialogTitle"]').text( title );
		},

		/**
		 * Event handler for when another controller needs to enlarge the uploader
		 *
		 * @param 	{string} 	url 	URL to call
		 * @param 	{object} 	data	Data to pass to ajax handler
		 * @returns {void}
		 */
		enlargeUploader: function (e, data) {
			this._enlargeUploadStep( data.callback || $.noop );
		},

		/**
		 * Enable the submit button
		 *
		 * @returns {void}
		 */
		activateSubmitButton: function () {
			this.scope.find('[data-role="submitForm"]').prop( 'disabled', false );
		},

		/**
		 * Disable the submit button
		 *
		 * @returns {void}
		 */
		disableSubmitButton: function () {
			this.scope.find('[data-role="submitForm"]').prop( 'disabled', true );
		},

		/**
		 * Uploader encounted errors; show message
		 *
		 * @returns {void}
		 */
		uploadErrors: function () {
			this.scope.find('[data-role="imageErrors"]').show();
		},

		/**
		 * Handles a click on the dropzone, to trigger the Add Files dialog
		 *
		 * @returns {void}
		 */
		dropzoneClick: function() {
			this.scope.find('.ipsAttachment_dropZone').trigger('click');
		},

		/**
		 * Handles a click on the dropzone, to trigger the Add Files dialog
		 *
		 * @returns {void}
		 */
		showCopyrightCredit: function (e) {
			e.preventDefault();
			var link = $( e.currentTarget );
			link.hide().next().slideDown();
		},

		/**
		 * Mobile-specific functionality for 'save' button
		 *
		 * @returns {void}
		 */
		saveDetails: function (e) {
			if( e ){
				e.preventDefault();
			}

			this._markActiveImageAsSaved();

			// Show and then hide a 'saved' message
			$(e.currentTarget).next('[data-role="savedMessage"]').fadeIn();
			setTimeout( function () {
				$(e.currentTarget).next('[data-role="savedMessage"]').fadeOut();
			}, 2000 );

			// Hide any error messages
			if( e ){
				$( e.currentTarget ).closest('.cGallerySubmit_details').find('[data-errorField]').hide();
			}

			// Mobile-only behavior
			if( ips.utils.responsive.enabled() && ips.utils.responsive.currentIs('phone') ){
				// Fade out details form
				this._toggleDetailsPanelMobile(false);
				// Remove active selection styles
				this.scope.find('.cGallerySubmit_activeFile').removeClass('cGallerySubmit_activeFile');
			}
		},

		/**
		 * Confirm the user wants to close the dialog
		 *
		 * @returns {void}
		 */
		confirmClose: function (e) {
			// If there are no images uploaded, let's not bother with a confirmation
			if( !this.scope.find('[data-fileid]').length )
			{
				this.trigger('closeDialog');
				return;
			}

			if( e ){
				e.preventDefault();
			}

			var self = this;

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'question',
				message: ips.getString('confirmSubmitClose'),
				callbacks: {
					ok: function () {
						self.trigger('closeDialog');
					}
				}
			});
		},

		/**
		 * Marks the currently-active image as 'saved'
		 *
		 * @returns {void}
		 */
		_markActiveImageAsSaved: function () {
			this.scope.find('.cGallerySubmit_activeFile').removeClass('cGallerySubmit_imageError').addClass('cGallerySubmit_imageSaved');
		},

		/**
		 * Set up image details form
		 *
		 * @returns {void}
		 */
		setUpImageDetailsForm: function (e) {
			// Remove selection from all other files
			this.scope.find('.cGallerySubmit_activeFile').removeClass('cGallerySubmit_activeFile');
			$( e.currentTarget ).addClass('cGallerySubmit_activeFile');

			// Get the image ID first
			if( $( e.currentTarget ).attr('data-fileid').indexOf('o_') != -1 )
			{
				var imageId = $('input[name="images_existing\\[' + $( e.currentTarget ).attr('data-fileid') + '\\]"').val();
			}
			else
			{
				var imageId = $( e.currentTarget ).attr('data-fileid');
			}

			var imagePreview = $( e.currentTarget ).find('[data-role="preview"] img').attr('src');
			var detailsPanel = this.scope.find('[data-role="imageDetails"]');

			// Hide our existing form, if any
			detailsPanel.find('.cGallerySubmit_details, [data-role="submitHelp"]').hide();

			// If we've already built the image form, just show it
			if( $('#image_details_' + imageId ).length ){
				$('#image_details_' + imageId + ' .cGallerySubmit_details' ).show();

				if( ips.utils.responsive.currentIs('phone') ){
					this._toggleDetailsPanelMobile(true);
				}
			} else {
				// Otherwise, clone our existing form to use
				var htmlToInsert = $('[data-role="defaultImageDetailsForm"]').html();
				htmlToInsert	 = '<div id="image_details_' + imageId + '">' + htmlToInsert.replace( /name="image_tags_DEFAULT"/g, 'name="image_tags_DEFAULT" data-ipsAutocomplete ').replace( /_DEFAULT/g, '_' + imageId ) + "</div>";

				// Now insert this form
				detailsPanel.find('> form').prepend( htmlToInsert );

				var imageForm = $('#image_details_' + imageId );

				// Set the image caption
				var filename = $( e.currentTarget ).find('[data-role="title"]').text();
				var filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
				$('#elInput_image_title_' + imageId ).val( filenameWithoutExt );


				if( imagePreview !== undefined ){
					imageForm
						.find('.cGallerySubmit_preview')
							.html( $("<img class='ipsImage' alt=''/>").attr('src', imagePreview ) )
							.show();
				}
				else {
					imageForm
						.find('.cGallerySubmit_preview')
							.html("<i></i>")
							.show();
				}

				// If this is a movie, show the thumbnail uploader
				if( !$( e.currentTarget ).attr('data-thumbnailurl') ){
					imageForm.find('.cGalleryThumbField').removeClass('ipsHide');
				} else {

					// Otherwise if it's an image, find out if we have GPS info and need to let them toggle map on/off
					ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=gallery&module=gallery&controller=submit&do=checkGps&imageId=' + imageId, {
						type: 'get',
						bypassRedirect: true
					})
						.done( function (response, status, jqXHR) {
							// Just find the internal content
							if( parseInt( response.hasGeo ) ){
								imageForm.find('.cGalleryMapField').removeClass('ipsHide');
							}
						});
				}

				// Show the details panel if we're on mobile
				if( ips.utils.responsive.currentIs('phone') ){
					this._toggleDetailsPanelMobile(true);
				}

				// And then emit contentChange event to trigger javascript controllers (e.g. tags)
				$( document ).trigger( 'contentChange', [ $('[data-role="imageDetails"] > form') ] );

				// Check for current errors
				if( this._currentErrors[ imageId ] !== undefined ){
					this._updateDetailsWithErrors( imageId, this._currentErrors[ imageId ] );
				}
			}
		},

		/**
		 * Toggle details panel on mobile
		 *
		 * @returns {void}
		 */
		_toggleDetailsPanelMobile: function (show) {
			var detailsPanel = this.scope.find('[data-role="imageDetails"]');

			if( !show ){
				detailsPanel
					.animate({
						opacity: "0",
						top: '400px'
					}, 400, function () {
						detailsPanel.hide()
					});
			} else if( !detailsPanel.is(':visible') ) {
				detailsPanel
					.show()
					.css({
						opacity: "0",
						top: '400px'
					})
					.animate({
						opacity: "1",
						top: '0px'
					}, 400 );
			}
		},

		/**
		 * Set up description events
		 *
		 * @returns {void}
		 */
		setUpImageDescriptionRich: function(e) {
			const currentDescription = $(e.currentTarget).closest('[data-role="imageDescriptionTextarea"]')
				.find('> textarea')
				.val()
				.trim();
			if( currentDescription.length ){
				const editorObj = ips.ui.editorv5.getObj($(e.currentTarget).closest('[data-role="imageDescriptionTextarea"]')
					.prev('[data-role="imageDescriptionEditor"]')
					.find('[data-ipseditorv5]'));
				const editorInstance = editorObj.getInstance();
				editorInstance.commands.setContent( currentDescription );
				$( e.currentTarget ).closest('[data-role="imageDescriptionTextarea"]')
					.find( '> textarea' )
					.val('');
			}

			$( e.currentTarget ).closest('[data-role="imageDescriptionTextarea"]')
				.addClass('ipsHide')
			.prev('[data-role="imageDescriptionEditor"]')
				.removeClass('ipsHide');

			e.preventDefault();
		},

		/**
		 * Set up description events
		 *
		 * @returns {void}
		 */
		setUpImageDescriptionPlain: function (e) {
			const editorObj = ips.ui.editorv5.getObj($(e.currentTarget).closest('[data-role="imageDescriptionEditor"]')
				.find('[data-ipseditorv5]'));
			const currentDescription = $(editorObj.getInstance().getHTML()).text()
				.trim();
			if( currentDescription.length ){
				$( e.currentTarget ).closest('[data-role="imageDescriptionEditor"]')
					.next('[data-role="imageDescriptionTextarea"]')
					.find( 'textarea' )
					.val( currentDescription );
			}

			$( e.currentTarget ).closest('[data-role="imageDescriptionEditor"]')
				.addClass('ipsHide')
			.next('[data-role="imageDescriptionTextarea"]')
				.removeClass('ipsHide');

			e.preventDefault();			
		},

		/**
		 * IE11 doesn't support submit buttons outside of a <form> like HTML5 does.
		 * So, if we click the button, are on IE11, and not inside a form, manually trigger a submit.
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		maybeSubmitForm: function (e) {
			var isIE11 = !(window.ActiveXObject) && "ActiveXObject" in window;

			if( !$( e.currentTarget ).closest('form').length && $( e.currentTarget ).is('[form]') && isIE11 ){
				var form = $('#' + $( e.currentTarget ).attr('form'));

				if( form.length ){
					form.trigger('submit');
				}
			}
		},

		/**
		 * Event handler for submitting forms inside the wizard
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		submitForm: function (e) {
			e.preventDefault();

			var form = $( e.currentTarget );
			var url = form.attr('action');

			// If we are submitting images, get the info we need
			if( form.attr('id') == 'elGallerySubmit' ){
				// Sync editor to its textarea
				this.scope.find('[data-ipseditorv5]').each( function(){
					try {
						var editorObj = ips.ui.editorv5.getObj( $( this ) );
						var editorInstance = editorObj.getInstance();

						$( this ).find('textarea[data-role="contentEditor"]').val( editorInstance.getHTML() );
					} catch (err) {
						Debug.error("Couldn't update textarea from editor");
					}
				});

				// Get credit, copyright and auto-follow fields and add to our form
				form.find('textarea[name="credit_all"]').val( $('#elTextarea_image_credit_info').val() );
				form.find('textarea[name="copyright_all"]').val( $('#elInput_image_copyright').val() );

				if( $('#elInput_image_tags_wrapper').length ){
					try {
						var tags = ips.ui.autocomplete.getObj( this.scope.find('#elInput_image_tags') ).getTokens();
						form.find('textarea[name="tags_all"]').val( tags.join("\n") );
						form.find('textarea[name="prefix_all"]').val( $('[name="image_tags_prefix"]').val() );
					} catch (err) {
						Debug.error("Couldn't update tags");
					}
				}

				if( ips.getSetting('memberID') )
				{
					form.find('input[name="images_autofollow_all"]').val( $('#check_image_auto_follow_wrapper').hasClass('ipsToggle_on') ? 1 : 0 );
				}

				if( $('#check_image_nsfw_wrapper').length )
				{
					form.find('input[name="nsfw_all"]').val($('#check_image_nsfw_wrapper').hasClass('ipsToggle_on') ? 1 : 0);
				}

				// Get the order of the images and store this in the submission
				var imageOrder = [];

				form.find('[data-role="file"]').each( function(){
					if( $(this).attr('data-fileid').indexOf('o_') != -1 )
					{
						imageOrder.push( $('input[name="images_existing\\[' + $(this).attr('data-fileid') + '\\]"').val() );
					}
					else
					{
						imageOrder.push( $(this).attr('data-fileid') );
					}
				});

				form.find('textarea[name="images_order"]').val( JSON.stringify( imageOrder ) );

				// And get the individual image details and store in the submission
				form.find('textarea[name="images_info"]').val( JSON.stringify( $('#form_imageDetails').serializeArray() ) );

				// Hide/disable some stuff
				this.scope.find('[data-role="imageDetails"]').addClass('ipsHide');
				this.scope.find('#elGallerySubmit_toolBar').hide();
				this.scope.find('[data-role="submitForm"]').prop('disabled', true);
				this.scope.find('.cGalleryDialog').removeClass('cGalleryDialog_uploadStep');
			}

			// And don't bubble up
			e.stopPropagation();

			this._changeContents( url, form.serialize() );
		},

		/**
		 * Updates the wizard contents from a URL response
		 *
		 * @param 	{string} 	url 	URL to call
		 * @param 	{object} 	data	Data to pass to ajax handler
		 * @returns {void}
		 */
		_changeContents: function (url, data) {
			if( data === undefined ){
				data = {};
			}

			var self = this;
			var loadingElement = this.scope.closest('.ipsDialog_content');

			this.scope.find('.cGalleryDialog_container, .cGalleryDialog_imageForm').hide();

			this.cleanContents();
			loadingElement.addClass('ipsLoading');

			ips.getAjax()( url + '&noWrapper=1', {
				data: data,
				type: 'post',
				bypassRedirect: true
			})
				.done( function (response, status, jqXHR) {
					// Just find the internal content
					self._updateContents( response );
				})
				.always( function() {
					loadingElement.removeClass('ipsLoading');
				});
		},

		/**
		 * Event listener for passing through AJAX responses
		 *
		 * @param	{object}	response	AJAX response object
		 * @returns {void}
		 */
		 _updateWrapper: function( e, data ) {
		 	this._updateContents( data.response );
		 },

		/**
		 * Updates the wizard contents
		 *
		 * @param 	{object}	response	Response object
		 * @returns {void}
		 */		
		_updateContents: function ( response ) {
			
			var wrapper = $('[data-role="submitWrapper"]');
			var container = wrapper.find('[data-role="container"]');

			if( response.container ) {
				container.html( response.container );
				container.show();
			} else {
				container.hide();
			}

			if( response.containerInfo ) {
				wrapper.find('[data-role="containerInfo"]').html( response.containerInfo );
			}

			if( response.images ) {
				this._updateTitle( ips.getString('addImages') );
				// Animate the dialog expanding for the upload step
				if( this.scope.closest('.cGalleryDialog_outer').length && !this.scope.find('[data-role="imagesForm"]').is(':visible') && !this._expanded ){
					this._enlargeUploadStep( function () {
						wrapper.find('[data-role="imageForm"]').html( response.images );
					});
				} else {
					wrapper.find('[data-role="images"]').show();
					wrapper.find('[data-role="imageForm"]').html( response.images );
				}
			}

			if( response.imageTags && wrapper.find('.cGalleryTagsField').hasClass('ipsHide') ){
				wrapper.find('.cGalleryTagsField').removeClass('ipsHide');
				wrapper.find('.cGalleryTagsField .ipsFieldRow__content').append( response.imageTags );
			}

			if( response.tagsField && wrapper.find('.cGalleryTagsButton').hasClass('ipsHide') )	{
				wrapper.find('.cGalleryTagsButton').removeClass('ipsHide');
				wrapper.find('[data-role="globalTagsField"]').append( response.tagsField );
			}

			$( document ).trigger( 'contentChange', [ wrapper ] );

			if( response.imageErrors !== undefined && Object.keys(response.imageErrors).length > 0 ){
				this._handleUploaderErrors( response.imageErrors );
			}
		},

		/**
		 * Handles a submission error
		 *
		 * @param 	{object}	errors		Object containing errors
		 * @returns {void}
		 */
		_handleUploaderErrors: function (errors) {
			var self = this;
			this.scope.find('[data-role="imageDetails"]').removeClass('ipsHide');
			this.scope.find('#elGallerySubmit_toolBar').show();
			this.scope.find('[data-role="submitForm"]').prop('disabled', false);
			this.scope.find('.cGalleryDialog').addClass('cGalleryDialog_uploadStep');

			this._currentErrors = errors;

			var errorCount = Object.keys( errors ).length;
			var errorIDs = Object.keys( errors );
			var errorFileIDs = errorIDs.map( function (id) {
				if( self.scope.find('input[type="hidden"][value="' + id + '"]').attr('name') )
				{
					return '#' + self.scope.find('input[type="hidden"][value="' + id + '"]').attr('name').replace(/images_existing\[/g, '').replace(/\]/g, '');
				}
			});
			var errorFileThumbs = this.scope.find( errorFileIDs.join(',') );

			// Mark all thumbs as 'done'
			this.scope.find('.cGallerySubmit_fileList [data-role="file"]').addClass('cGallerySubmit_imageSaved');

			// Add error class to all the errored ones
			errorFileThumbs.addClass('cGallerySubmit_imageError').removeClass('cGallerySubmit_imageSaved');

			for (const id of errorIDs) {
				if( self.scope.find('#image_details_' + id).length ){
					self._updateDetailsWithErrors( id, errors[ id ] );
				}
			};

			// Show an error
			if( errors[0] !== undefined && errors[0]['images'] !== undefined )
			{
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message:  errors[0]['images'],
				});
			}
			else
			{
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message:  ips.pluralize( ips.getString('imageUploadErrors'), errorCount ),
					subText: ips.pluralize( ips.getString('imageUploadErrorsDesc'), errorCount )
				});
			}
		},

		/**
		 * Updates the details panel for a file with the provided errors
		 *
		 * @param 	{object}	errors		Object containing errors
		 * @returns {void}
		 */
		_updateDetailsWithErrors: function (fileID, errors) {
			var panel = this.scope.find('#image_details_' + fileID);

			for (const [field, error] of Object.entries(errors)) {
				panel.find('[data-errorField="' + field + '"]').text( error ).show();

				if( field == 'image_tags' || field == 'image_credit' || field == 'image_copyright' ){
					panel.find('[data-errorField="' + field + '"]').closest('.ipsFieldRow').find('[data-role="addCopyrightCredit"]').trigger('click');
				}
			};
		},

		/**
		 * Expands the dialog for the upload step
		 *
		 * @param 	{object}	response	Response object
		 * @returns {void}
		 */	
		_enlargeUploadStep: function (callback) {
			var wrapper = $('[data-role="submitWrapper"]');
			var dialogElem = this.scope.closest('.cGalleryDialog_outer > div');

			if( dialogElem.length )
			{
				var dialogElemPos = ips.utils.position.getElemPosition( dialogElem );
				var viewportSize = { width: $( window ).width(), height: $( window ).height() };
				var left = ( viewportSize.width - dialogElem.width() ) / 2;

				// Set the size of the dialog div, and then animate expanding to fullscreen size
				this.scope.closest('.cGalleryDialog_outer > div').css({
					width: 'auto',
					maxWidth: '100%',
					position: 'fixed',
					margin: 0,
					top: dialogElemPos.absPos.top + 'px',
					left: left + 'px',
					right: viewportSize.width - ( left + dialogElem.width() ) + 'px'
				}).animate({
					left: '10px',
					right: '10px',
					bottom: '10px',
					top: '10px',
				}, function () {

					// Now fade in the wrapper
					wrapper.find('[data-role="images"]').css({
						opacity: "0.0001",
					}).show();

					if( callback ){
						callback();
					}

					wrapper.find('[data-role="images"]').animate({
						opacity: "1"
					});
				
					dialogElem.find('.ipsDialog_close').prop('hidden', true);

					$( document ).trigger( 'contentChange', [ wrapper ] );
				});
			}
			else
			{
				if( callback ){
					callback();
				}

				$( document ).trigger( 'contentChange', [ wrapper ] );
			}

			// Positioning needed for upload step
			this.scope.find('.cGalleryDialog').css({ minHeight: "0", position: 'absolute', top: "0", left: "0", right: "0", bottom: "0" });
			this.scope.closest('.ipsDialog_content').css({ position: 'absolute', top: "0", left: "0", right: "0", bottom: "0" });

			if( !wrapper.find('.cGallerySubmit_bottomBar').hasClass('ipsHide') ){
				wrapper.find('.cGallerySubmit_bottomBar').removeClass('ipsHide').fadeIn();
			}

			this._expanded = true;
		}
	});
}(jQuery));