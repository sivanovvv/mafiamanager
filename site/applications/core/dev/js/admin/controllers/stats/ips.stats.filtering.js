/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.stats.filtering.js - Statistics filtering controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.stats.filtering', {

		initialize: function () {
			this.on( 'click', '[data-role="toggleGroupFilter"]', this.toggleGroupFilter );

			// And hide by default
			if( $('#elGroupFilter').attr('data-hasGroupFilters') == 'true' )
			{
				$('#elGroupFilter').show();
			}
		},

		/**
		 * Toggle filtering by groups
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleGroupFilter: function (e) {
			e.preventDefault();
			
			if( $('#elGroupFilter').is(':visible') )
			{
				// If we are hiding the filter, we will assume they want to search everything and ensure all checkboxes are checked
				$('#elGroupFilter').find('input[type="checkbox"]').prop('checked', true);
				$('#elGroupFilter').slideUp();
			}
			else
			{
				$('#elGroupFilter').slideDown();
			}
		}
	});
}(jQuery));