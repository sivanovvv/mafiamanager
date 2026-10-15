/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.browse.monthView.js - Month view controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('calendar.front.browse.monthView', {

		_emptyEvent: "<li class='cEvents_event cEvents_empty' data-eventid='0'><span></span></a></li>",

		initialize: function () {
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			this._alignEvents();
		},


		_alignEvents: function () {
			// Lets start by getting all active days in the current calendar
			var days = this.scope[0].querySelectorAll('.cCalendar_date');
			var currentPositions = [];
			var self = this;

			days.forEach( (dayEl) => {
				var day = $( dayEl );
				var weekStart = false;

				if( day.closest('td').is('tr > td:first-child') ){
					weekStart = true;
				}

				// Get events for this day
				var events = day.find('.cEvents_ranged [data-eventID]');

				// If there's no events, we can skip this day
				if( !events.length ){
					currentPositions = [];
					return;
				}

				// Build a wrapper into which we'll move our events
				var wrapper = $("<ul/>").addClass('cEvents');
				var spaces = 0;
				
				// Now we loop over currentPositions (from the previous day), and try and arrange today's events
				// in the same order
				if( currentPositions.length ){
					var doneEvent = false;

					for( var i = 0; i < currentPositions.length; i++ ){	
						if( events.filter('[data-eventID="' + currentPositions[i] + '"]').length ){
							wrapper.append( events.filter('[data-eventID="' + currentPositions[i] + '"]') );
							doneEvent = true;
						} else {

							// If this is the first day of the week, we won't bother adding spacers unless we've already done an event today
							// This prevents lots of unnecessary spacers carrying over from the previous row
							if( !weekStart || doneEvent ){
								wrapper.append( self._emptyEvent );
								spaces++;
							}
						}
					}
				}

				var remainingEvents = day.find('.cEvents_ranged [data-eventID]');

				// If we have any remaining events, and there's gaps available, we can move those events into the gaps rather than
				// just putting them at the end
				if( spaces && remainingEvents.length ){
					var availableSpaces = wrapper.find('[data-eventID="0"]');

					// If we have a space and an event, move the event into that space
					for( var i = 0; i <= spaces; i++ ){
						if( remainingEvents[ i ] && availableSpaces[ i ] ){
							$( availableSpaces[ i ] ).replaceWith( $( remainingEvents[ i ] ) );
						}
					}

					// Update remaining events again
					remainingEvents = day.find('.cEvents_ranged [data-eventID]');
				}

				// Add in remaining events
				wrapper.append( remainingEvents );

				// Replace the existing wrapper with the new, correctly-ordered one
				day.find('.cEvents_ranged > .cEvents').replaceWith( wrapper );

				// Now we need to build a new currentPositions array for this day, so that the following
				// day can use it to do its thing
				currentPositions = [];

				const rangedEvents = dayEl.querySelectorAll('.cEvents_ranged [data-eventID]');

				rangedEvents.forEach( (event) => {
					var eventID = parseInt( event.getAttribute('data-eventID') );

					if( eventID === 0 ){
						currentPositions.push('-');
					} else if( Number.isFinite(eventID) ){
						currentPositions.push( eventID );
					}
				});
			});
		}
	});
}(jQuery));