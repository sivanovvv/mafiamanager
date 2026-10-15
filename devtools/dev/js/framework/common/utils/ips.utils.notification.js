/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.notification.js - A module for working with HTML5 notifications
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";
	ips.createModule('ips.utils.notification', function () {
		/**
		 * Whether notifications are supported by the current user agent, not whether they are enabled
		 * @type {boolean}
		 */
		const supported = !!(
			window.Notification?.requestPermission instanceof Function &&
			ips.getSetting('pushPublicKey') !== null);

		/**
		 * Requests permission for notifications from the user
		 *
		 * @returns 	{void}
		 */
		 async function requestPermission() {
			if (supported)
				$(document).trigger((await Notification.requestPermission()) === 'granted' ? 'permissionGranted.notifications' : 'permissionDenied.notifications')
		}

		/**
		 * Subscribes a user to push notifications
		 * Note: permission must be checked before calling or it will fail
		 *
		 * @returns 	{Promise}
		 */
		async function subscribeToPush() {
			$(document).trigger('subscribePending.notifications');

			const registration = await ips.utils.serviceWorker.registerServiceWorker('front', true);
			const options = {
				userVisibleOnly: true, // Required: https://developers.google.com/web/fundamentals/push-notifications/subscribing-a-user#uservisibleonly_options
				applicationServerKey: ips.utils.urlBase64ToUint8Array( ips.getSetting('pushPublicKey') )
			};

			const subscription = JSON.stringify(await registration.pushManager.subscribe(options));
			try {
				 await ips.fetch(ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=notifications&do=subscribeToPush', {
						method: 'POST',
						data: {
							subscription,
							encoding: PushManager.supportedContentEncodings?.[0] || 'aesgcm'
						}
					})
				$(document).trigger('subscribeSuccess.notifications')
			} catch (e) {
				$(document).trigger('subscribeFail.notifications')
			}
		}

		/**
		 * Determines whether the user has granted permission for notifications
		 *
		 * @returns 	{boolean}	Whether notifications have permission
		 */
		function hasPermission() {
			return supported && !ips.utils.cookie.get('noBrowserNotifications') && !['denied', 'default'].includes(Notification.permission);
		}

		/**
		 * Get the user's subscription, if any
		 *
		 * @returns 	{Promise}
		 */
		async function getSubscription() {
			try {
				const registration = await ips.utils.serviceWorker.getRegistration()
				const subscription = await registration.pushManager.getSubscription()
				return subscription || false;
			} catch (e) {
				Debug.log(e)
			}
		}

		/**
		 * Set any notification badge count to zero
		 * This is used to clear the badge count when the user has read all notifications.
		 */
		function clearBadgeCount() {
			if( ! this.hasPermission() ) {
				return;
			}
			if ('clearAppBadge' in navigator) {
				navigator.clearAppBadge().catch((e) => {
					Debug.log(e);
				});
			} else if ('setAppBadge' in navigator) {
				navigator.setAppBadge(0).catch((e) => {
					Debug.log(e);
				});
			}
		}

		/**
		 * Do we need permission to show notifications? If the user has agreed or explicitly declined, this
		 * will be false. If they haven't decided yet, it'll return true.
		 *
		 * @returns 	{boolean} 	Whether the browser needs to ask for permission
		 */
		function needsPermission() {
			return supported && !ips.utils.cookie.get('noBrowserNotifications') && Notification.permission === 'default';
		}

		/**
		 * Returns the granted permission level
		 *
		 * @returns 	{NotificationPermission|null}
		 */
		function permissionLevel() {
			return supported ? Notification.permission : null;
		}

		/**
		 * Creates a new notification and returns a notification object
		 *
		 * @param 		{object} 	options 	Configuration object
		 * @returns 	{IpsNotification|void}
		 */
		function create(options) {
			try {
				return new IpsNotification( options );
			} catch(e) {}
		}


		class IpsNotification {

			/**
			 * @type {null|Notification}
			 * @private
			 */
			_notification = null;
			_options = {
				title: '',
				body: '',
				icon: '',
				timeout: false,
				tag: '',
				dir: $('html').attr('dir') || 'ltr',
				lang: $('html').attr('lang') || '',
				onShow() {},
				onHide() {},
				onClick() {},
				onError() {}
			}

			/**
			 * Our notification constructor
			 *
			 * @param 		{object} 	options 	Configuration object
			 */
			constructor(options) {
				this._notification = null;
				Object.assign(this._options, options)

				// Unescape body & title because we'll be getting escaped chars from the backend
				this._options.body = ips.utils.unescapeHTML(this._options.body.replace(/&#039;/g, "'").replace(/<[^>]*?(?:>|$)/g, ''));
				this._options.title = ips.utils.unescapeHTML(this._options.title.replace(/&#039;/g, "'"));

			}

			/**
			 * Show the notification
			 */
			show() {
				this._notification = new Notification(this._options.title, this._options);
				this._notification.addEventListener('show', this._options.onShow, false);
				this._notification.addEventListener('hide', this._options.onHide, false);
				this._notification.addEventListener('click', this._options.onClick, false);
				this._notification.addEventListener('error', this._options.onError, false);

				if (!Number.isNaN(this._options.timeout)) {
					setTimeout(() => this.hide(), Number(this._options.timeout) * 1000);
				}
			}

			/**
			 * Hide the notification
			 */
			hide() {
				if (this._notification) {
					this._notification.close();
					this._notification.removeEventListener('show', this._options.onShow, false);
					this._notification.removeEventListener('hide', this._options.onHide, false);
					this._notification.removeEventListener('click', this._options.onClick, false);
					this._notification.removeEventListener('error', this._options.onError, false);
				}
			}
		}

		$( document ).on('requestPermission.notifications', requestPermission);
		$( document ).on('permissionGranted.notifications', subscribeToPush);
		
		return {
			supported,
			subscribeToPush,
			hasPermission,
			getSubscription,
			needsPermission,
			permissionLevel,
			requestPermission,
			create,
			clearBadgeCount
		};
	});
}(jQuery));