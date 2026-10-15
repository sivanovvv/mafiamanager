/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.app.js - Front end app controller 
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.app', {
		
		initialize: function () {
			this.on( 'click', 'a[data-confirm],button[data-confirm]', this.confirmSomething );
			this.on( document, 'contentChange', this._checkAndClearAutosave );
			this.on( document, 'contentChange', this.checkOldEmbeds );
			this.on( document, 'contentChange', this.updateExternalLinks );

			// Change colour scheme if system settings change while page is being viewed
			document.addEventListener("ips:colorScheme", this.colorScheme);
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.updatePrefersColorScheme);

			if (ips.utils.broadcastChannel.enabled) {
				ips.utils.broadcastChannel.channel.addEventListener("message", this.broadcastChannelEvent);
			}

			this.setup();
		},

		/**
		 * Setup method for the front app
		 *
		 * @returns {void}
		 */
		setup: function () {	
			if( ips.utils.serviceWorker.supported ){
				ips.utils.serviceWorker.registerServiceWorker('front', ips.utils.cookie.get('loggedIn') !== undefined);
			}

			if ( !ips.utils.events.isTouchDevice() ) {
				this.scope.addClass('ipsApp_noTouch');
			}

			// Timezone detection
			ips.utils.cookie.set( 'ipsTimezone', new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" );
			
			// Clear any autosave stuff
			this._checkAndClearAutosave();
			if ( !ips.getSetting('memberID') && ips.utils.url.getParam('_fromLogout') ) {
				ips.utils.db.removeByType('editorSave');
			}

			// Inline message popup
			// Create a dialog if it exists
			if( $('#elInlineMessage').length ){
				var dialogRef = ips.ui.dialog.create({
					content: '#elInlineMessage',
					title: $('#elInlineMessage').attr('title')
				});

				// Leave a little time
				setTimeout( function () {
					dialogRef.show();
				}, 800);				
			}

			// Open external links in a new window
			ips.utils.links.updateExternalLinks( this.scope );

			// Find any embeds on the page and upgrade them.
			this._upgradeOldEmbeds( this.scope );

			// If we can't view user profiles, remove links in the comment content
			if( !ips.getSetting('viewProfiles') ){
				this._removeProfileLinks();
			}
		},

		/**
		 * Called on content change. Updates externals links to open in a new window.
		 *
		 * @returns {void}
		 */
		updateExternalLinks: function (e, data) {
			ips.utils.links.updateExternalLinks( data );
		},

		/**
		 * Called on content change. Upgrade any old embeds within this content container.
		 *
		 * @returns {void}
		 */
		checkOldEmbeds: function (e, data) {
			this._upgradeOldEmbeds( data );
		},

		/**
		 * Remove user profile links where possible if the current viewing user cannot access profiles
		 *
		 * @returns {void}
		 */
		_removeProfileLinks: function () {
			this.scope
				.find('a[data-mentionid],a[href*="controller=profile"]')
					.replaceWith( function(){ return $(this).contents(); } );
		},

		/**
		 * Upgrade old embeds so that they include the correct controller
		 *
		 * @returns {void}
		 */
		_upgradeOldEmbeds: function (element) {
			// element is not always defined
			if( element === undefined ){
				return;
			}

			// Apply embed controllers on old content
			var oldEmbeds = element.find('[data-embedcontent]:not([data-controller], [data-embed-src])');
			var toRefresh = [];

			if( oldEmbeds.length ){
				oldEmbeds.each( function () {
					$( this ).attr('data-controller', 'core.front.core.autoSizeIframe');
					toRefresh.push( this );
					Debug.log("Upgraded old embed");
				});
				$( document ).trigger( 'contentChange', [ jQuery([]).pushStack( toRefresh ) ] );
			}
		},

		/**
		 * Check and clear autosave
		 *
		 * @returns {void}
		 */
		 _checkAndClearAutosave: function() {
		 	if( ips.utils.cookie.get('clearAutosave') ) {
				var autoSaveKeysToClear = ips.utils.cookie.get('clearAutosave').split(',');
				for ( var i = 0; i < autoSaveKeysToClear.length; i++ ) {
					ips.utils.db.remove( 'editorSave', autoSaveKeysToClear[i] );
				}
				ips.utils.cookie.unset('clearAutosave');
			}
		 },
		
		/**
		 * Prompts the user to confirm an action
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		confirmSomething: function (e) {
			e.preventDefault();
			var elem = $( e.currentTarget );
			var customMessage = $( e.currentTarget ).attr('data-confirmMessage');
			var subMessage = $( e.currentTarget ).attr('data-confirmSubMessage');
			var icon = $( e.currentTarget ).attr('data-confirmIcon');
			
			ips.ui.alert.show( {
				type: 'confirm',
				icon: ( icon ) ? icon : 'warn',
				message: ( customMessage ) ? customMessage : ips.getString('generic_confirm'),
				subText: ( subMessage ) ? subMessage : '',
				callbacks: {
					ok: function () {
						window.location = elem.attr('href') + '&wasConfirmed=1';
					}
				}
			});
		},

		/**
		 * Keep color scheme in sync across tabs/windows
		 *
		 * @param 	{event} 	ev 	Event object
		 * @returns {void}
		 */
		broadcastChannelEvent(ev){
			if(ev.data.command === "colorScheme"){
				document.dispatchEvent(new CustomEvent("ips:colorScheme", {
					bubbles: true,
					detail: { scheme: ev.data.value }
				}));
			}
		},

		/**
		 * Change the color scheme (update data-attributes, activate the clicked button and set cookie)
		 *
		 * @param  {CustomEvent<{scheme: string}>}     ev
		 * @returns {void}
		 */
		colorScheme(ev){

			// If the color scheme toggle has been disabled, return early.
			if(document.documentElement.matches('[data-ips-scheme-toggle="false"]')){
				return;
			}

			let value = ev.detail.scheme;

			document.querySelectorAll('[data-ips-prefers-color-scheme]').forEach(el => {
				if(el.matches('[data-ips-prefers-color-scheme=' + value + ']')){
					el.setAttribute('aria-current', 'true');
				} else {
					el.removeAttribute('aria-current');
				}
			});

			document.documentElement.dataset.ipsSchemeActive = value;
			if (value === 'system'){
				document.documentElement.dataset.ipsScheme = (window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark':'light';
			} else {
				document.documentElement.dataset.ipsScheme = value;
			}

			ips.utils.cookie.set('scheme_preference', value, true);

		},

		/**
		 * This runs whenever the user changes their light/dark mode preference in their devices system settings. It updates the color scheme of the site, only if their preference was set to "System"
		 *
		 * @returns {void}
		 */
		updatePrefersColorScheme: function() {
			if (document.documentElement.getAttribute('data-ips-scheme-active') === 'system'){
				document.documentElement.setAttribute('data-ips-scheme', (window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark':'light');
			}
		}
	});
}(jQuery));