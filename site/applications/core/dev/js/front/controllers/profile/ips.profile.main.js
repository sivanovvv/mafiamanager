/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.profile.main.js - Main profile wrapper
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.front.profile.main', {

		contentArea: null,
		lastType: null,

		/**
		 * Initialize controller events
		 * Sets up the events from the view that this controller will handle
		 *
		 * @returns 	{void}
		 */
		initialize() {
			this.on( 'click', '[data-action="goToProfile"]', this.changeType );
			this.on( 'click', '[data-action="browseContent"]', this.changeType );
			this.on( 'click', '[data-action="repLog"]', this.changeType );
			this.on( 'click', '[data-action="badgeLog"]', this.changeType );
			this.on( 'click', '[data-action="solutionLog"]', this.changeType );

			// Primary event that watches for URL changes
			this.on( window, 'historychange', this.stateChange );

			this.setup();
		},

		/**
		 * Try to see what the state of this is by the content in the DOM. It is not always going to be correct, but a good guess
		 *
		 * @return {"goToProfile"|"browseContent"|"repLog"|"solutionLog"|"badgeLog"}
		 * @private
		 */
		_getHistoryStateFromPage() {
			const elem = this.scope.get(0)

			const selectorMap = {
				browseContent: '#elUserContent',
				repLog: '#elUserReputation',
				badgeLog: '.cProfileBadgeGrid',
				solutionLog: '#elUserSolutions'
			}

			for (const state in selectorMap) {
				if (elem.querySelector(selectorMap[state])) {
					return state
				}
			}

			return "goToProfile"
		},

		/**
		 * Non-event-based setup
		 *
		 * @returns 	{void}
		 */
		setup() {
			this.contentArea = this.scope.find('[data-role="profileContent"]');
			this.contentHeader = this.scope.find('[data-role="profileHeader"]');

			if (!ips.utils.history.getState('profile')?.section) {
				ips.utils.history.replaceState({ section : this._getHistoryStateFromPage()}, 'profile', window.location.href);
			}

		},

		/**
		 * Called when browser navigation is invoked without triggering a true redirect
		 *
		 * @returns 	{void}
		 */
		stateChange(e) {
			if (e.detail?.type === 'load' || e.detail?.type === 'replace') {
				return
			}

			const url = window.location.href
			const data = ips.utils.history.getState('profile')

			// Only change the state if it's an actual change
			if (this._getHistoryStateFromPage() === data.section && data.section) {
				return
			}

			this.lastType = data.section;
			e?.stopPropagation?.()
			e?.stopImmediatePropagation?.()


			switch( data?.section ){
				case 'goToProfile':
					this._showProfile( url );
					break;
				case 'browseContent':
					this._showContent( url );
					break;
				case 'repLog':
				case 'solutionLog':
				case 'badgeLog':
					this._showGenericLog( url );
					break;
			}
		},

		/**
		 * User clicked something that changes the profile view
		 * Just change the URL, the state change handler does the rest
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		changeType(e) {
			e.preventDefault();
			let target = $( e.currentTarget );

			if( !target.is('a') ){
				target = target.find('a');
			}

			ips.utils.history.pushState({ section: $( e.currentTarget ).attr('data-action') }, 'profile', target.attr('href'));
			document.title = target.attr('title')
		},

		/**
		 * Shows the user's reputation or solution log
		 *
		 * @param 		{string} 	url 		URL to load the content
		 * @returns 	{void}
		 */
		_showGenericLog(url) {
			this._changeContent( true, url ).then(()=>{});
		},

		/**
		 * Shows the user's content
		 *
		 * @param 		{string} 	url 		URL to load the content
		 * @returns 	{void}
		 */
		_showContent(url) {
			this._changeContent( true, url ).then(()=>{});
		},

		/**
		 * Shows the user's profile
		 *
		 * @param 		{string} 	url 		URL to load the content
		 * @returns 	{void}
		 */
		_showProfile(url) {
			this._changeContent( false, url ).then(()=>{});
		},

		/**
		 * Changes the content in the content section
		 *
		 * @param 		{boolean} 	small 		Show the header in its minimal state?
		 * @param 		{string} 	url 		The URL to load
		 * @returns 	{Promise<void>}
		 */
		async _changeContent(small, url) {
			ips.controller.cleanContentsOf( this.contentArea );

			// Get height and set it, so that it doesn't jolt the page
			this.contentArea.css({
				height: String(this.contentArea.outerHeight())
			});

			// Remove content and set to loading
			this.contentArea.html(
				$('<div/>').addClass('ipsLoading').css({
					height: '300px'
				})
			);

			// Add class to the header to shrink it
			this.contentHeader.find('#elProfileHeader').toggleClass( 'ipsCoverPhoto--minimal', small );

			// Load the content
			url += (url.includes('?') ? '&' : '?') + 'entireSection=1';
			try {
				const response = await ips.fetch(url)
				this.contentArea
					.hide()
					.html(response)
					.css({
						height: 'auto'
					});

				ips.utils.anim.go('fadeIn fast', this.contentArea);

				$(document).trigger('contentChange', [this.contentArea]);
			} catch (e) {
				window.location = url;

			}
		}

	});
}(jQuery));