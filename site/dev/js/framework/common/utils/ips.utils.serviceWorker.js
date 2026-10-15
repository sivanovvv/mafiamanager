/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.serviceWorker.js - A module for working with service workers
 *
 * Author: Rikki Tissier
 */

(function ($) {
	"use strict";

	ips.createModule("ips.utils.serviceWorker", function () {
		const SERVICE_WORKER_URL = ips.getSetting("baseURL") + "index.php?app=core&module=system&controller=serviceworker&v=" + ips.getSetting("jsAntiCache");
		const supported = "serviceWorker" in navigator;

		/**
		 * Registers the service worker. When the user log in state changes, the URL of the SW changes
		 * which forces the browser to accept it as an update to the running SW. This means we can inspect the URL
		 * inside the SW and using the loggedIn param determine if the user is logged in or not.
		 *
		 * @returns {Promise}
		 */
		const registerServiceWorker = (type) => {
			return navigator.serviceWorker
				.register(`${SERVICE_WORKER_URL}&type=${type}`)
				.then((registration) => {
					// Registration was successful
					Debug.log("ServiceWorker registration successful with scope: ", registration.scope);
					return registration;
				})
				.catch((err) => {
					// registration failed :(
					Debug.log("ServiceWorker registration failed: ", err);
				});
		};

		/**
		 * Gets the service worker registration
		 *
		 * @returns {Promise}
		 */
		const getRegistration = () => {
			return navigator.serviceWorker.ready;
		};

		return {
			registerServiceWorker,
			supported,
			getRegistration,
		};
	});
})(jQuery);
