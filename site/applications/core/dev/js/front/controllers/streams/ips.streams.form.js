/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.streams.form.js - Streams filter form
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.streams.form', {
		loaded: {},
		formSnapshot: false,
		reloaded: false,
		_loadedContainer: {},
		_loadedClubs: false,
		_formData: {},
		
		initialize: function () {
			this.on( 'streamStateUpdate.streamForm', this.streamStateUpdate );
			this.on( 'itemClicked.sideMenu', '[data-filterType="type"]', this.selectedType );
			this.on( 'menuItemSelected', '#elStreamReadStatus, #elStreamShowMe', this.checkFormUpdate );
			this.on( 'tokenAdded tokenDeleted', this.tokensChanged );
			this.on( 'menuItemSelected', '#elStreamSortEdit', this.changeSort );
			this.on( 'click', '[data-action="saveStream"], [data-action="newStream"]', this.submitForm );
			this.on( 'click', '[data-role="streamContainer"]', this.openStreamContainer );
			this.on( 'click', '[data-role="streamClubs"]', this.openStreamClubs );
			this.on( 'click', '[data-action="dismissSave"]', this.dismissSave );
			this.on( 'keydown', 'input', this.inputKeydown );
			
			if ( this.scope.attr('data-formType') == 'createStream' ) {
				this.on( 'itemClicked.sideMenu', '[data-filterType="date"]', this.selectedDate );
				this.on( 'itemClicked.sideMenu', '[data-filterType="ownership"]', this.selectedOwnership );
			} else {
				this.on( 'menuItemSelected', '#elStreamFollowStatus', this.selectedFollowStatus );
				this.on( 'menuItemSelected', '#elStreamTimePeriod', this.selectedDate );
				this.on( 'menuItemSelected', '#elStreamOwnership', this.selectedOwnership );
			}
			
			this.on( 'change', '#elSelect_stream_club_filter', this.clubSelectionChanged );
			this.on( 'change', '#stream_club_filter_unlimited', this.clubSelectionChanged );
			
			this.on( 'menuItemSelected', '#elStreamSortEdit, #elStreamFollowStatus', this.selectedMenuItem );
			this.on( 'menuItemSelected', '#elStreamTimePeriod, #elStreamOwnership, #elStreamShowMe', this.selectedMenuItem );
			
			this.on( 'menuItemSelected', '#elStreamReadStatus', this.selectedReadStatus );

			this.on( 'menuClosed', this.menuClosed );
			
			this.setup();
		},
	
		setup: function () {
			// Custom serialization for our form
			this._serializeConfig = {
				'stream_date_range[start]': this._serializeDate,
				'stream_date_range[end]': this._serializeDate
			};

			// If we're just creating a stream, we have no configuration yet
			if( this.scope.attr('data-formType') != 'createStream' ){
				this._formData = ips.getSetting('stream_config');

				// Are we looking for unread things and data?
				this._changeReadStatus( this._formData['stream_read'] );

				this._updateFilterOverview();

				this.takeFormSnapshot();
			}

			this.trigger( 'initialFormData.stream', {
				data: this._formData
			});
		},

		/**
		 * Handles keydown on inputs inside the stream menus. 
		 * Prevents enter key from creating a new stream (which is a behavior that isn't obvious to users)
		 *
		 * @param 		{event} 	e 		Event Object
		 * @returns 	{void}
		 */		
		inputKeydown: function (e) {
			if( e.which == 13 ){
				e.preventDefault();
			}
		},
		
		/**
		 * Responds to an event from the main controller which tells us
		 * that the page state has changed, and we need to update our form field
		 * values to show the updated values
		 *
		 * @param 		{event} 	e 		Event Object
		 * @param 		{object} 	data	Event data object
		 * @returns 	{void}
		 */
		streamStateUpdate: function (e, data) {
			this._formData = data.filterData;
			this._updateFieldValues();

			// Do we need to show the Save bar?
			if( data.hideSaveBar !== undefined && data.hideSaveBar ){
				this.scope.find('[data-role="saveButtonContainer"]').slideUp();
			} else {
				this.scope.find('[data-role="saveButtonContainer"]').slideDown();
			}
		},
		
		/**
		 * Adds a simple overview of each filter setting
		 *
		 * @returns 	{void}
		 */
		_updateFilterOverview: function () {
			
			// Only do this if we aren't creating
			if( this.scope.attr('data-formType') == 'createStream' ){
				return;
			}

			var self = this;
			var values = this._formData;
			
			var _overview = function (type) {
				return self.scope.find('[data-filter="' + type + '"] [data-role="filterOverview"]');
			};
			
			// Simple values
			for (const val of ['stream_include_comments', 'stream_read', 'stream_sort', 'stream_solved']){
				var lang = 'streamFilter_' + val + '_' + values[ val ];
				_overview( val ).html( ips.getString( lang ) );
			};
			
			// Tags
			if( values['stream_tags'] !== undefined && values['stream_tags'].trim() !== '' ){
				var tags = values['stream_tags'].split(/\r?\n/).filter(Boolean);
			 	
				if( tags.length <= 2 ){
					var tagLang = ips.getString('streamFilter_stream_tags_tags', { 'tags': ips.utils.escapeHTML( tags.join(',') ) });
				} else {
					var tagLang = ips.pluralize( ips.getString('streamFilter_stream_tags_count'), tags.length ); 
				}
				
				_overview( 'stream_include_comments' ).append( '; ' + tagLang );
			} else {
				_overview( 'stream_include_comments' ).append( '; ' + ips.getString( 'streamFilter_stream_tags_noTags' ) );
			}
			
			// Ownership
			if ( values['stream_ownership'] == 'custom' && ( values['stream_custom_members'] === undefined || values['stream_custom_members'] == null || values['stream_custom_members'] == '' ) ) {
				values['stream_ownership'] = 'all'
			}
			if( values['stream_ownership'] !== 'custom' ){
				var ownershipLang = 'streamFilter_stream_ownership_' + values[ 'stream_ownership' ];
				_overview( 'stream_ownership' ).html( ips.getString( ownershipLang ) );
			} else if ( values['stream_custom_members'] !== undefined && values['stream_custom_members'] != null ) {
				var names = ( (typeof values['stream_custom_members'] === "object" && values['stream_custom_members'] !== null) ? values['stream_custom_members'] : values['stream_custom_members'].split(/\r?\n/) ).filter(Boolean);
				var ownershipLang = ips.pluralize( ips.getString('streamFilter_stream_ownership_custom'), names.length );  
				_overview( 'stream_ownership' ).text( ownershipLang );
			}
			
			// Following
			if( values['stream_follow'] == 'all' ){
				_overview( 'stream_follow' ).html( ips.getString( 'streamFilter_stream_follow_all' ) );
			} else {
				var value = Object.keys( values['stream_followed_types'] );
				var follows = [];
				
				for( var i = 0; i < value.length; i++ ){
					follows.push( ips.getString( 'streamFilter_stream_follow_' + value[i] ) );
				}
				
				_overview( 'stream_follow' ).html( follows.join( ', ' ) );
			}

			// Date range
			if ( values['stream_date_type'] == 'relative' && ( values['stream_date_relative_days'] === undefined || values['stream_date_relative_days'] == null || values['stream_date_relative_days'] == '' ) ) {
				values['stream_date_type'] = 'all';
			} else if( values['stream_date_type'] == 'custom' && ( ( values['stream_date_range']['start'] === undefined || values['stream_date_range']['start'] == null || values['stream_date_range']['start'] == '' ) || ( values['stream_date_range']['end'] === undefined || values['stream_date_range']['end'] == null || values['stream_date_range']['end'] == '' ) ) ) {
				values['stream_date_type'] = 'all';
			}
			if( values['stream_date_type'] == 'all' || values['stream_date_type'] == 'last_visit' ){
				_overview( 'stream_date_type' ).html( ips.getString( 'streamFilter_stream_date_type_' + values['stream_date_type'] ) );
			} else if( values['stream_date_type'] == 'relative' ){

				if( values['stream_date_relative_days']['unit'] == 'w' ) {
					var dateLang = ips.pluralize( ips.getString('streamFilter_stream_date_type_relative_weeks'), ( values['stream_date_relative_days']['val'] ? values['stream_date_relative_days']['val'] : values['stream_date_relative_days'] ) );
				}
				else {
					var dateLang = ips.pluralize( ips.getString('streamFilter_stream_date_type_relative'), ( values['stream_date_relative_days']['val'] ? values['stream_date_relative_days']['val'] : values['stream_date_relative_days'] ) );
				}
				_overview( 'stream_date_type' ).text( dateLang );
			} else {
				// If this is a member-owned stream *or* it's a real date stamp (xx-xx-xxxx), we need to strip out the timezone
				// However, if it's an admin-created stream, there's no timezone in the stamp, so leave as-is
				if( values['__stream_owner'] !== undefined || ( isNaN( values['stream_date_range']['start'] ) && values['stream_date_range']['start'].match('-') ) ){
					var start = ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( isNaN( values['stream_date_range']['start'] ) && values['stream_date_range']['start'].match('-') ? values['stream_date_range']['start'] : values['stream_date_range']['start'] * 1000 ) ) );
					var end = ips.utils.time.localeDateString( ips.utils.time.removeTimezone( new Date( isNaN( values['stream_date_range']['end'] ) && values['stream_date_range']['end'].match('-') ? values['stream_date_range']['end'] : values['stream_date_range']['end'] * 1000 ) ) );
				} else {
					var start = ips.utils.time.localeDateString( new Date( values['stream_date_range']['start'] * 1000 ) );
					var end = ips.utils.time.localeDateString( new Date( values['stream_date_range']['end'] * 1000 ) );
				}

				if( values['stream_date_range']['start'] !== undefined && values['stream_date_range']['end'] !== undefined ){
					var dateLang = ips.getString('streamFilter_stream_date_type_range', { start: start, end: end });
				} else if( values['stream_date_range']['start'] !== undefined ) {
					var dateLang = ips.getString('streamFilter_stream_date_type_start', { start: start });
				} else if( values['stream_date_range']['start'] !== undefined ) {
					var dateLang = ips.getString('streamFilter_stream_date_type_end', { end: end });
				}
				
				_overview( 'stream_date_type' ).text( dateLang );
			}
			
			// Content
			if( !values['stream_classes'] || values['stream_classes_type'] == 0 ){
								
				if ( values['stream_club_select'] == 'none' ) {
					_overview( 'stream_classes' ).html( ips.getString( 'streamFilter_stream_classes_no_clubs' ) );
				} else if ( values['stream_club_select'] == 'all' ) {
					_overview( 'stream_classes' ).html( ips.getString( 'streamFilter_stream_classes_all' ) );
				} else if( values['stream_club_filter'] ) {
					_overview( 'stream_classes' ).text( ips.getString('loading') );
					this._loadClubs(function(){
						var elem = this.scope.find('#elSelect_stream_club_filter');
						var clubIds = values['stream_club_filter'].split(',');
						var clubNames = [];
						for( var i = 0; i < clubIds.length; i++ ){
							var option = elem.find('option[value="' + clubIds[i] + '"]');
		
							if( option.length ){
								clubNames.push( option.text().trim() );
							}
						}
						_overview( 'stream_classes' ).text( clubNames.join( ', ') );
					}.bind(this));
				}
			} else {
				var classKeys = Object.keys( values['stream_classes'] );
				var classes = [];
				
				for( var i = 0; i < classKeys.length; i++ ){
					var elem = this.scope.find('[data-class="' + classKeys[i].replace(/\\/g, '\\\\') + '"] > span');

					if( elem.length ){
						classes.push( elem.text().trim() );
					}
				}
				
				_overview( 'stream_classes' ).text( classes.join( ', ') );
			}
		},
		
		/**
		 * Update fields in our form to reflect the values in _formData,
		 * which have likely been updated by the page state changing.
		 *
		 * @returns 	{void}
		 */
		_updateFieldValues: function () {
			
			var self = this;
			var data = this._formData;
			
			if ( data['stream_read'] == 'unread' ) {
				data['stream_include_comments'] = 0;
			}
			
			// Basics
			for (const key of ['stream_include_comments', 'stream_read', 'stream_sort', 'stream_follow', 'stream_ownership', 'stream_date_type']) {
				self.scope.find('[name="' + key + '"]')
					.prop( 'checked', false )
					.filter('[value="' + data[ key ] + '"]')
						.prop('checked', true)
						.trigger('change');
			};
			
			// Following types			
			var followSelector = Object.keys(data['stream_followed_types'] || {}).map(key => '[name="stream_followed_types[' + key + ']"]');

			this.scope.find('[name^="stream_followed_types"]').prop('checked', false);

			// Only check inputs if we've selected "Following" filters
			if (followSelector.length) {
				this.scope.find('[name^="stream_followed_types"]')
					.filter(followSelector.join(','))
					.prop('checked', true)
					.trigger('change');
			}
					
			// Ownership
			if( this.scope.find('#elInput_stream_custom_members').length ){
				var ownerAC = ips.ui.autocomplete.getObj( this.scope.find('#elInput_stream_custom_members') );
				ownerAC.removeAll();
				
				if( data['stream_ownership'] == 'custom' ){
					var names = data['stream_custom_members'].split(/\r?\n/).filter(Boolean);
					
					for( var i = 0; i < names.length; i++ ){
						ownerAC.addToken( names[ i ] );
					}
				}
			}
			
			// Tags
			if ( data['stream_tags'] !== undefined ){
				var tags = data['stream_tags'].split(/\r?\n/).filter(Boolean);
				var tagAC = ips.ui.autocomplete.getObj( this.scope.find('#elInput_stream_tags') );
				tagAC.removeAll();
				
				if( tags.length ){
					for( var i = 0; i < tags.length; i++ ){
						tagAC.addToken( tags[ i ] );
					}
				}
			}

			// Dates
			this.scope.find('[name="stream_date_relative_days"], [name="stream_date_range[start]"], [name="stream_date_range[end]"]').val('');
			
			if( data['stream_date_type'] == 'relative' ){
				this.scope.find('[name="stream_date_relative_days"]').val( data['stream_date_relative_days'] );
			} else if( data['stream_date_type'] == 'custom' ){
				
				if( data['stream_date_range']['start'] ){
					var startDateObj = new Date( data['stream_date_range']['start'] );
					this.scope.find('[name="stream_date_range[start]"]').get(0).valueAsDate = startDateObj;
				}
				
				if( data['stream_date_range']['end'] ){
					var endDateObj = new Date( data['stream_date_range']['end'] );
					this.scope.find('[name="stream_date_range[end]"]').get(0).valueAsDate = endDateObj;
				}
			}
			
			// Classes
			var classChecks = $('#elStreamContentTypes_menu').find('[type="checkbox"][name^="stream_classes"]');
			var classSelector = [];
			
			classChecks
				.prop('checked', false)
				.trigger('change')
				.closest('.ipsSideMenu_item')
					.removeClass('ipsSideMenu_itemActive');
			
			if( data['stream_classes_type'] == 0 ){
				this.scope.find('[name="stream_classes_type"]')
					.first()
					.closest('.ipsSideMenu_item')
						.addClass('ipsSideMenu_itemActive');
			} else {
				var classKeys = Object.keys( data['stream_classes'] );
				
				// It's inefficient to do a .find on each key separately here, but I simply could not
				// get jQuery to find matches when a combined selector was used. 
				// The backslashes really cause a problem.
				for (const val of classKeys) {
					self.scope.find( '[data-class="' + val.replace(/\\/g, '\\\\') + '"] input[type="checkbox"]' )
						.prop('checked', true)
						.trigger('change')
						.closest('.ipsSideMenu_item')
							.addClass('ipsSideMenu_itemActive');
				};
			}
			
			
			this._updateFilterOverview();
		},
		
		/**
		 * Stream container toggle
		 *
		 * @param 		{event} 	e 		Event
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		openStreamContainer: function (e, data) {
			e.preventDefault();
			
			var self = this;
			var link = $( e.currentTarget );
			var className = link.attr('data-class');
			var contentKey = link.attr('data-contentKey');
			var nodeContainer = link.next('.cStreamForm_nodes');
			
			if( !this._loadedContainer[ className ] ){
				// Show node container with loading text
				nodeContainer.slideDown();
				var containers = [];
				
				if ( typeof ips.getSetting('stream_config') === 'object' && ips.getSetting('stream_config') !== null && Object.keys( ips.getSetting('stream_config')['containers'] ).length !== 0 ) {
					var keys = Object.keys( ips.getSetting('stream_config')['containers'] );
					var values = Object.values( ips.getSetting('stream_config')['containers'] );
					
					for( var i = 0; i < keys.length; i++ ){
						containers.push( 'stream_containers[' + keys[i] + ']=' + values[i] );
					}	
				}

				// Load container
				ips.getAjax()( this.scope.find('form').attr('action').replace( 'do=create', '' ), {
						type: 'post',
						data: 'do=getContainerNodeElement&className=' + className + '&key=' + contentKey + '&' + containers.join('&')
					} )
					.done( function (returnedData) {
						// Add this content to the menu
						nodeContainer.html( returnedData.node );

						// Remember we've loaded it
						self._loadedContainer[ className ] = true;
	
						$( document ).trigger( 'contentChange', [ nodeContainer.parent() ] );
					});
			} else {
				nodeContainer.slideToggle();
			}
		},
		
		/**
		 * Stream clubs toggle
		 *
		 * @param 		{event} 	e 		Event
		 * @returns 	{void}
		 */
		openStreamClubs: function (e) {
			e.preventDefault();			
			
			var clubContainer = $('#elStreamClubs');
			if ( !this._loadedClubs ) {
				clubContainer.slideDown();
				this._loadClubs(null);
			} else {
				clubContainer.slideToggle();
			}
		},
		
		/**
		 * Stream clubs toggle
		 *
		 * @param 		{event} 	e 		Event
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		_loadClubs: function(callback) {
			if ( !this._loadedClubs ) {
				var clubContainer = $('#elStreamClubs');
				
				var extra = null;
				if ( (typeof ips.getSetting('stream_config') === "object" && ips.getSetting('stream_config') !== null ) ) {
					extra = '&stream_club_select=' + ips.getSetting('stream_config')['stream_club_select'] + '&stream_club_filter=' + ips.getSetting('stream_config')['stream_club_filter'];
				}
							
				var self = this;
				ips.getAjax()( this.scope.find('form').attr('action').replace( 'do=create', '' ), {
					type: 'post',
					data: 'do=getClubElement&' + extra
				} )
				.done( function (returnedData) {
					clubContainer.html( returnedData.field );
					self._loadedClubs = true;
					$( document ).trigger( 'contentChange', [ clubContainer.parent() ] );
					
					if ( callback ) {
						callback();
					}
				});
			} else if ( callback ) {
				callback();
			}
		},
		
		/**
		 * Event handler for menus being closed.
		 *
		 * @param 		{event} 	e 		Event
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		menuClosed: function (e, data = e.detail) {
			if ( data.elemID == 'elStreamContentTypes' || ( $('#' + data.elemID + '_menu' ).length && data.elemID != 'elSaveStream' ) ) {
				setTimeout( function( self )
				{
					self.checkFormUpdate();
					self.reloaded = true;
				}, 500, this );
			}
		},
		
		/**
		 * Check to see if any of the form elements have changed and if so, update listing
		 *
		 * @returns 	{void}
		 */
		checkFormUpdate: function() {
			if( this.hasFormChanged() ){
				this.updateResults();
				this.scope.find('#elSaveStream').removeClass('i-opacity_4');
				this.takeFormSnapshot();
			}
		},
		
		/**
		 * Has the form changed?
		 *
		 * @returns {boolean}
		 */
		 hasFormChanged: function() {
			const currentForm = ips.utils.form.serializeAsObject( this.scope.find('form'), this._serializeConfig );
			return JSON.stringify(this.formSnapshot) !== JSON.stringify(currentForm);
		},
		
		/**
		 * Take a form snapshot
		 *
		 * @returns {void}
		 */
		takeFormSnapshot: function() {
			this.formSnapshot = ips.utils.form.serializeAsObject( this.scope.find('form'), this._serializeConfig );
		},
		
		/**
		 * When tokens have changed in an autocomplete, mark the form as dirty
		 *
		 * @returns {void}
		 */
		tokensChanged: function () {
			this.reloaded = false;
		},

		/**
		 * Change the sort
		 *
		 * @returns {void}
		 */
		changeSort: function () {
			this.checkFormUpdate();
		},
		
		/**
		 * Prevents default event when a menu item is selected
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object}	data 	Event data object
		 * @returns {void}
		 */
		selectedMenuItem: function (e, data = e.detail) {
			if( data.originalEvent ){
				data.originalEvent.preventDefault();
			}			
		},
		
		/**
		 * Handles user selecting read status
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		selectedReadStatus: function (e, data = e.detail) {
			if( data.originalEvent ){
				// data.originalEvent.preventDefault();
			}
			
			this._changeReadStatus( data.selectedItemID );
		},
		
		/**
		 *  Toggles stuff when read status is changed
		 *
		 * @param 		{string} 	type 		Type (all/unread)
		 * @returns 	{void}
		 */
		_changeReadStatus: function( type ) {
			if( type == 'unread' ){
				/* Unread must be items only, the back-end does not have logic to filter out read comments from a stream of comments */
				this._formData['stream_include_comments'] = 0;
				this.scope.find('#stream_ownership_0').trigger('click');
				this.scope.find('#stream_ownership_1').prop('disabled', true);
			} else {
				this.scope.find('#stream_ownership_1').prop('disabled', false);
			}
		},
		
		/**
		 * Dismiss the save bar
		 *
		 * @param 	{Event} 	e 		Event object
		 * @returns {void}
		 */
		dismissSave: function (e) {
			this.scope.find('[data-role="saveButtonContainer"]').slideUp();
		},

		/**
		 * Save the form
		 * We add different params depending on what we're doing - save as new stream,
		 * save & update, or just update.
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitForm: function (e) {
			
			var button = $( e.currentTarget );
			var form = button.closest('form');

			// If we are creating a stream, we don't want to handle the form with JS
			if( this.scope.attr('data-formType') == 'createStream' ){
				return;	
			}

			// If we're creating a new stream, just submit the page
			if( button.attr('data-action') == 'newStream' ){
				
				form.prepend( 
					$('<input />')
						.attr('type', 'hidden')
						.attr('name', 'do')
						.attr('value', 'create') 
				);

			} else {
				this._formData = ips.utils.form.serializeAsObject( this.scope.find('form'), this._serializeConfig );

				// Send form data up
				this.trigger('formSubmitted.stream', {
					data: this._formData,
					action: ( button.attr('data-action') == 'newStream' ) ? 'createForm' : 'saveForm'
				});
			}
		},
		
		/**
		 * Update results
		 * Takes the value from the form and updates the result set
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		updateResults: function () {
			this._formData = ips.utils.form.serializeAsObject( this.scope.find('form'), this._serializeConfig );
			
			this._updateFilterOverview();
			
			this.trigger('formSubmitted.stream', {
				data: this._formData,
				action: 'updateForm'
			});
		},

		/**
		 * Handles user selecting 'date' as a filter. Shows the date fields in the form
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		selectedDate: function (e, data = e.detail) {
			this.reloaded = false;
			
			if( data.selectedItemID == 'custom' ){
				this.scope.find('[data-role="dateRelativeForm"]').slideUp();
				this.scope.find('[data-role="dateForm"]').slideDown();
			} else if( data.selectedItemID == 'relative' ){
				this.scope.find('[data-role="dateForm"]').slideUp();
				this.scope.find('[data-role="dateRelativeForm"]').slideDown();
				this.scope.find('[name="stream_date_relative_days"]').trigger('focus');
			} else {
				// Check undefined to prevent actioning when clicking on form fields
				if ( data.selectedItemID !== undefined ) {
					this.scope.find('[data-role="dateForm"]').slideUp();
					this.scope.find('[data-role="dateRelativeForm"]').slideUp();
					this.checkFormUpdate();
				}
			}
		},
		
		/**
		 * Handles user selecting 'follow status' as a filter.
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		selectedFollowStatus: function (e, data = e.detail) {
			
			// Get selected items
			var selectedItems = data.selectedItems;
			
			if (!selectedItems || Object.keys(selectedItems).length === 0) {
				this.scope.find('[name="stream_follow"]').val( 'all' );
			} else {
				this.scope.find('[name="stream_follow"]').val( 'followed' );
			}
			
			this.checkFormUpdate();
		},
		
		/**
		 * Handles user selecting 'ownership' as a filter. Shows the custom member field
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		selectedOwnership: function (e, data = e.detail) {
			if( data.selectedItemID == 'custom' ){
				this.scope.find('[data-role="ownershipMemberForm"]').slideDown();
			} else {
				// Check undefined to prevent actioning when clicking on form fields
				if ( data.selectedItemID !== undefined ) {
					this.scope.find('[data-role="ownershipMemberForm"]').slideUp();
					this.checkFormUpdate();
				}
			}
		},
		
		/**
		 * Handles changing the club selectionb
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		clubSelectionChanged: function () {
						
			if ( this.scope.find('[name="stream_club_filter_dummy_unlimited"]').is(':checked') ) {
				this.scope.find('[name="stream_club_select"]').val( 'all' );
			} else {
				this.scope.find('[name="stream_club_select"]').val( 'select' );
				this.scope.find('[name="stream_club_filter"]').val( $('#elSelect_stream_club_filter').val() );
			}

		},

		/**
		 * Responds to clicking a content type in the form. Ensures 'all' is selected
		 * if no other types are.
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		selectedType: function (e, data = e.detail) {
			var self = this;
			var typeMenu = this.scope.find('[data-filterType="type"]');
			var all = typeMenu.find('[data-ipsMenuValue="__all"]');
			var allButAll = typeMenu.find('[data-ipsMenuValue]:not( [data-ipsMenuValue="__all"] )');
			var allButAllChecks = allButAll.find('> input[type="checkbox"]');

			this.reloaded = false;
			
			if( data.selectedItemID == '__all' ){
				// Did the user click 'all'? If so, uncheck everything else and hide all content filters
				allButAll
					.removeClass('ipsSideMenu_itemActive')
					.find('> input[type="checkbox"]')
						.prop( 'checked', false );

				// Make sure 'all' is checked
				all.addClass('ipsSideMenu_itemActive');

				this.scope.find('input[type="radio"][name="stream_classes_type"][value="0"]').prop( 'checked', true );

				// Hide any content filters
				this.scope.find('[data-contentType]').closest('.cStreamForm_nodes').slideUp();

			} else {

				// If we have any checked items, uncheck 'all'
				if( allButAllChecks.filter(':checked').length ){
					all.removeClass('ipsSideMenu_itemActive')
					
					this.scope.find('input[type="radio"][name="stream_classes_type"][value="1"]').prop( 'checked', true );

					// If the selected types have extra filters, show those too
					allButAllChecks.filter(':checked').each( function () {
						var type = $( this ).closest('[data-ipsMenuValue]').attr('data-ipsMenuValue');

						if( self.scope.find('[data-contentType="' + type + '"]').length ){
							self.scope.find('[data-contentType="' + type + '"]').slideDown();
						}
					});

					// ...and hide any which aren't checked
					allButAllChecks.filter(':not( :checked )').each( function () {
						var type = $( this ).closest('[data-ipsMenuValue]').attr('data-ipsMenuValue');

						if( self.scope.find('[data-contentType="' + type + '"]').length ){
							self.scope.find('[data-contentType="' + type + '"]').slideUp();
						}
					})
				} else {
					// Nothing is checked now, so check 'all'
					all.addClass('ipsSideMenu_itemActive')
						.find('> input[type="checkbox"]')
							.prop( 'checked', true );

					this.scope.find('[data-contentType]').slideUp();
				}	
			}
		},

		/**
		 * A function which will be passed into the serializeAsObject function so that
		 * we can format dates consistently as YYYY-MM-DD. 
		 * MUST return a string.
		 *
		 * @param 		{string} 	name	Name of form field
		 * @param 		{string} 	value 	Value of form field as returned by jQuery's serializeArray()
		 * @returns 	{string}
		 */
		_serializeDate: function (name, value) {
			// If we're an HTML5 browser, dates are already in YYYY-MM-DD format, so we can return
			return value;
		}
	});
}(jQuery));