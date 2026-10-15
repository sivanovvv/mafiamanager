/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.modcp.approveQueue.js - Controller for using approval queue
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.modcp.approveQueue', {
	
		initialize: function () {
			this.on( 'click', '[data-action="approvalQueueAction"]', this.doConfirm );
		},
		
		/**
		 * Confirm
		 *
		 * @param 		{event} 	e	Event object
		 * @param		{object}	data	Event data
		 * @returns 	{void}
		 */
		doConfirm: function(e,data) {
			e.preventDefault();
			
			var self = this;
			var action = $( e.currentTarget ).attr('data-type');
			
			if( action !== 'delete' )
			{
			    self.doAction( e, data );
			    return;
			}
			
			var alert = {
				type: 'confirm',
				icon: 'warn',
				message: ips.getString('generic_confirm'),
				subText: '',
				callbacks: {
					ok: function () {
						self.doAction( e, data );
					},
					no: function () {
						return;
					}
				}
			};
			
			ips.ui.alert.show( alert );
		},
		
		/**
		 * Respond when an action button is clicked
		 *
		 * @param 		{event} 	e 		Event object
		 * @param		{object}	data	Event data
		 * @returns 	{void}
		 */
		doAction: function(e,data) {
			e.preventDefault();
			var element = $( e.target ).closest( 'a');

			ips.getAjax()( $( element ).attr('href') + '&_fromApproval=1', { bypassRedirect: true } )
				.done(function(){
					ips.getAjax()( ips.getSetting( 'baseURL' ) + '?app=core&module=modcp&controller=modcp&tab=approval&action=getCount' )
						.done(function(response){
							$('#elModCPApprovalCount').html( response.total );
							$(element).parents('[data-role="approvalItem"]').slideUp("slow", function() {
								$(this).remove();
							});
						})
						.fail(function(failresponse){
							window.location = ips.getSetting( 'baseURL' ) + '?app=core&module=modcp&controller=modcp&tab=approval';
						});
				})
				.fail(function(){
					window.location = $( e.currentTarget ).attr('href');
				});
		}
	});
}(jQuery));
