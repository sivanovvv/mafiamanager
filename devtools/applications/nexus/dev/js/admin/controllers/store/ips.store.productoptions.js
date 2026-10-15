/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.productoptions.js
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.admin.store.productoptions', {
		
		/**
		 * Init
		 */
		initialize: function () {
			var self = this;
			this.on( 'change', '[data-role="field"]', this.refresh );
			$('input[name="p_renews_checkbox"]').on('change', function(){
				self.refresh();
			});
			
			if ( $('input[name="p_images_primary_image"]').length ) {
				$('input[name="p_images_primary_image"]:first').prop('checked', true);
			}
			
			this.refresh();
		},
		
		/**
		 * Refresh
		 */
		refresh: function () {
			var ids = [];
			$(this.scope).find('[data-role="field"]:checked').each(function(){
				ids.push( $(this).attr('data-id') );
			});
			
			if ( $('input[name="p_renews_checkbox"]').is(':checked') ) {
				var renews = 1;
			} else {
				var renews = 0;
			}
						
			var scope = $(this.scope);
			ips.getAjax()( scope.attr('data-url') + '&fields=' + ids.join(',') + '&renews=' + renews )
				.done(function(response){
					scope.find('[data-role="table"]').html( response );
					$( document ).trigger( 'contentChange', [ scope ] );
				});
		},
				
	});
}(jQuery));