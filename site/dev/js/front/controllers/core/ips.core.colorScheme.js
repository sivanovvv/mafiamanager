/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.colorScheme.js - Controller for managing the "Change color scheme" buttons
 *
 * Author: Ehren Harber
 */
;( function(){
	"use strict";

	ips.controller.register('core.front.core.colorScheme', {
		
		initialize() {
			this.menu = this.scope[0];
			this.on( this.menu, 'click', this.changeColorScheme );

			// Set aria-current on active color scheme button(s) if the attribute doesn't exist already
			if(!this.menu.querySelector("[aria-current")){
				this.schemePref = ips.utils.cookie.get('scheme_preference') || document.documentElement.dataset.ipsSchemeDefault;
				document.querySelectorAll('[data-ips-prefers-color-scheme=' + this.schemePref + ']').forEach(el => el.setAttribute('aria-current', 'true'));
			}
		},

		// Dispatch the ips:colorScheme event which changes the color scheme and saves the value as a cookie
		changeColorScheme(ev){

			let el = ev.target.closest('[data-controller="core.front.core.colorScheme"] [data-ips-prefers-color-scheme]');
			if(!el) return;

			document.dispatchEvent(new CustomEvent("ips:colorScheme", {
				bubbles: true,
				detail: { scheme: el.dataset.ipsPrefersColorScheme }
			}));

			if (ips.utils.broadcastChannel.enabled) {
				ips.utils.broadcastChannel.channel.postMessage({
					command: 'colorScheme',
					value: el.dataset.ipsPrefersColorScheme
				});
			}

		}

		
	});
}());