/**
 * IPS Social Suite 4
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.notifications.js - Browser notifications prompt
 *
 * Author: Stuart Silvester
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.notifications', {

		initialize: function () {
			this.on( document, 'menuOpened', this.menuOpened );
			this.on( document, 'permissionDenied.notifications', this.hideNotice );
			this.on( document, 'subscribePending.notifications', this.subscribePending );
			this.on( document, 'subscribeSuccess.notifications', this.subscribeSuccess );
			this.on( document, 'subscribeFail.notifications', this.subscribeFail );
			this.on( 'click', '[data-action=browserNotificationPrompt]', this.requestPermission );
			this.on( 'click', '[data-role=dismissNotification]', this.dismissNotification );
			this.on( 'click', '[data-action="rejectPush"]', this.rejectPush );

			if( ips.getSetting('memberID') && ips.utils.notification.supported && ips.utils.serviceWorker.supported ){
				this.setup();
			}
		},

		setup: function() {
			this._timeout = null;
			this._buttonText = '';
			this._missingSubscription = false;

			if( ips.utils.notification.needsPermission() && ips.utils.cookie.get('browserNotificationDismiss') === undefined ) {
				this.scope.html( ips.templates.render( 'core.browserNotification.prompt' ) ).hide();
			} else if( ips.utils.notification.hasPermission() && ips.utils.cookie.get('notificationPushRejected') === undefined ) {
				// If we have permission but no subscription, prompt the user - likely an upgrade where they've granted permission
				// but we haven't received a push subscription token yet
				ips.utils.notification.getSubscription()
					.then( subscription => {
						if( subscription ){
							return; // They already have a subscription, so no need to do anything here
						}
						
						this._missingSubscription = true;
						this.scope.html( ips.templates.render( 'core.browserNotification.missingSubscription' ) ).hide();
					})
					.catch( err => {
						Debug.log("getSubscription failed - browser may not support pushManager");
						Debug.log(err);
						return;
					});
			}
		},

		destroy: function () {
			clearTimeout( this._timeout );
		},

		/**
		 * Called when the notifications menu is opened
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data
		 * @returns {void}
		 */
		menuOpened: function (e, data = e.detail) {
			let date;
			const showPrompt = () => {
				this._timeout = setTimeout( () => {
					this.scope.slideDown('fast');
					ips.utils.cookie.unset('notificationMenuShown');
				}, 750 );
			};

			if (data.elemID === 'elFullNotifications') {
				if (this._missingSubscription) {
					showPrompt(); // In cases where they've given permission but not yet subscribed, just show immediately
				} else {
					// To prevent annoyance for new users, we'll only show the callout after 2+ days
					if (ips.utils.cookie.get('notificationMenuShown') === undefined) {
						date = parseInt(ips.utils.cookie.get('notificationMenuShown'));
						if (date && Date.now() >= date) {
							showPrompt();
						}
					} else {
						date = new Date();
						date.setDate( date.getDate() + 2 );
						ips.utils.cookie.set('notificationMenuShown', date.getTime(), true );
					}
				}
			}
		},

		/**
		 * Event handler for a pending subscription - update button to show something is happening
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data
		 * @returns {void}
		 */
		subscribePending: function (e, data) {
			// Save current button text so we can switch it back later
			const button = this.scope.find('[data-action="browserNotificationPrompt"]');
			this._buttonText = button.text();
			button.prop('disabled', true).text( ips.getString('notificationsEnabling') );
		},

		/**
		 * Event handler for a successful subscription - let the user know
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data
		 * @returns {void}
		 */
		subscribeSuccess: function (e, data) {
			const button = this.scope.find('[data-action="browserNotificationPrompt"]');
			button.prop('disabled', true).text( ips.getString('notificationsSubscribed') );
		},

		/**
		 * Event handler for a failed subscription - let the user know
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data
		 * @returns {void}
		 */
		subscribeFail: function (e, data) {
			this.scope
				.find('[data-action="browserNotificationPrompt"]')
				.prop( 'disabled', false )
				.text( this._buttonText );

			this.scope.find('[data-role="promptMessage"]').text( ips.getString('notificationsSubscribeFailed') ).slideDown();	
		},

		/**
		 * Called when the user clicks the button to init the notification popup
		 *
		 * @returns {void}
		 */
		requestPermission: function() {
			this.scope.find( '[data-role="promptMessage"]').text( ips.getString('notificationsAllowPrompt') ).slideDown();
			$(document).trigger('requestPermission.notifications');
		},

		/**
		 * User does not 
		 *
		 * @returns {void}
		 */
		rejectPush: function (e) {
			e.preventDefault();
			ips.utils.cookie.set('notificationPushRejected', true, true );
			this.hideNotice();
		},

		/**
		 * Event handler called when the browser (via ips.utils.notifications) changes notification status
		 * Whatever the user decides, hide the message now so we arent annoying
		 *
		 * @returns {void}
		 */
		hideNotice: function() {
			this.scope.slideUp('fast');
		},

		/**
		 * Allows the user to dismiss the callout in the notifications menu
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		dismissNotification: function(e) {
			if( e ) {
				e.preventDefault();
			}

			var date = new Date();
			date.setDate( date.getDate() + 100 );
			ips.utils.cookie.set( 'browserNotificationDismiss', true, date.toUTCString() );

			this.scope.slideUp( {
				duration: 400,
				complete: function() {
					$(this).remove();
				}
			});
		}

	});
}(jQuery));