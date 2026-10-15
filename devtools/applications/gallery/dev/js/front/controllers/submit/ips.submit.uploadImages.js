/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.uploadImages.js - Image upload step
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.submit.uploadImages', {

		initialize: function () {
			// Handle clicks on 'upload' field
			var self = this;
			this.scope.find('.ipsAttachment_dropZone').on( 'click', function(e){
				// This is here to prevent the file dialog opening twice due to the click triggered below (which is inside ipsAttachment_dropZone)
				e.stopPropagation();

				if( !$( e.target ).is('input') )
				{
					self.scope.find('input[type="file"]').trigger('click');
				}
			} );

			this.on( 'fileAdded', '[data-ipsUploader]', this.filesAdded );
			this.on( 'uploadComplete', '[data-ipsUploader]', this.uploadComplete );
			this.on( 'fileDeleted', '[data-ipsUploader]', this.fileRemoved );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			// Disable the submit button if we have no files
			if( !this.scope.find('[data-role="fileList"] [data-role="file"]').length ) {
				this.scope.find('[data-role="submitForm"]').prop( 'disabled', true );
			}

			// Make sure bottom submit bar is showing
			$('.cGallerySubmit_bottomBar').removeClass('ipsHide');

			//  We want to move the allowed types of files span
			$('[data-role="allowedTypes"]').html( this.scope.find('span.i-color_soft.i-font-size_-2').html() );
			this.scope.find('span.i-color_soft.i-font-size_-2').remove();

			//  And change the uploader message
			this.scope.find('.ipsAttachment_supportDrag').html( ips.getString('uploader_add_images') );
		},

		/**
		 * Responds to event from the uploader
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Data object from uploader
		 * @returns {void}
		 */
		fileRemoved: function (e, data) {
			if( data.fileElem.attr('data-fileid').indexOf('o_') != -1 )
			{
				var imageId = $('input[name="images_existing\\[' + data.fileElem.attr('data-fileid') + '\\]"').val();
			}
			else
			{
				var imageId = data.fileElem.attr('data-fileid');
			}

			// If we've already built the image form, remove it
			if( $('#image_details_' + imageId ).length )
			{
				$('#image_details_' + imageId ).remove();
			}
		},

		/**
		 * Uploader has told us all uploads are complete
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{objct} 	data 	Data object from uploader
		 * @returns {void}
		 */
		uploadComplete: function (e, data) {
			if( data.success > 0 ){
				this.trigger('gallery.activateSubmitButton');
			}

			if( data.error > 0 ){
				this.trigger('gallery.uploadErrors');
			}

			if( !this.sortableInitialized ){
				// And allow images to be reordered
				this.scope.find('[data-role="fileList"] > .cGallerySubmit_fileList').sortable({
					forcePlaceholderSize: true
				});

				this.sortableInitialized = true;
			}
		},

		/**
		 * Track whether we've initialized the sortable
		 */
		sortableInitialized: false,

		/**
		 * Responds to event from the uploader
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Data object from uploader
		 * @returns {void}
		 */
		filesAdded: function (e, data) {
			this.trigger('gallery.disableSubmitButton');

			$('[data-role="addFiles"]').removeClass( 'ipsHide' );
			$('[data-role="imageDetails"]').removeClass('ipsHide');

			// Only add the uploadStep class if we aren't on mobile
			if( !ips.utils.responsive.enabled() || !ips.utils.responsive.currentIs('phone') ){
				this.scope.closest('.cGalleryDialog').addClass('cGalleryDialog_uploadStep');
			}

			$( window ).trigger('resize');
		}
	});
}(jQuery));