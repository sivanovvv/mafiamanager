/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.settings.settings.js
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.admin.settings.settings', {
		alertOpen: false,

		initialize: function () {
			if( $('input[name=rebuildWatermarkScreenshots]').val() == 0 )
			{
				this.on( 'uploadComplete', '[data-ipsUploader]', this.promptRebuildPreference );
				this.on( 'fileDeleted', this.promptRebuildPreference );
				this.on( 'change', '#gallery_watermark_images input, #form_gallery_large_dims input, #form_gallery_small_dims input, #form_gallery_use_square_thumbnails input', this.promptRebuildPreference );
			}
		},

		promptRebuildPreference: function (e) {

			if( this.alertOpen )
			{
				return;
			}

			this.alertOpen = true;

			/* Show Rebuild Prompt */
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('rebuildGalleryThumbnails'),
				subText: ips.getString('rebuildGalleryThumbnailsBlurb'),
				icon: 'question',
				buttons: {
					ok: ips.getString('rebuildGalleryThumbnailsYes'),
					cancel: ips.getString('rebuildGalleryThumbnailsNo')
				},
				callbacks: {
					ok: function(){
						$('input[name=rebuildWatermarkScreenshots]').val( 1 );
						this.alertOpen = false;
					},
					cancel: function(){
						$('input[name=rebuildWatermarkScreenshots]').val( 0 );
						this.alertOpen = false;
					}
				}
			});
		}

	});
}(jQuery));