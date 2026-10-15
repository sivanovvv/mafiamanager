/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.notificationSettings.js - Notification settings controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.system.notificationSettings', {

		initialize: function () {
			this.on( 'click', '[data-action="showNotificationSettings"]', this.showNotificationSettings );
			this.on( 'click', '[data-action="closeNotificationSettings"]', this.closeNotificationSettings );
			this.on( 'change', '[data-role="notificationSettingsWindow"]', this.saveNotificationSettings );
		},

		/**
		 * Event handler for when a notification type is clicked
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		showNotificationSettings: function (e) {
			e.preventDefault();
			
			var target = $(e.currentTarget);
			var expandedContainer = target.parent().find('[data-role="notificationSettingsWindow"]');
			
			this.scope.find('.cNotificationTypes__row--selected').removeClass('cNotificationTypes__row--selected');
			this.scope.find('[data-action="showNotificationSettings"]').show();
			this.scope.find('[data-role="notificationSettingsWindow"]').hide();
			
			target.parent().addClass('cNotificationTypes__row--selected');
			target.find('.cNotificationSettings_expand').addClass('ipsLoading ipsLoading--tiny').find('i').addClass('ipsHide');
						
			ips.getAjax()( target.attr('href') ).done(function(response){
				expandedContainer.html(response).show();
				target.hide();
				target.find('.cNotificationSettings_expand').removeClass('ipsLoading').find('i').removeClass('ipsHide');
			}).fail(function(){
				window.location = target.attr('href');
			})
		},
		
		/**
		 * Event handler for when a notification type is clicked
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		closeNotificationSettings: function (e) {
			e.preventDefault();
			
			this.scope.find('.cNotificationTypes__row--selected').removeClass('cNotificationTypes__row--selected');
			this.scope.find('[data-action="showNotificationSettings"]').show();
			this.scope.find('[data-role="notificationSettingsWindow"]').hide();
		},
		
		/**
		 * Event handler for when a notification form is saved
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		saveNotificationSettings: function (e) {
			e.preventDefault();
			
			var target = $(e.target);
			var form = target.closest('form');
			var container = form.closest('[data-role="notificationSettingsWindow"]');
			var containerParent = container.closest('.cNotificationTypes__row');
			var closeIcon = container.find('[data-action="closeNotificationSettings"]');
			
			closeIcon.addClass('ipsLoading ipsLoading--tiny').text('');
						
			ips.getAjax()( form.attr('action'), {
				data: form.serialize(),
				type: 'post'
			} ).done(function(response){
				closeIcon.removeClass('ipsLoading').html('&times;');
				containerParent.find('[data-action="showNotificationSettings"]').html(response);
				ips.ui.flashMsg.show( ips.getString('saved') );
			});
		}
	});
}(jQuery));