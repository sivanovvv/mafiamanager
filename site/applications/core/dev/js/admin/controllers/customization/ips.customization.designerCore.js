/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.customization.designerCore.js - Templates: controller for the simple editor
 *
 * Author: Matt "Oops I did it again" Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.customization.designerCore', {
		
		_cmInstances: {},
		isSaving: false,
		
		initialize: function () {
			this.on( 'click', 'button[type="submit"]', this.save );
			this.on( 'tabChanged', this.changedTab );
			const debounce = ips.utils.debounce( this._recalculatePanelWrapper.bind(this), 100 );
			this.on( window, 'resize', debounce );

			const disableSubmit = () => {
				this.isSaving = true
			}
			const debouncedEnableSubmit = ips.utils.debounce(() => {
				this.isSaving = false
			}, 500)

			this.elem.addEventListener('ips:codebox#update', () => {
				disableSubmit();
				debouncedEnableSubmit();
			})
		},

		/**
		 * Tab widget has indicated that the user has changed tab
		 * If there's a file ID, trigger a new event with it, to enable the file listing to highlight it
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Event data object
		 * @returns {void}
		 */
		changedTab: function (e, data) {
			this._recalculatePanelWrapper();
		},
		
		/**
		 * Saves the contents of the editor
		 *
		 * @param	{Event} 	e 		Event object
		 * @returns {Promise<void>}
		 */
		async save(e) {
			e.preventDefault();
			const form = this.scope.find('form[data-formid="form"]');

			if (this.isSaving) {
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			const save = Object.fromEntries(new FormData(form.get(0)).entries());
			
			Debug.log( save );
			
			this.scope.find('button[type="submit"]').addClass('ipsButton_disabled').removeClass('ipsButton_primary');
			try {
				await ips.fetch( form.attr('action'), {
					dataType: 'json',
					data: save,
					type: 'post'
				});
				ips.ui.flashMsg.show(ips.getString('saved'));
			} catch (jqXHR) {
				let message = ips.getString('saveThemeError');
				try {
					message = JSON.parse( jqXHR.responseText );
				}
				catch (e) {}

				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message
				});
			}

			this.scope.find('button[type="submit"]').removeClass('ipsButton_disabled').addClass('ipsButton_primary');
		},
		
		/**
		 * Returns the current height of the tab panel wrapper
		 *
		 * @returns {number}
		 */
		_getContentHeight: function () {
			return $( window ).height() - this.scope.find('#tabs_form').offset().top - 250;
		},
		
		/**
		 * Calculates whether the tab bar has wrapped, and if so, resizes the panel wrapper and updates
		 * CodeMirror instances with the new height
		 *
		 * @returns {void}
		 */
		_recalculatePanelWrapper: function () {
			// Get the height of it
			var self = this;

			for (const cm of Object.values(this._cmInstances)) {
				cm.setSize( null, self._getContentHeight() );
			};
		}
	});
}(jQuery));