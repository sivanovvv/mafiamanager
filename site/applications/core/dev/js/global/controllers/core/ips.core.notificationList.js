/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.notificationList.js - Controller for the notification list
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.notificationList', {

		initialize: function () {
			this.on( 'click', '[data-action="dismiss"]', this.dismiss );
		},
		
		dismiss: function (e) {
			e.preventDefault();
			var notification = $(e.target).closest('[data-role="notificationBlock"],.cAcpNotificationBanner, .ipsMessage--acp');
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('acp_notification_hide_confirm'),
				icon: 'question',
				callbacks: {
					ok: function(){
						ips.getAjax()( notification.find('[data-action="dismiss"]').attr('href') ).done( function(response) {
							notification.hide();
							ips.utils.anim.go( 'fadeOut', notification ).done(function(){
								if ( !notification.closest('.cNotificationList').children('[data-role="notificationBlock"]:not(.cNotification_hidden)').length ) {
									ips.utils.anim.go( 'fadeIn',  notification.closest('.cNotificationList').find('[data-role="empty"]').removeClass('ipsHide') );
								}
							});
							$('body').trigger('updateNotificationCount');
						});
					}
				}
			});
		}
	});
}(jQuery));
