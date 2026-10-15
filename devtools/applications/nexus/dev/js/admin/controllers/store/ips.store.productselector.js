/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.productselector.js
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.admin.store.productselector', {
		
		/**
		 * Init
		 */
		initialize: function () {
			this.url = $(this.scope).attr('data-url');
			this.on( 'click', '[data-role="group"]', this.expandCollapse );
			this.on( 'click', '[data-role="product"]', this.increaseQty );
		},
		
		/**
		 * Expand/Collapse Group
		 */
		expandCollapse: function (e) {
			var row = $( e.currentTarget );
			var list = row.next();
			
			if ( row.hasClass('ipsTree_open') ) {
				row.removeClass('ipsTree_open');
				list.hide();		
				
			} else {
				row.addClass('ipsTree_open');
				list.show();
				if ( !list.data('_childrenLoaded') ) {					
					list.html( ips.templates.render('core.trees.childWrapper', {
						content: ips.templates.render('core.trees.loadingRow')
					} ) );
										
					ips.getAjax()( this.url + '&id=' + row.attr('data-groupId') ).done(function(response){
						list.html(response);
						list.data('_childrenLoaded', 'true');
					})
				}
			}
		},
		
		/**
		 * Increase Qty
		 */
		increaseQty: function (e) {
			if( !$(e.target).is('input') ) {
				$( e.currentTarget ).find('input').val( parseInt( $( e.currentTarget ).find('input').val() ) + 1 );
			}
		}
				
	});
}(jQuery));