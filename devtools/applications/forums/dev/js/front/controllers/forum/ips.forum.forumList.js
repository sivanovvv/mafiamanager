/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.forum.forumList.js - Controller for a forum listing
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.controller.register('forums.front.forum.forumList', {

		/**
		* Initializes the controller
		 *
		* @returns {void}
		*/
		initialize() {
			this.on( 'ips:toggleForumCategory', this.toggleCategory );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * Hides categories the user has already hidden
		 *
		 * @returns {void}
		 */
		setup() {
			let hiddenCategories = ips.utils.db.get( 'hiddenCategories' );

			if (hiddenCategories && typeof hiddenCategories === 'object' && !Array.isArray(hiddenCategories) && Object.keys(hiddenCategories).length) {
				Object.entries(hiddenCategories).forEach(([key, val]) => {		
					document.querySelector("[aria-controls='forum-category_" + key + "']")?.setAttribute('aria-expanded', 'false');
					document.getElementById('forum-category_' + key)?.setAttribute('hidden', '');
				});
			}
		},

		/**
		 * Event handler for storing toggle status
		 * Hidden categories are stored localDB
		 *
		 * @param 	{ipsUiHiddenToggleEvent} 	e 	Event object
		 *
		 * @returns {void}
		 */
		toggleCategory(e) {
			/* Get the category which triggered the event and its ID */
			const category = e.target;
			const categoryID = category.closest('[data-categoryID]')?.dataset.categoryid;

			if (!category || !categoryID) {
				Debug.warn(`The forum list got a category hidden toggle event but couldn't determine which category was toggled`);
				return;
			}

			if (e.detail.hidden) {
				ips.utils.db.set( 'hiddenCategories', categoryID, true );
			} else {
				ips.utils.db.remove( 'hiddenCategories', categoryID );
			}
			
		}
	});
}(jQuery));