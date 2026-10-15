/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.notificationMenu.js - Controller for the notification menu icon
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.notificationMenu', {

		initialize: function () {
			$('body').on( 'updateNotificationCount', this.updateNotificationCount );
			this.setup();
		},
		
		setup: function () {
			var notificationCount = parseInt( this.scope.find('[data-role="notificationCount"]').text() );
			if ( isNaN( notificationCount ) ) {
				notificationCount = 0;
			}
			
			var storedNotificationCount = parseInt( ips.utils.cookie.get('acpNotificationCount') );
			if ( isNaN( storedNotificationCount ) ) {
				storedNotificationCount = 0;
			}
									
			if ( notificationCount > storedNotificationCount ) {
				setTimeout(function(){
					$(this.scope).find('[data-role="notificationIcon"]').addClass('cAcpNotifications_animate');
				}.bind(this), 800 );
			}

			ips.utils.cookie.set( 'acpNotificationCount', notificationCount );
		},
		
		updateNotificationCount: function () {
			ips.getAjax()( '?app=core&module=overview&controller=notifications' ).done( function(response) {
				var count = parseInt( response.count );
				if ( count ) {
					$(this).find('[data-role="notificationCount"]').removeClass('ipsHide').text( count ).closest('.cAcpNotifications').addClass('cAcpNotifications_active');
				} else {
					$(this).find('[data-role="notificationCount"]').addClass('ipsHide').closest('.cAcpNotifications').removeClass('cAcpNotifications_active');
				}
			}.bind(this));
		}
	});
}(jQuery));
