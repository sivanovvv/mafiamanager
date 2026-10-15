/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.dates.js - Helper for date selection enhancements
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('calendar.front.submit.dates', {

		initialize: function () {
			this._hasFocusedEventEnd = false;

			this.on( 'click', '[data-action="updateTimezone"]', this.updateTimezone );

			// Monitor focus in recurring event input fields and select appropriate radio button
			this.on( 'focus', 'input[name="repeat_end_occurrences"]', function(){ $('#event_repeat_end_afterx').prop('checked', true); } );
			this.on( 'focus', 'input[name="repeat_end_date"]', function(){ $('#event_repeat_end_ondate').prop('checked', true); } );
			
			this.on( 'change', 'input, select', this.checkForSummaryChange );
			this.on( 'change', '#check_single_day, #check_all_day', this.toggleFields );
			this.on( 'change', '#check_no_end_time', this.toggleEndtimeFields );
			this.on( 'click', '#elRecurRemove', this.disableRecurring );
			this.on( 'change', 'input[name="event_dates[start_date]"]', this.setEndDateOnStartChange );
			this.on( 'change', '#event_end_date', this.setHasFocusedEventOnEndChange );

			this.on( 'click', '[data-action="updateRepeat"]', this.finishRepeat );

			this._checkAndSetEventEndState();
			this.evaluateRecurringOptions();

			this.setup();
		},

		/**
		 * On page load check to see what the current state of the end date is. If its set lets just go ahead and ignore any start date changes
		 *
		 * @returns 	{void}
		 */
		_checkAndSetEventEndState: function() {
			var eventEndDate = $("#event_end_date");
			var date = eventEndDate.val();

			if (!this._hasFocusedEventEnd && this._isValidEndDate(date)) {
				this._hasFocusedEventEnd = true;
			}
		},

		/**
		 * Is the date passed in a valid date?
		 *
		 * @param		{date} 		date 	Date to check
		 * @returns 	{boolean}
		 */
		_isValidEndDate: function(date) {

			var tempDate = new Date(date);

			if(!isNaN(tempDate.getDate())) {
				return true;
			}

			return false;
		},

		/**
		 * If the end field has changed from input go ahead and ignore any start date changes
		 *
		 * @returns 	{void}
		 */
		setHasFocusedEventOnEndChange: function() {
			this._hasFocusedEventEnd = true;

			this.evaluateRecurringOptions();
		},

		/**
		 * Event handler, handles changes to the start date
		 *
		 * @returns 	{void}
		 */
		setEndDateOnStartChange: function() {
			var isSameDay = $("#check_single_day").is(":checked");
			var eventStartDate = $('input[name="event_dates[start_date]');
			var eventEndDate = $("#event_end_date");

			if(!isSameDay && !this._hasFocusedEventEnd) {
				eventEndDate.val(eventStartDate.val());
			}
		},

		/**
		 * When an end date is set, adjust the available recurrence options
		 *
		 * @returns		{void}
		 */
		 evaluateRecurringOptions: function() {
			var startDate	= $("#event_start_date").val();
			var endDate		= $("#event_end_date").val();

			if (!this._isValidEndDate(endDate) || $('#check_single_day').prop('checked') ) {
				// If the summary isn't visible, make sure the checkbox row is
				if( !$('#elRepeatRow_shown').is(':visible') )
				{
					$('#elRepeatRow_hidden').show();
				}

				$('#elSelect_event_repeats').find('option').prop( 'disabled', false );

				if( $('#elRepeatOn_back').length )
				{
					$('#elRepeatOn_back').attr( 'id', 'elRepeatOn' );
				}

				if( $('#elSelect_event_repeats').val() == 'weekly' )
				{
					$('#elRepeatOn').show();
				}

				this._updateSummary();

				return;
			}

			startDate	= new Date( startDate );
			endDate		= new Date( endDate );

			var dayDifference = parseInt( ( endDate.getTime() - startDate.getTime() ) / ( 24 * 3600 * 1000 ) );

			var currentlySelected = $('#elSelect_event_repeats').val();

			// If the event spans more than one day, remove "daily" as a recurrence option and hide the "day of the week" options for monthly
			if( dayDifference > 1 ) {
				$('#elSelect_event_repeats').find('option[value="daily"]').prop( 'disabled', true );
				$('#elRepeatOn').hide();
				$('#elRepeatOn').attr( 'id', 'elRepeatOn_back' );

				if( !currentlySelected || currentlySelected == 'daily' )
				{
					$('#elSelect_event_repeats').find('option[value="daily"]').prop( 'selected', false );
					$('#elSelect_event_repeats').find('option[value="weekly"]').prop( 'selected', true );
					currentlySelected = 'weekly';
				}
			} else {
				$('#elSelect_event_repeats').find('option[value="daily"]').prop( 'disabled', false );

				if( $('#elRepeatOn_back').length )
				{
					$('#elRepeatOn_back').attr( 'id', 'elRepeatOn' );
				}

				if( $('#elSelect_event_repeats').val() == 'weekly' )
				{
					$('#elRepeatOn').show();
				}
			}

			// If the event spans more than one week, remove "daily" and "weekly" as recurrence options
			if( dayDifference > 7 ) {
				$('#elSelect_event_repeats').find('option[value="weekly"]').prop( 'disabled', true );

				if( !currentlySelected || currentlySelected == 'weekly' )
				{
					$('#elSelect_event_repeats').find('option[value="weekly"]').prop( 'selected', false );
					$('#elSelect_event_repeats').find('option[value="monthly"]').prop( 'selected', true );
					currentlySelected = 'monthly';
				}
			} else {
				$('#elSelect_event_repeats').find('option[value="weekly"]').prop( 'disabled', false );
			}

			// If the event spans more than one month, remove "daily", "weekly" and "monthly" recurrence options
			if(
				// If there's more than one month between the dates, then we block
				( endDate.getMonth() - startDate.getMonth() + ( 12 * ( endDate.getFullYear() - startDate.getFullYear() ) ) > 1 )
				||
				// Else if there is one month between the dates, then we check the end date is greater than the start date
				(
					endDate.getMonth() - startDate.getMonth() + ( 12 * ( endDate.getFullYear() - startDate.getFullYear() ) ) == 1 && endDate.getDate() > startDate.getDate()
				)
			 ) {
				$('#elSelect_event_repeats').find('option[value="monthly"]').prop( 'disabled', true );

				if( !currentlySelected || currentlySelected == 'monthly' )
				{
					$('#elSelect_event_repeats').find('option[value="monthly"]').prop( 'selected', false );
					$('#elSelect_event_repeats').find('option[value="yearly"]').prop( 'selected', true );
					currentlySelected = 'yearly';
				}
			} else {
				$('#elSelect_event_repeats').find('option[value="monthly"]').prop( 'disabled', false );
			}

			// If the event spans more than one year, remove ability for event to repeat entirely
			if( dayDifference > 365 )
			{
				$('#elSelect_event_repeats').find('option[value="yearly"]').prop( 'selected', false );
				this.disableRecurring();
				$('#elRepeatRow_hidden').hide();
			}
			else
			{
				$('#elRepeatRow_hidden').show();
			}

			// And update the summary in case anything changed
			this._updateSummary();
		 },

		/**
		 * Finish setting the options
		 *
		 * @returns 	{void}
		 */
		finishRepeat: function () {
			this._updateSummary();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			this._updateSummary();
			this.toggleFields();
			this.updateTimezone();
		},

		/**
		 * Toggle the end time enabled/disabled status
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		 toggleEndtimeFields: function(e) {
		 	if( this.scope.find('#check_no_end_time').is(':checked') )
		 	{
		 		this.scope.find('#end_time').prop('disabled', true);
		 	}
		 	else
		 	{
		 		this.scope.find('#end_time').prop('disabled', false);
		 	}
		 },

		/**
		 * Manual toggle functionality for the Single/All Day checkboxes
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		toggleFields: function (e) {
			this.toggleEndtimeFields();

			var singleDay = this.scope.find('#check_single_day');
			var allDay = this.scope.find('#check_all_day');
			var self = this;

			var toggles = {
				start_time_wrap: true,
				end_time_wrap: true,
				event_end_date_wrap: true,
				elDateGrid_arrow: true,
				elDateGrid_end: true,
				end_date_controls: true
			};

			// Single day, not all day
			if( singleDay.is(':checked') && !allDay.is(':checked') ){
				toggles.event_end_date_wrap = false;
			// Single day, all day
			} else if( singleDay.is(':checked') && allDay.is(':checked') ){
				toggles.elDateGrid_arrow = false;
				toggles.elDateGrid_end = false;
				toggles.start_time_wrap = false;
			// Multiple days, all day
			} else if( !singleDay.is(':checked') && allDay.is(':checked') ){
				toggles.start_time_wrap = false;
				toggles.end_time_wrap = false;
				toggles.end_date_controls = false;
			}
			// Multiple days, not all day
			else
			{
				toggles.end_date_controls = false;
				this.scope.find('#end_time').prop('disabled', false);
			}

			// Hide appropriate elements
			for (const [key, val] of Object.entries(toggles)) {
				self.scope.find( '#' + key ).toggle( val );
			};
		},

		/**
		 * Monitor changes to the repeat options and update the summary
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		checkForSummaryChange: function (e) {
			if( $( e.currentTarget ).attr('name').startsWith('event_dates[') ){
				this._updateSummary();
			}
		},

		/**
		 * Updates the timezone value both in the hidden field and in the display to the end user
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		updateTimezone: function (e) {
			// Update displayed timezone
			this.scope.find('[data-role="timezone_display"]').text( $('#event_timezone option:selected').data('abbreviated') );
		},

		/**
		 * Removes the Repeat summary and unchecks the Repeat checkbox
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		disableRecurring: function (e) {
			this._updateSummary();
		},

		/**
		 * Update the recurring string
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		_updateSummary: function () {
			var summary = this.scope.find('[data-role="recurringSummary"]');

			// Update repeating text
			if( this.scope.find('#elRepeatCb').is(':checked') ){
				summary.text( this._getSummary() );
				this.scope.find('#elRepeatRow_hidden').hide();
				this.scope.find('#elRepeatRow_shown').show();
			} else {
				summary.html( "<em class='i-color_soft'>" + ips.getString('doesnt_repeat') + "</em>" );
				this.scope.find('#elRepeatRow_hidden').show();
				this.scope.find('#elRepeatRow_shown').hide();
			}

			// Update the dates
			this.scope.find('[data-role="dateSummary"]').html( this._dateSummary() );
		},

		/**
		 * Builds a summary of the selected dates/times
		 *
		 * @returns 	{string}
		 */
		_dateSummary: function () {
			// Build start date
			var startDate = ips.utils.time.getDateFromInput( this.scope.find('input[name="event_dates[start_date]"]') );
			var singleDay = this.scope.find('#check_single_day');
			var allDay = this.scope.find('#check_all_day');

			// If there's no start time, then abandon showing any summary for now
			if( !ips.utils.time.isValidDateObj( startDate ) || startDate.getFullYear() < 1900 ) {
				return '';
			}		

			ips.utils.time.removeTimezone( startDate );

			var startDateString = ips.utils.time.localeDateString( startDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } );
			var startTime = this._getTime( this.scope.find('input[name="event_dates[start_time]"]').val() );
			var endTime = this._getTime( this.scope.find('input[name="event_dates[end_time]"]').val() );
			var endDate = ips.utils.time.getDateFromInput( this.scope.find('input[name="event_dates[end_date]"]') );
			var endDateString = '';

			// If we have a valid end date...
			if( !singleDay.is(':checked') && ips.utils.time.isValidDateObj( endDate ) ){
				ips.utils.time.removeTimezone( endDate );
				endDateString = ips.utils.time.localeDateString( endDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } );
			}

			// Now build strings
			var finalString = '';

			if( singleDay.is(':checked') && !allDay.is(':checked') ){
				if( this.scope.find('#check_no_end_time').is(':checked') )
				{
					finalString = ips.getString( 'single_not_allday_noendtime', { startDate: startDateString, startTime: startTime } );
				}
				else
				{
					finalString = ips.getString( 'single_not_allday', { startDate: startDateString, startTime: startTime, endTime: endTime } );
				}
			} else if ( ( !singleDay.is(':checked') && !allDay.is(':checked') ) && endDateString && startTime && endTime ) {
				finalString = ips.getString( 'not_single_not_allday', { startDate: startDateString, endDate: endDateString, startTime: startTime, endTime: endTime } );
			} else if( !singleDay.is(':checked') && allDay.is(':checked') && endDateString ) {
				finalString = ips.getString( 'not_single_allday', { startDate: startDateString, endDate: endDateString } );
			} else {
				finalString = ips.getString( 'single_allday', { startDate: startDateString } );
			}

			return finalString;
		},

		/**
		 * Returns the given time, or a placeholder string if empty
		 *
		 * @param 		{string} 	time 		Time string
		 * @returns 	{string}
		 */
		_getTime: function (time) {
			if( !time ){
				return "<em class='i-color_soft i-font-weight_normal i-opacity_4'>" + ips.getString('select_time') + "</em>";
			}

			var date = new Date('1970-01-01T' + time + 'Z');
			var time = date.toLocaleTimeString( $('html').attr('lang'), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' } );

			return time;
		},

		/**
		 * Returns the summary string for recurring events
		 *
		 * @returns 	{string}
		 */
		_getSummary: function () {
			var type = this.scope.find('#elSelect_event_repeats').val();
			var intervalString = '';
			var endString = '';

			// Build the 'interval' string
			switch( type ){
				case 'daily':
				case 'monthly':
				case 'yearly':
					intervalString = this._buildString( type );
				break;
				case 'weekly':
					intervalString = this._buildWeekly();
				break;
			}

			// Build the 'end after' string
			if( this.scope.find('#event_repeat_end_afterx').is(':checked') ){
				var occurrences = parseInt( this.scope.find('input[name="event_dates[repeat_end_occurrences]"]').val() );

				if( Number.isFinite( occurrences ) ){
					endString = ips.pluralize( ips.getString( 'x_times' ), occurrences );				
				}
			} else if( this.scope.find('#event_repeat_end_ondate').is(':checked') ){
				var dateObj = ips.utils.time.getDateFromInput( this.scope.find('input[name="event_dates[repeat_end_date]"]') );

				if( ips.utils.time.isValidDateObj( dateObj ) && dateObj.getFullYear() > 1900 ){ // > 1900 just so it doesn't start updating on year 19 etc.
					ips.utils.time.removeTimezone( dateObj );
					endString = ips.getString('until', { date: ips.utils.time.localeDateString( dateObj, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' } ) } );
				}
			}

			// Put it together
			if( endString ){
				return ips.getString( 'with_end', { interval: intervalString, endAfter: endString } );
			} else {
				return intervalString;
			}
		},

		/**
		 * Builds a summary string for daily, monthly and yearly repeats
		 *
		 * @param 		{string} 	type 	The type of repeat
		 * @returns 	{string}
		 */
		_buildString: function ( type ) {
			var val = parseInt( this.scope.find('#elSelect_event_repeat_freq').val() ) || 1;
			return ips.pluralize( ips.getString( 'every_x', { period: ips.pluralize( ips.getString( 'x_' + type ), val ) } ), val );
		},

		/**
		 * Builds a summary string for weekly repeats
		 *
		 * @returns 	{string}
		 */
		_buildWeekly: function () {
			var selectedDays = this.scope.find('[data-iCal]:checked');
			var val = parseInt( this.scope.find('#elSelect_event_repeat_freq').val() ) || 1;
			var weekString = '';

			weekString = ips.pluralize( ips.getString( 'x_weekly' ), val );

			// If no days are selected, we can bypass and finish now
			if( !selectedDays.length ){
				return weekString;
			}

			// Get full days
			var fullDays = Array.from(selectedDays).map(day => 
				ips.getString($(day).attr('data-iCal'))
			);

			// Build string
			var dayString = '';

			if( fullDays.length === 1 ){
				dayString = ips.getString( 'one_day', { first: fullDays[0] } );
			} else {
				dayString = ips.getString( 'multiple_day', { days: fullDays.slice(0, -1).join(', '), last: fullDays[ fullDays.length - 1 ] });
			}

			return ips.getString( 'week_string', { week: weekString, days: dayString } );
		}
	});
}(jQuery));