/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.search.filters.js - Filters form for search
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.search.filters', {

		initialize: function () {
			this.on( 'click', '[data-action="showFilters"]', this.showFilters );
			this.on( 'click', '[data-action="searchByTags"]', this.toggleSearchFields );
			this.on( 'click', '[data-action="searchByAuthors"]', this.toggleSearchFields );
			this.on( 'click', '[data-action="cancelFilters"]', this.cancelFilters );
			this.on( 'ips:refreshTogglesDone', this.toggleFilterByCounts );
			this.on( 'itemClicked.sideMenu', '[data-filterType="dateCreated"]', this.filterDate );
			this.on( 'itemClicked.sideMenu', '[data-filterType="dateUpdated"]', this.filterDate );
			this.on( 'itemClicked.sideMenu', '[data-filterType="joinedDate"]', this.filterDate );
			this.on( 'change', '[name^="search_min_"]', this.changeValue );
			this.on( 'tokenDeleted tokenAdded', this.tokenChanged );
			this.on( 'resultsLoading.search', this.resultsLoading );
			this.on( 'resultsDone.search', this.resultsDone );
			this.on( 'cancelResults.search', this.cancelResults );
			this.on( 'submit', this.submitForm );
			this.on( 'tabShown', this.tabShown );
			this.on( 'nodeInitialValues', this.setup );
			
			if( !this.scope.find('[data-role="hints"] ul li').length ){
				this.scope.find('[data-role="hints"]').hide();
			}
			
			this.setup();
		},

		setup: function () {
			var data = this.scope.find('form').serializeArray();

			this.trigger( 'initialData.search', {
				data: data
			});

			this.toggleFilterByCounts();
		},
		
		/**
		 * Remove the "Filter by number of..." header as the form toggles takes care of the rest
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		toggleFilterByCounts: function () {
			const searchTitleEl = document.getElementById('elSearch_filter_by_number');
			if (!searchTitleEl) {
				return;
			}

			const searchByNumberOptions = document.querySelector("#elSearch_filter_by_number + ul");

			// nothing visible?
			if (!searchByNumberOptions || !searchByNumberOptions.querySelector(':scope > :not([hidden])')) {
				searchTitleEl.hidden = true;
			} else {
				searchTitleEl.hidden = !this.elem.querySelector('input[name="type"]:checked').value;
			}
		},

		/**
		 * Triggered by search wrapper, resets search form back to initial state (i.e. no results showing)
		 *
		 * @returns 	{void}
		 */
		cancelResults: function () {
			this.showFilters();
			this.scope.find('[data-role="hints"]').remove();
			this.scope.find('#elMainSearchInput').val('').trigger('focus');
			this.scope.find('[data-action="cancelFilters"], [data-action="searchAgain"]').hide();
		},
		
		/**
		 * Event handler watching for changes on 'minimum' search fields. Shows a bubble
		 * when a positive value is applied.
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		changeValue: function (e) {
			var field = $( e.currentTarget ); 
			var name = field.attr('name');
			var bubble = this.scope.find('[data-role="' + name + '_link"] [data-role="fieldCount"]');

			if( field.val() == 0 ){
				bubble.text('0').addClass('ipsHide');
			} else {
				bubble.text( field.val() ).removeClass('ipsHide');
			}
		},

		/**
		 * Watches for token changes in tags field so we can show the and/or option
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from autocomplete
		 * @returns 	{void}
		 */
		tokenChanged: function (e, data) {
			var tags = this.scope.find('#elInput_tags_wrapper li.cToken');
			var term = this.scope.find('input[name="q"]');
			var andOr = this.scope.find('[data-role="searchTermsOrTags"]');
			
			// If we have a term and a token, show the and/or radios, otherwise hide them
			if( tags.length && term.val() && !andOr.is(':visible') ){
				andOr.slideDown();
			} else if ( ( !tags.length || !term.val() ) && andOr.is(':visible') ){
				andOr.slideUp();
			}
		},

		/**
		 * Watches for tab changes. When the 'member search' tab is focused, we select the
		 * hidden radio box that sets search to members
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from tab widget
		 * @returns 	{void}
		 */
		tabShown: function (e, data) {			
			if( data.tabID == 'ipsTabs_search_searchMembers' ){
				this.scope
					.find('input[name="type"][value="core_members"]')
						.prop( 'checked', true )
						.trigger('change')
					.end()
					.find('[data-action="updateResults"]')
						.text( ips.getString('searchMembers') );
			} else {
				this.scope
					.find('[data-role="searchApp"] .ipsSideMenu_itemActive input[type="radio"]')
						.prop( 'checked', true )
						.trigger('change')
					.end()
					.find('[data-action="updateResults"]')
						.text( ips.getString("searchContent") );
			}
		},

		/**
		 * Hides filters
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		cancelFilters: function (e) {
			var self = this;
			this.scope.find('[data-role="searchFilters"]').slideUp('fast', function () {
				self.scope.find('[data-action="showFilters"]').slideDown();
			});
		},

		/**
		 * Shows advanced filters
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		showFilters: function (e) {
			if( e ){
				e.preventDefault();
			}

			this.scope.find('[data-action="showFilters"]').hide();
			this.scope.find('[data-role="searchFilters"]').slideDown();

			/* We do this so the form toggles (i.e. show forums if you choose to search in forums content type) will reinitialize */
			$(document).trigger('contentChange', [ this.scope ] );
		},

		/**
		 * Event handler from main controller indicating results have loaded
		 * Remove loading mode, and hide the filters
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from main controller
		 * @returns 	{void}
		 */
		resultsDone: function (e, data) {
			var searchButton = this.scope.find('[data-action="updateResults"]');

			// Reset loading state
			searchButton.prop( 'disabled', false ).text( searchButton.attr('data-originalText') );
			
			// Hide filters
			this.scope.find('[data-role="searchFilters"]').hide();
			// Unhide 'more options' link
			this.scope.find('[data-action="showFilters"]').removeClass('ipsHide').show();
			// Unhide 'search again' button
			this.scope.find('[data-action="searchAgain"]').removeClass('ipsHide ipsButton--disabled').show();
			
			if( data.hints !== undefined ){
				this.scope.find('[data-role="hints"]').html( data.hints ).show();
			}
			
			if( ! this.scope.find('[data-role="hints"] ul li').length ){
				this.scope.find('[data-role="hints"]').hide();
			}
			
			$( document ).trigger( 'contentChange', [ this.scope ] );
		},

		/**
		 * Event handler from main controller indicating results are loading
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from main controller
		 * @returns 	{void}
		 */
		resultsLoading: function (e, data) {
			var searchButton = this.scope.find('[data-action="updateResults"]');

			this.scope.find('[data-action="searchAgain"]').addClass('ipsButton--disabled');
			searchButton.prop( 'disabled', true ).attr( 'data-originalText', searchButton.text() ).text( ips.getString("searchFetchingResults") );
		},

		/**
		 * Event handlers for tags/author links to show a form filter
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		toggleSearchFields: function (e) {
			e.preventDefault();
			var link = $( e.currentTarget );
			var opens = link.attr('data-opens').split(',');
			var i;
			
			for( i = 0; i < opens.length; i++ ) {
				this.scope.find('[data-role="' + opens[i] + '"]').slideDown( function () {
					if( !link.closest('ul').find('li').length ){
						link.closest('ul').remove();
					}
	
					$( this ).find('input[type="text"]').trigger('focus');
				});
			}

			link.closest('li').hide();
		},

		/**
		 * Event handler for date filters, showing date fields when 'custom' is selected
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from side meun widget
		 * @returns 	{void}
		 */
		filterDate: function (e, data) {
			var elem = $( e.currentTarget );

			if( data.selectedItemID == 'custom' ){
				elem.find('[data-role="dateForm"]').slideDown();
			} else {
				elem.find('[data-role="dateForm"]').slideUp();
			}
		},

		/**
		 * Event handler for submitting the form. Triggers an event containing the data which
		 * the main controller will handle
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitForm: function (e) {
			e.preventDefault();

			// Make sure keyboard is hidden
			this.scope.find('#elMainSearchInput').trigger('blur');

			var self = this;
			var app = this.scope.find('[data-role="searchApp"] .ipsSideMenu_itemActive');
			var appKey = app.attr('data-ipsMenuValue');
			var appTitle = app.find('[data-role="searchAppTitle"]').text();
			var isMemberSearch = $('#ipsTabs_search_searchMembers').attr('aria-selected') == 'true';
			
			// Make sure we have at least one key field entered (a term, or tags)
			var searchTerm = this.scope.find('#elMainSearchInput').val().trim();
			var tagExists = ( this.scope.find('#elInput_tags').length && this.scope.find('#ipsTabs_search_searchContent').attr('aria-selected') === 'true' );

			if( tagExists ){
				var tagField = ips.ui.autocomplete.getObj( this.scope.find('#elInput_tags') );
				var tokens = tagField.getTokens();
			}
			
			if ( ! isMemberSearch ) {
				if ((!searchTerm && !tagExists) || (!searchTerm && tagExists && tokens.length === 0)) {
					ips.ui.alert.show( {
						type: 'alert',
						message: ( !searchTerm && !tagExists ) ? ips.getString('searchRequiresTerm') : ips.getString('searchRequiresTermTags'),
						icon: 'info',
						callbacks: {
							ok: function () {
								setTimeout( function () {
									self.scope.find('#elMainSearchInput').trigger('focus');
								}, 300 );
							}
						}
					});
					return;
				}
			}
			
			// I don't like it, however this is necessary to make sure that the htmlentities inside the tags are decoded
			const el = document.createElement('div');
			const data = this.scope.find('form').serializeArray();
			const tagsObject = data.find(item => item.name === 'tags');
			if (tagsObject) {
				el.innerHTML = tagsObject.value;
				tagsObject.value = el.textContent;
			}

			// Everything good? Trigger the event for the main controller to handle
			this.trigger( 'formSubmitted.search', {
				data,
				appKey: appKey,
				tabType: this.scope.closest('data-tabType').attr('data-tabType'),
				appTitle: appTitle
			});
		}
	});
}(jQuery));