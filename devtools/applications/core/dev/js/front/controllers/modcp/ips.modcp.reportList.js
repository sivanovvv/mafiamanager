/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.modcp.reportList.js - Report list controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.modcp.reportList', {

		initialize: function () {
			this.on( 'menuItemSelected', '[data-action="changeStatus"]', this.changeReportStatus );
			this.on( 'menuItemSelected', '[data-role="filterButton"]', this.filterList );
		},

		/**
		 * When a reports status is changed, check whether the row needs changing
		 *
		 * @param 		{event} 	e 		Event object
		 * @param		{object}	data	Event data
		 * @returns 	{void}
		 */
		changeReportStatus: function (e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			var row = $( e.currentTarget ).closest('.ipsData__item');

			row.removeClass('ipsData__item--warning');

			switch( data.selectedItemID ){
				case '1':
					// row.addClass('ipsData__item--new');
				break;
				case '2':
					row.addClass('ipsData__item--warning');
				break;
			}
		},

		filterList: function( e, data = e.detail ){
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			var filter = data.selectedItemID || '';
			var container = $( this.scope ).find( '[data-baseUrl]' );
			ips.getAjax()( $( container ).data( 'baseUrl' ), {
				data: {
					filter: filter
				}
			})
				.done( function( response ){
					$( container ).replaceWith( response );
					$( document ).trigger( 'contentChange', [ container ] );
				});
		}
	});
}(jQuery));