/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.changeTheme.js - ACP theme changing
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.changeTheme', {

		initialize: function () {
			this.on( 'menuItemSelected', this.themePreferenceSelected.bind(this));
			this.on( 'click', '[data-role="mobileThemeMenu"] button', this.mobileThemePreferenceSelected );

			this.setTheme();
		},

		/**
		 * Determine if we should be using dark mode or not and set the class if so
		 *
		 * @returns {void}
		 */
		setTheme: function () {
			// If we don't have a specific preference, use the OS default
			if( ips.utils.cookie.get('acptheme') === undefined || ips.utils.cookie.get('acptheme') == 'undefined' )
			{
				if ( window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches )
				{
					$('html').attr('data-ips-scheme', 'dark');
					ips.utils.cookie.set( 'acpthemedefault', 'dark' );
				}
				else
				{
					$('html').attr('data-ips-scheme', 'light');
					ips.utils.cookie.set( 'acpthemedefault', 'light' );
				}
			}
			// We have a cookie preference set so make sure that's being used
			else
			{
				if(ips.utils.cookie.get('acptheme') === 'dark'){
					$('html').attr('data-ips-scheme', 'dark');
				} else {
					$('html').attr('data-ips-scheme', 'light');
				}
			}
		},

		updatePreference: function(choice){

			if( choice == 'os' )
			{
				// If we selected to use the OS preference delete the cookie (if it exists) and let the normal behavior resume
				ips.utils.cookie.unset('acptheme');
			}
			else
			{
				// Otherwise set our cookie and force the behavior we requested
				var expires = new Date();
				expires.setFullYear( expires.getFullYear() + 1 );
				ips.utils.cookie.set( 'acptheme', choice, expires.toUTCString() );
			}
		},

		/**
		 * Change our AdminCP theme
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object}	data	Event data
		 * @returns {void}
		 */
		themePreferenceSelected: function (e, data = e.detail) {
			// Make sure something was selected and this isn't a click on a different menu item
			if( data.selectedItemID === undefined )
			{
				return;
			}
			this.updatePreference(data.selectedItemID);
			this.setTheme();
		},

		mobileThemePreferenceSelected: function(e){
			let choice = e.currentTarget.getAttribute("data-value");
			this.updatePreference(choice);
			this.setTheme();
		}
	});
}(jQuery));