/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.controls.js
 * This powers element visibility using aria-controls/aria-expanded (on a toggle button), and an id on the content/target element.
 * Animations are powered by CSS using either data-ips-hidden-animation="slide | slide-fade | fade", or --i-animation-name on the hidden element.
 *
 * Author: Ehren Harber
 */
;( function($, _){
	"use strict";

	const CACHED_REMOTE_RESPONSES = new Map();

	/**
	 * @typedef {CustomEvent<{controls:boolean, toggle:Element}>} ipsUiControlsToggleEvent
	 */
	ips.createModule('ips.ui.controls', function(){

		// Add event listener to document, which handles all opening/closing of hidden elements
		// This event listener is only added to the document once, regardless of how many data-ipscontrols elements exist
		document.addEventListener('click', handleEvent);

		/**
		 * Responder for controls widget
		 *
		 * @param	{jQuery} 	elem 		The element this widget is being created on
		 */
		function respond(elem) {
		}

		function handleEvent(e){

			// Return early if any editor toolbars are clicked
			if (e.target.closest('.ipsEditor__toolbar-item, .ipsEditor__toolbar-panel')) {
				return;
			}

			// Find out if the target is an aria-controls element
			let toggle = e.target.closest('[data-ipscontrols][aria-controls]');

			// Find out if any light dismiss elements are open. This fetches open dialogs, and non-dialog light-dismiss elements which are [hidden]. We fetch them like this since dialogs don't use [hidden]
			const lightDismiss = document.querySelectorAll("[data-ips-hidden-light-dismiss][open], [data-ips-hidden-light-dismiss]:not(dialog):not([hidden])");

			// If a toggle button wasn't clicked and if there are no active light-dismiss elements, stop here
			if (!toggle && !lightDismiss.length) return;

			if(toggle){

				// Get elements IDs (aria-controls supports multiple elements separated by a space)
				const name = toggle.getAttribute("aria-controls"),
					contentElementIds = name.split(" "),
					isExpanded = toggle.getAttribute("aria-expanded");

				// If [aria-expanded] doesn't exist, log to the console and return early
				if(!isExpanded){
					Debug.log("The clicked element has [aria-controls] but no [aria-expanded] value.")
					return
				}

				// If a 'multi id' value was clicked, toggle its aria-expanded attribute
				if(contentElementIds.length > 1){
					document.querySelectorAll(`[aria-controls="${name}"]`).forEach(t => t.setAttribute("aria-expanded", (isExpanded === "true") ? "false" : "true"));
				}

				// Loop through each of the content areas and adjust their visibility
				for(const id of contentElementIds){

					// Get content, but return early if it doesn't exist
					const content = document.querySelector(`#${id}`);
					if(!content){
						Debug.log(`An element with #${id} was not found and therefore can't be toggled.`);
						continue;
					}

					// Update visibility of element
					showOrHide(content, toggle, !(isExpanded === "true"));

					// If this content is part of a group, only show a single element at a time. Useful for tabs, off-canvas menus, etc
					const isInGroup = content.getAttribute("data-ips-hidden-group");
					if(isInGroup){
						const groupElements = document.querySelectorAll(`[data-ips-hidden-group="${isInGroup}"]:not([hidden])`);

						for (const groupElement of groupElements){
							// Hide other group elements, except for the one being triggered
							if (groupElement != content){
								showOrHide(groupElement, toggle, false);
							}
						}
					}

				}

			}

			// Hide light-dismiss element(s) when they aren't clicked
			for(const lightDismissEl of lightDismiss){
				// Close the element unless the click event occurred inside the light-dismiss element or if the clicked element was a light-dismiss dialog (ie. ::backdrop)
				if (lightDismissEl.contains(e.target) && e.target.tagName.toLowerCase() !== "dialog") continue;
				showOrHide(lightDismissEl, e.target, false);
			}
		}

		/**
		 * Hide or show an element. aria-expanded toggles are also updated
		 * @param 	{HTMLElement}		content
		 * @param 	{Element}			trigger
		 * @param 	{boolean}			show
		 */
		async function showOrHide(content, trigger, show = true){

			// Move element to end of body if it's being opened and has data-ips-hidden-top-layer, or if it's a dialog
			if(show && (content.hasAttribute("data-ips-hidden-top-layer") || content.tagName === "DIALOG")){
				document.getElementById('ipsLayout')?.appendChild(content);
			}

			// Determine what element this is (div, dialog, etc) so we can handle appropriately
			const contentTag = (content.tagName);

			// Toggle aria-expanded attribute on trigger element
			document.querySelectorAll(`[data-ipscontrols][aria-controls="${content.id}"]`).forEach(t => t.setAttribute("aria-expanded", show));
			
			if (show) {
				if (contentTag === "DIALOG") {
					content.showModal();
					content.addEventListener("close", _closeEvent);
				} else {
					content.hidden = false;
				}

				const src = trigger.dataset.ipscontrolsSrc;
				if (typeof src === 'string' && !content.dataset.ipscontrolsLoaded) {
					/** if we know the content, just use it */
					if (CACHED_REMOTE_RESPONSES.has(src) && typeof CACHED_REMOTE_RESPONSES.get(src).html === 'string' && !(typeof CACHED_REMOTE_RESPONSES.get(src).expiresAt === 'number' && CACHED_REMOTE_RESPONSES.get(src).expiresAt < Date.now() / 1000)) {
						Debug.log(`ips.ui.controls: Using cached response for ${src}`);
						content.innerHTML = CACHED_REMOTE_RESPONSES.get(src).html;
						for (const cls of [...content.classList]) {
							if (cls.startsWith('ipsLoading')) {
								content.classList.remove('ipsLoading');
							}
						}
						$(document).trigger('contentChange', [$(content)]);
						content.ipsHide();
						content.dataset.ipscontrolsLoaded = '1';
						content.querySelector("[data-autofocus]")?.focus();
						// on the first time, we wait a split second for the browser to execute a reflow
						await new Promise(resolve => setTimeout(resolve, 50));
						content.ipsShow();
					} else {
						content.classList.add('ipsLoading');
						const start = Date.now();
						loadContent(src)
							.then(html => new Promise(
								/**
								 *
								 * @param {function(string)} resolve
								 */
								resolve => {
									// first, make sure the animation completed
									if (Date.now() - start < 700) {
										setTimeout(() => resolve(html), 700 - (Date.now() - start))
									} else {
										resolve(html)
									}
								}
							))
							.then(html => {
								content.innerHTML = html;

								for (const cls of [...content.classList]) {
									if (cls.startsWith('ipsLoading')) {
										content.classList.remove('ipsLoading');
									}
								}
								$(document).trigger('contentChange', [$(content)]);
								content.dataset.ipscontrolsLoaded = '1';
								content.querySelector("[data-autofocus]")?.focus();
							})
					}
				} else {

					// Apply autofocus to inputs
					content.querySelector("[data-autofocus]")?.focus();
				}
			}

			// Ensure the above has painted before the height is calculated
			requestAnimationFrame(() => {
				content.style.setProperty('--i-animating-height', content.scrollHeight + 'px');
			})

			content.setAttribute("data-ips-animating", (show) ? 'opening' : 'closing');

			// Once animations are done, remove animation
			await Promise.allSettled(
				content.getAnimations().map((a) => a.finished)
			);

			if (!show) {
				(contentTag === "DIALOG") ? content.close() : content.hidden = true;
			}
			content.removeAttribute("data-ips-animating");

			// Dispatch event so other elements can respond to the changed state; always dispatch `ips:toggleComplete`, then optionally another event if the dataset specifies an event property
			const eventNames = ['ips:toggleComplete']
			if (content.dataset.ipsHiddenEvent) {
				eventNames.push(content.dataset.ipsHiddenEvent)
			}

			eventNames.forEach(eventName => content.dispatchEvent(new CustomEvent(eventName, {
				bubbles: true,
				detail: { hidden: content.hidden, trigger: trigger }
			})));
		}

		/**
		 * Ensure the necessary data-attributes are updated when the close event is fired on dialogs (eg, via ESC)
		 * @param 	{Event}			e
		 */
		function _closeEvent(e) {
			if(!e.target.getAttribute("open")){
				showOrHide(e.target, e.target, false);
			}
		}

		/**
		 * Load the content at a given url, contained to this module
		 *
		 * @param {string|URL}		src								Where to load content from
		 * @param {boolean}			[forceRequest=false]			Force an xhr request
		 *
		 * @return {Promise<string>}
		 */
		async function loadContent(src, forceRequest=false) {
			src = (new URL(src)).toString();
			const cachedContents = CACHED_REMOTE_RESPONSES.get(src);
			if (!forceRequest && cachedContents && typeof cachedContents.html === 'string') {
				if (!(typeof cachedContents.expiresAt === 'number' && cachedContents.expiresAt < Date.now() / 1000)) {
					Debug.log(`ips.ui.controls: Using cached response for ${src}`);
					return cachedContents.html;
				}
				CACHED_REMOTE_RESPONSES.delete(src);
			}

			try {
				const response = await ips.fetch(src);
				if (typeof response !== 'object' || typeof response.html !== 'string') {
					throw new TypeError(`Expected an object with an html:string property`);
				}

				if (!response.noCache) {
					response.expiresAt = response.expiresAt || Math.round(Date.now() / 1000 + 3600);
					if (typeof response.expiresAt === 'string') {
						response.expiresAt = parseInt(response.expiresAt);
					}
					if (typeof response.expiresAt !== 'number' || Number.isNaN(response.expiresAt)) {
						response.expiresAt = Math.round(Date.now() / 1000 + 3600);
					}
					if (!Number.isInteger(response.expiresAt)) {
						response.expiresAt = Math.round(response.expiresAt);
					}

					if (response.expiresAt * 1000 > Date.now()) {
						CACHED_REMOTE_RESPONSES.set(src, response);
					}
				}
				return response.html;
			} catch (e) {
				return ips.templates.render("ips.ui.controls.cannot_load", {message: typeof e.responseJSON?.errorMessage === 'string' ? e.responseJSON.errorMessage : undefined});
			}
		}
		
		// Register this widget with ips.ui
		ips.ui.registerWidget( 'controls', ips.ui.controls, ['src'] );

		return {
			respond
		}
	});
}(jQuery));