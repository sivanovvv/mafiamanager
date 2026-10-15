/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.dashboard.validation.js - AdminCP users awaiting validation widget
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.dashboard.validation', {

		initialize: function () {
			this.on( 'click', '[data-action="approve"], [data-action="ban"]', this.validateUser );
		},

		/**
		 * Event handler for the approve/ban buttons
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		validateUser: function (e) {
			e.preventDefault();
			var self = this;
			var button = $( e.currentTarget );
			var url = button.attr('href');
			var type = button.attr('data-action');
			var row = button.closest('[data-role="validatingRow"]');
			var name = row.find('[data-role="userName"]').text();
			var toggles = button.closest('[data-role="validateToggles"]');
						
			ips.ui.alert.show({
				type: 'confirm',
				callbacks: {
					'ok': function() {
						toggles.find('a').addClass('ipsButton--disabled');
						
						ips.getAjax()( url )
							.done( function ( response ) {
								
								// Show flash msg
								ips.ui.flashMsg.show( ips.getString( type == 'approve' ? 'userApproved' : 'userBanned', {
									name: name
								}));
								
								// Update HTML
								if ( response ) {
									var newElement = $(response);
									$(self.scope).replaceWith( newElement );
									$( document ).trigger( 'contentChange', [ newElement ] );
								} else {
									ips.utils.anim.go( 'fadeOut', $(self.scope).closest('.cNotification') );
									$('body').trigger('updateNotificationCount');
								}
							});
					}
				}
			});
		}
	});
}(jQuery));