/**
 * Module to load iframely's embed.js script when there are iframely embeds on the page
 * @see https://iframely.com/docs/omit-script#load-when-required
 */
;(function($, _) {
	"use strict";

	ips.createModule('ips.ui.iframelySizing', function() {
		let loaded = false;
		/**
		 *
		 * @param {Element|undefined} [root]		The root to check for iframely embeds
		 */
		function loadIframelyAdHoc(root) {
			if (loaded) {
				return;
			}

			// Iframely allows custom CDNs for high tier packages. For now, I'm just making this a JS setting (e.g. can be set in the theme) but if it comes up we may want to add another setting to the ACP integrations page
			const iframelyCDN = ips.getSetting('iframely_custom_cdn') || "iframe.ly";
			if (!(root || document).querySelector(`[data-iframely-url], iframe[src*='${iframelyCDN}']`)) {
				return;
			}

			let iframely = window.iframely = window.iframely || {};
			loaded = true;

			if (iframely.load) {
				iframely.load();
			} else {
				ips.loader.get(["//cdn.iframe.ly/embed.js"])
					.then(() => {
						Debug.log('Iframely embed.js loaded.');
					});
			}
		}

		return {
			loadIframelyAdHoc,
			init() {
				loadIframelyAdHoc(document.body);
				if (!loaded) {
					const contentChange = (elem) => {
						$(elem).each(function() {
							if (this instanceof Element) {
								loadIframelyAdHoc(this);
							}
						});

						if (loaded) {
							$(document).off('contentChange', contentChange);
						}
					};
					$(document).on('contentChange', contentChange);
				}
			}
		}
	})
})(jQuery);