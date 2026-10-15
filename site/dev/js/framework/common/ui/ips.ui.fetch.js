/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.fetch.js - Fetches and displays content via data-ipsfetch="/path/to/content/"
 *
 * Author: Ehren Harber
 */
;(function($){
	"use strict";

	ips.createModule('ips.ui.fetch', function(){

		/**
		 * Initializes the fetch widget for the given element.
		 * Sets up an IntersectionObserver to lazy-load content when visible
		 * and a MutationObserver to reload content if the loaded attribute is removed.
		 *
		 * @param {jQuery} elem - jQuery-wrapped DOM element to initialize
		 */
		function respond(elem){
			const el = elem[0];
			const url = el.getAttribute('data-ipsfetch');
			if (!url) return;

			/** @type {string} @private */
			el._ipsFetchUrl = url;

			/** @type {boolean} @private Indicates whether a fetch is currently in progress */
			el._ipsFetchLoading = false;

			/** @type {boolean} @private Tracks whether the element is currently visible in the viewport */
			el._ipsFetchIntersecting = false;

			// IntersectionObserver
			const io = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					el._ipsFetchIntersecting = entry.isIntersecting;

					if (
						entry.isIntersecting &&
						!el.hasAttribute('data-ipsfetch-loaded') &&
						!el._ipsFetchLoading
					) {
						load(el);
					}
				}
			}, {
				rootMargin: "100px 0px",
				threshold: 0
			});

			io.observe(el);

			// MutationObserver: this allows us to reload content by removing data-ipsfetch-loaded
			const mo = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (
						mutation.type === "attributes" &&
						mutation.attributeName === "data-ipsfetch-loaded"
					) {
						// Attribute was removed AND element is visible
						if (
							!el.hasAttribute('data-ipsfetch-loaded') &&
							el._ipsFetchIntersecting &&
							!el._ipsFetchLoading
						) {
							load(el);
						}
					}
				}
			});

			mo.observe(el, {
				attributes: true,
				attributeFilter: [ "data-ipsfetch-loaded" ]
			});
		}

		/**
		 * Fetches content for the element using ips.fetch and updates the DOM.
		 * Adds a temporary spinner while the content loads and triggers contentChange events.
		 *
		 * @param {HTMLElement} el - The DOM element to load content into
		 * @returns {Promise<void>}
		 */
		async function load(el){
			if (el._ipsFetchLoading) return;
			el._ipsFetchLoading = true;

			el.innerHTML = "";

			const spinner = document.createElement("i-fetch-spinner");
			el.insertAdjacentElement("afterend", spinner);

			try {
				const returned = await ips.fetch(el._ipsFetchUrl, {
					dataType: 'json'
				});

				el.innerHTML = returned.data;
				el.setAttribute('data-ipsfetch-loaded', '');

				$(document).trigger('contentChange', [ $(el) ]);

				/** Dispatch a custom event to notify other code that fetch completed */
				el.dispatchEvent(new CustomEvent("ipsFetch", {
					bubbles: true
				}));

			} catch (e) {
				console.error("ipsfetch failed:", e);
			} finally {
				el._ipsFetchLoading = false;
				spinner.remove();
			}
		}

		/**
		 * Refreshes the content of a fetch element by removing the loaded attribute.
		 * The element will reload its content the next time it becomes visible.
		 *
		 * @param {HTMLElement|jQuery} element - The element to refresh
		 */
		function refresh(element){
			const el = element instanceof jQuery ? element[0] : element;
			if (!el) return;
			el.removeAttribute('data-ipsfetch-loaded');
		}

		// Register the fetch widget with IPS UI
		ips.ui.registerWidget('fetch', ips.ui.fetch);

		return {
			respond,
			refresh
		};
	});
}(jQuery));