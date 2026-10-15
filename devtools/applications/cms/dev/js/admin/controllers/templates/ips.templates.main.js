/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.templates.main.js - Templates: Parent controller for the template editor
 * Simply manages showing the loading thingy based on events coming from within
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('cms.admin.templates.main', {
		
		_timer: null,
		_textField: null,
		_lastValue: '',
		_ajax: null,
		
		initialize: function () {
			this._textField = $(this.scope).find('[data-role="templateSearch"]');
			this.on( document, 'focus', '[data-role="templateSearch"]', this.fieldFocus );
			this.on( document, 'blur', '[data-role="templateSearch"]', this.fieldBlur );
			this.on( 'menuItemSelected', this.menuSelected );
			
			this.on( 'savingFile.templates', this.showLoading );
			this.on( 'saveFileFinished.templates', this.hideLoading );
		},

		/**
		 * Shows the loading thingy
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		showLoading: function (e) {
			ips.utils.anim.go( 'fadeIn', this.scope.find('[data-role="loading"]') );
		},

		/**
		 * Hides the loading thingy
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		hideLoading: function (e) {
			ips.utils.anim.go( 'fadeOut', this.scope.find('[data-role="loading"]') );
		},
		
		/**
		 * Event handler for focusing in the search box
		 * Set a timer going that will watch for value changes. If there's already a value,
		 * we'll show the results immediately
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		fieldFocus: function (e) {
			this._timer = setInterval( this._timerFocus.bind(this), 700 );
		},

		/**
		 * Event handler for field blur
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		fieldBlur: function (e) {
			clearInterval( this._timer );
		},
		
		/**
		 * Timer callback from this.fieldFocus
		 * Compares current value to previous value, and shows/loads new results if it's changed
		 *
		 * @returns {void}
		 */
		_timerFocus: function () {
			var currentValue = this._textField.val();
			
			if( currentValue == this._lastValue ){
				return;
			}

			this._lastValue = currentValue;
			
			this._loadResults();
		},
		
		/**
		 * Event when tab is changed
		 *
		 * @returns {void}
		 */
		_swapTab: function (e,data) {
			if ( data.barID == 'elTemplateEditor_typeTabs' ) {
				this._loadResults();
			}
		},
		
		/**
		 * Event handler for the filter menu
		 *
		 * @param	{event} 	e		Event object
		 * @param	{object} 	data	Event data object
		 * @returns {void}
		 */
		menuSelected: function (e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}			
			
			this._loadResults();
		},
		
		/**
		 * Load results from the server
		 *
		 * @returns {void}
		 */
		_loadResults: function () {			
			if( this._ajax ){
				this._ajax.abort();
			}
			
			if ( this._lastValue ) {
				this._textField.addClass('ipsField_loading');
			}

			var type = $('#elTemplateEditor_typeTabs').find('[aria-selected="true"]').attr('data-type');
			var type = ( type == 'templates' ) ? 'template' : type; // Because it's fun to be inconsistent, the database 'type' is 'template' yet in templates we use 'templates' - thanks past Matt

			$('#elTemplateEditor_fileList').find('li[data-type=' + type + ']').addClass('ipsHide');
			
			var filters = [];
			$('#elTemplateFilterMenu_menu [aria-selected="true"]').each(function(){
				filters.push( $(this).attr('data-ipsMenuValue') );
			});

			var self = this;
			this._ajax = ips.getAjax()( $(this.scope).attr('data-ajaxURL') + '&do=searchtemplates&type=' + type + '&term=' + encodeURIComponent( this._lastValue ) + '&filters=' + filters.join(',') ).done(function(response){
				var i;
				
				var j;
				for ( j in response )
				{
					$('#elTemplateEditor_fileList').find('[data-location="' + j + '"]').removeClass('ipsHide');
					var k;
					for ( k in response[j] )
					{
						$('#elTemplateEditor_fileList').find('[data-location="' + j + '"] [data-group="' + k + '"]').removeClass('ipsHide');
						var l;
						for ( l in response[j][k] )
						{
							if( k == '.' ){
								$('#elTemplateEditor_fileList').find('[data-location="' + j + '"] [data-name="' + response[j][k][l] + '"]').parent().removeClass('ipsHide');
							} else {
								$('#elTemplateEditor_fileList').find('[data-location="' + j + '"] [data-group="' + k + '"] [data-name="' + response[j][k][l] + '"]').parent().removeClass('ipsHide');
							}								
						}
					}
				}
				
				self._textField.removeClass('ipsField_loading');
			});
		}

	});
}(jQuery));