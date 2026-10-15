/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.widgets.block.js - Widget block controller for handling individual widgets
 *
 * Author: Matt Finger (orig. Rikki Tissier)
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.widgets.block', {

		_orientation: '',
		_blockID: '',

		initialize() {
			this._blockID = this.scope.attr('data-blockID');
			this._orientation = this.scope.closest('[data-role="widgetReceiver"]').attr('data-orientation');

			this.on( 'reloadContents.sidebar', this.reloadContent );

			$( document ).on( 'markAllRead', this.markAllRead.bind(this) );
		},

		/**
		 * Event handler/method that reloads the entire contents of this widget
		 *
		 * @returns {Promise<void>}
		 */
		async reloadContent() {
			this._setLoading(true);

			// Get content
			try {
				const pageID = ips.getSetting('pageID')
				const data = {
					app: pageID ? 'cms' : 'core',
					module: pageID ? 'pages' : 'system',
					controller: pageID ? 'builder' : 'widgets',
					do: 'getBlock',
					blockID: this._blockID,
					orientation: this._orientation
				}

				Object.assign(data, pageID ?
					{pageID} :
					{
						pageArea: this.elem.closest('[data-widgetArea]').dataset.widgetarea,
						pageApp: document.body.dataset.pageapp,
						pageModule: document.body.dataset.pagemodule,
						pageController: document.body.dataset.pagecontroller,
					}
				)

				/**
				 * @type {({html?:string, devices?: ("Phone"|"Tablet"|"Desktop")[]})}
				 */
				const response = await ips.fetch(ips.getSetting('baseURL'), {
					method: 'GET',
					data
				});

				this.scope.hide().html(response.html);

				if ('devices' in response && Array.isArray(response.devices)) {
					this.resetResponsiveClasses(response.devices);
				}

				ips.utils.anim.go('fadeIn', this.scope);
				this.trigger('loadedWidget.widgets', {
					blockID: this._blockID
				});
			} catch (e) {
				this.scope.html('Error');
			}

			this._setLoading(false);
		},

		/**
		 * Reset responsive CSS classes on outer object dependent upon list passed in
		 *
		 * @param {array} deviceList
		 *
		 * @returns {void}
		 */
		 resetResponsiveClasses(deviceList) {
		 	// Remove existing classes
		 	this.scope.removeClass( 'ipsResponsive_hidePhone' )
		 		.removeClass( 'ipsResponsive_hideDesktop' )
		 		.removeClass( 'ipsResponsive_hideTablet' );

		 	// Find the entries missing
			for(const value of ["Phone", "Tablet", "Desktop"].filter(i => !deviceList.includes(i))) {
				this.scope.addClass( 'ipsResponsive_hide' + value );
			}
		 },
		
		/**
		 * Marks lists within this block as read
		 *
		 * @returns {void}
		 */
		markAllRead() {
			// Update row
			this.scope
				.find('[data-ips-unread]')
					.removeAttr('data-ips-unread');
		},

		/**
		 * Sets the loading status of this widget
		 *
		 * @param {boolean}	status
		 *
		 * @returns {void}
		 */
		_setLoading(status) {
			if (status) {
				this.scope.html('').addClass('ipsLoading cSidebarBlock_loading');
			} else {
				this.scope.removeClass('ipsLoading cSidebarBlock_loading');
			}
		}
	});
}(jQuery));