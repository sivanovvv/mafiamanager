/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.liveSearch.js - ACP livesearch controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.liveSearch', {
		_textField: null,
		_searchMenu: null,
		_resultsContainer: null,
		_lastValue: '',
		_results: {},
		_modal: null,
		_activePanel: null,
		_ajax: {},
		_defaultTab: null,

		initialize: function () {
			this.setup();

			this.on( document, 'click', '.ipsModal', this.clickModal );
			this.on( document, 'click', '[data-role="closeLiveSearch"]', this.clickCloseButton );
			this.on( 'itemClicked.sideMenu', this.changeSection );
		},

		setup: function () {
			this._searchMenu = this.scope.find('[data-role="searchMenu"]');
			this._resultsContainer = this.scope.find('[data-role="searchResults"]');
			this._defaultTab = this.scope.find('[data-role="defaultTab"]').attr('data-ipsMenuValue');
			this._textField = $('#acpSearchKeyword');
			this._textField
				.prop( 'autocomplete', 'off' )
				.prop( 'spellcheck', false )
				.attr( 'aria-autocomplete', 'list' )
				.attr( 'aria-haspopup', 'true' );

			// Is there an active panel?
			this._activePanel = this._searchMenu.find('.ipsSideMenu_itemActive').attr('data-ipsMenuValue');

			this._textField.on('input', () => this.refresh());
		},

		/**
		 * Event handler for the itemClicked event fired by the sideMenu widget
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns {void}
		 */
		changeSection: function (e, data) {
			this._activePanel = data.selectedItemID;

			this._showResultsInPanel( this._activePanel, this._results[ this._activePanel ] );
		},

		/**
		 * Event handler for clicking the modal
		 * We have to check this is our modal by comparing IDs. If it is, we close the results.
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		clickModal: function (e) {
			if( this._modal == null || $( e.currentTarget ).attr('id') != this._modal.attr('id') ){
				return;
			}

			this._hideResults();
		},

		/**
		 * Event handler for clicking the close icon (useful for mobiles)
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		clickCloseButton: function (e) {
			this._hideResults();
		},

		/**
		 * Timer callback from this.fieldFocus
		 * Compares current value to previous value, and shows/loads new results if it's changed
		 *
		 * @returns {void}
		 */
		refresh: function () {
			var currentValue = this._textField.val().trim();

			if (currentValue === this._lastValue || this._textField.val().trim().length < 3) {
				return;
			}

			this._lastValue = currentValue;

			this._showResults();
			this._showLoading();
			this._loadResults();
		},

		/**
		 * Hides the results and modal
		 *
		 * @returns {void}
		 */
		_hideResults: function () {
			ips.utils.anim.go( 'fadeOut fast', this._modal );
			ips.utils.anim.go( 'fadeOut', this.scope );
		},

		/**
		 * Shows the results panel and modal, setting the zIndex on them so they stay in order
		 *
		 * @returns {void}
		 */
		_showResults: function () {
			if( !this._modal ){
				this._buildModal();
			}

			// Set new z-indexes to keep everything in order
			this._modal.css( { zIndex: ips.ui.zIndex() } );
			$('#ipsLayout_header').css( { zIndex: ips.ui.zIndex() } );
			this.scope.css( { zIndex: ips.ui.zIndex() } );

			// Show the results and or modal
			if( !this.scope.is(':visible') ){
				ips.utils.anim.go( 'fadeIn fast', this.scope );
			}

			if( !this._modal.is(':visible') ){
				ips.utils.anim.go( 'fadeIn fast', this._modal );
			}
		},

		_showLoading() {
			var self = this;

			this.scope.find( '[data-ipsMenuValue] [data-role="resultCount"]' ).addClass('ipsLoading').html('&nbsp;');
			this.scope.find( '[data-ipsMenuValue] [data-role="resultCount"]' ).removeClass('ipsLoading_dark ipsSideMenu_clearCount');
			this.scope.find( '[data-ipsMenuValue].ipsSideMenu_itemActive [data-role="resultCount"]' ).addClass('ipsLoading_dark ipsSideMenu_clearCount');

			this.scope.find('[data-ipsMenuValue]').each( function() {
				const key = $( this ).attr('data-ipsMenuValue');
				self._setPanelToLoading( key );
			});
		},

		/**
		 * Load results from the server
		 *
		 * @returns {void}
		 */
		_loadResults: ips.utils.debounce(function () {
			var self = this;

			// Abort any requests running now
			if( Object.keys( this._ajax ).length ){
				for (const ajax of Object.values(this._ajax)) {
					try {
						if( (typeof ajax.abort === "function" ) ) {
							ajax.abort();
							Debug.log('aborted ajax');
						}
					} catch (err) { }
				};
			}

			this.scope.find( '[data-ipsMenuValue] [data-role="resultCount"]' ).addClass('ipsLoading').html('&nbsp;');

			var value = this._lastValue.trim();

			this.scope.find('[data-ipsMenuValue]').each( function () {
				var tab = this;
				var key = $( this ).attr('data-ipsMenuValue');

				self._ajax[ key ] = ips.getAjax()('?app=core&module=system&controller=livesearch', {
					dataType: 'json',
					data: {
						search_key: key,
						search_term: encodeURIComponent( value )
					}
				}).done( function (response) {

					self._results[key] = response;

					$( tab )
						.find('[data-role="resultCount"]')
						.removeClass('ipsLoading')
						.text( parseInt( response.length ) )
						.end()
						.toggleClass( 'ipsSideMenu_itemDisabled', ( response.length === 0 ) ? true : false );

					if( $( tab ).attr('data-ipsMenuValue') == self._activePanel ){
						self._showResultsInPanel( self._activePanel, response, true );
					}

					if( !self._searchMenu.find('[data-ipsMenuValue].ipsSideMenu_itemActive:not( .ipsSideMenu_itemDisabled )').length ) {
						self._selectFirstResultsTab();
					}
					if ( response.length > 0 && key == self._defaultTab && self._activePanel == self._defaultTab ) {
						tab.click();
					}
					delete self._ajax[key];
				}).fail( function (err) {
					// fail gets called when it's aborted, so deliberately do nothing here
				});
			});
		}, 700),

		/**
		 * Selects the first section that has some results to show
		 *
		 * @returns {void}
		 */
		_selectFirstResultsTab: function () {
			var first = this._searchMenu.find('[data-ipsMenuValue]:not( .ipsSideMenu_itemDisabled )').first();
			first.trigger('click');
		},

		/**
		 * Sets the given panel into loading state
		 *
		 * @returns {void}
		 */
		_setPanelToLoading: function (panel) {
			var panelContainer = this._resultsContainer.find('[data-resultsSection="' + panel + '"]');
			panelContainer.addClass('ipsLoading').find('> ol').hide();
		},

		/**
		 * Shows the results in the relevant panel, building it if it doesn't exist
		 *
		 * @param 	{string}	panel 		Panel ID
		 * @param 	{object}	results 	Results object
		 * @param 	{booolean}	animate		Animate the results being shown?
		 * @returns {void}
		 */
		_showResultsInPanel: function (panel, results, animate) {

			// Hide all panels
			this._resultsContainer.find('[data-resultsSection]').hide();

			var panelContainer = this._resultsContainer.find('[data-resultsSection="' + panel + '"]');
			var panelList = panelContainer.find('> ol');

			// Build the container if needed
			if( !panelContainer.length ){
				this._buildResultsContainer( panel );
				panelContainer = this._resultsContainer.find('[data-resultsSection="' + panel + '"]');
				panelList = panelContainer.find('> ol');
			}

			panelContainer.removeClass('ipsLoading');
			panelList.hide().html('');

			// Any results to show?
			if( results === undefined || Object.keys( results ).length === 0 ){
				// No results
				panelList.html( ips.templates.render('core.livesearch.noResults') ).show();
				return;
			}

			// Loop through each result to build it
			for (const val of Object.values( results )){
				panelList.prepend( val );
			};

			// Find all results
			var resultItems = panelList.find('[data-role="result"]').hide();
			var delay = 25;

			panelList.show();
			panelContainer.show();

			if( animate == true ){
				resultItems.each( function () {
					var item = $( this );

					setTimeout( function () {
						ips.utils.anim.go( 'fadeIn fast', item );
					}, delay);

					delay += 25;
				});
			} else {
				resultItems.show();
			}
		},

		/**
		 * Builds a results container
		 *
		 * @param 	{string} 	panel 	Panel ID
		 * @returns {void}
		 */
		_buildResultsContainer: function (panel) {
			this._resultsContainer.prepend(
				$('<div/>')
					.attr('data-resultsSection', panel )
					.addClass('ipsScrollbar')
					.append( $('<ol/>')
					)
			);
		},

		/**
		 * Builds the modal element
		 *
		 * @returns {void}
		 */
		_buildModal: function () {
			this._modal = ips.ui.getModal();
		}
	});
}(jQuery));