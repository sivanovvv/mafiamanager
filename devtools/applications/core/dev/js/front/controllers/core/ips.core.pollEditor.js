/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.pollEditor.js - Controller for follow button
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.pollEditor', {

		initialize: function () {
			this.on( 'click', '[data-action="removeChoice"]', this.removeChoice );
			this.on( 'click', '[data-action="addChoice"]', this.addChoice );
			this.on( 'click', '[data-action="addQuestion"]', this.addQuestion );
			this.on( 'click', '[data-action="removeQuestion"]', this.removeQuestion );

			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			this._maxQuestions = this.scope.attr('data-maxQuestions');
			this._maxChoices = this.scope.attr('data-maxChoices');
			this._name = this.scope.attr('data-pollName');

			var pollData = ips.getSetting('pollData');

			// Build the existing options
			if( Array.isArray( pollData ) && pollData.length ){
				for( var i = 0; i < pollData.length; i++ ){
					this._buildQuestion( pollData[ i ], i + 1 );
				}
			} else if ( typeof pollData === 'object' && pollData !== null && Object.keys( pollData ).length !== 0 ) {
				for( var i in pollData ){
					this._buildQuestion( pollData[ i ], i );
				}
			} else {
				this._addQuestion( 1 );
				this._checkQuestionButton();
				this._checkChoiceButton( this.scope.find('[data-questionID="1"]') );
			}
		},

		/**
		 * Event handler for the Add Question button
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		addQuestion: function (e) {
			e.preventDefault();

			// Get maximum question ID
			var maxQid = Array.from(this.scope.find('[data-questionID]')).reduce(function (max, item) {
				return parseInt($(item).attr('data-questionID')) > parseInt($(max).attr('data-questionID')) 
					? item 
					: max;
			});

			maxQid = parseInt( $( maxQid ).attr('data-questionID') );

			if( !Number.isFinite( maxQid ) ){
				maxQid = 0;
			}

			var questions = this.scope.find('[data-questionID]');
			if( questions.length >= this._maxQuestions ){
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.getString('noMoreQuestionsMlord'),
					callbacks: {
						ok: $.noop
					}
				});

				return;
			}

			this._addQuestion( maxQid + 1 );

			ips.utils.anim.go( 'fadeIn', this.scope.find('[data-questionID="' + ( maxQid + 1 ) + '"]') );

			this._checkQuestionButton();
		},

		/**
		 * Event handler for the Remove Question button
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		removeQuestion: function (e) {
			e.preventDefault();
			var self = this;
			var question = $( e.currentTarget ).closest('[data-questionid]');
			var removeQuestion = function () {
				question.remove();
				self._checkQuestionButton();
			};

			if( question.find('[data-role="questionTitle"]').val() !== '' ){
				ips.ui.alert.show( {
					type: 'confirm',
					icon: 'question',
					message: ips.getString('removeQuestionConfirm'),
					callbacks: {
						ok: removeQuestion
					}
				});	
			} else {
				removeQuestion();
			}			
		},

		/**
		 * Event handler for adding a new choice to a question
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		addChoice: function (e) {
			e.preventDefault();

			var question = $( e.currentTarget ).closest('[data-questionID]');

			// How many choices?
			var choiceItems = question.find('[data-choiceID]');
			var maxCidElem = Array.from(choiceItems).reduce(function (max, item) {
				return parseInt($(item).attr('data-choiceID')) > parseInt($(max).attr('data-choiceID'))
					? item
					: max;
			}, choiceItems[0]);

			var maxCid = parseInt($(maxCidElem).attr('data-choiceID'));


			if( !Number.isFinite( maxCid ) ){
				maxCid = 0;
			}

			if( maxCid >= this._maxChoices ){
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.getString('noMoreChoices'),
					callbacks: {
						ok: $.noop
					}
				});

				return;
			}

			this._addChoice( question, maxCid + 1 );

			ips.utils.anim.go( 'fadeIn', question.find('[data-choiceID="' + ( maxCid + 1 ) + '"]') );

			this._checkChoiceButton( question );
		},

		/**
		 * Event handler for removing a choice
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		removeChoice: function (e) {
			e.preventDefault();

			var self = this;
			var choice = $( e.currentTarget ).closest('[data-choiceID]');
			var question = choice.closest( '[data-questionID]' );

			// Check this isn't the only choice left
			if( question.find('[data-choiceID]').length <= 2 ){
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.getString('cantRemoveOnlyChoice'),
					callbacks: {
						ok: $.noop
					}
				});

				return;
			}

			// Animation complete handler to remove the choice
			choice.animationComplete( function () {
				choice.remove();

				// Need to readjust all the choice numbers for this question
				for (const [idx, item] of question.find('[data-choiceID]').toArray().entries()){
					$( item )
						.attr( 'data-choiceID', idx + 1 )
						.find('[data-role="choiceNumber"]')
							.text( idx + 1 );
				};

				self._checkChoiceButton( question );
			});

			ips.utils.anim.go( 'fadeOut fast', choice );
		},

		/**
		 * Builds a question based on existing data
		 *
		 * @param 		{object} 	data 		Data object containing title, multiple choice, etc
		 * @param 		{number} 	qid 		Question ID
		 * @returns 	{void}
		 */
		_buildQuestion: function (data, qid) {
			var choices = [];

			if( Array.isArray( data.choices ) && data.choices.length ){
				for( var i = 0; i < data.choices.length; i++ ){
					choices.push( this._getChoiceHTML( i + 1, qid, data.choices[ i ].title ) );
				}
			} else if (typeof data.choices === 'object' && data.choices !== null) {
				for( var i in data.choices ){
					choices.push( this._getChoiceHTML( i, qid, data.choices[ i ].title ) );
				}
			}

			this.scope.find('[data-role="pollContainer"]').append( ips.templates.render('core.pollEditor.question', {
				pollName: this._name,
				multiChoice: data.multiChoice,
				questionID: qid,
				question: data.title,
				choices: choices.join(''),
				removeQuestion: !( qid === 1 )
			}));
		},

		/**
		 * Adds an empty question block to the form
		 *
		 * @param 		{object} 	data 		Message data
		 * @returns 	{void}
		 */
		_addQuestion: function (qid) {
			var choices = [];

			choices.push( this._getChoiceHTML( 1, qid ) );
			choices.push( this._getChoiceHTML( 2, qid ) );

			this.scope.find('[data-role="pollContainer"]').append( ips.templates.render('core.pollEditor.question', {
				pollName: this._name,
				questionTitle: ips.getString( 'questionTitle', { id: qid } ),
				questionID: qid,
				choices: choices.join(''),
				removeQuestion: !( qid === 1 )
			}));
		},

		/**
		 * Adds a new choice to the given question
		 *
		 * @param 		{element} 	question 		Question block we're adding to
		 * @param 		{number} 	cid 			ID of new choice
		 * @returns 	{void}
		 */
		_addChoice: function (question, cid) {
			var html = this._getChoiceHTML( cid, question.attr('data-questionID'), '' );
			question.find('[data-role="choices"]').append( html );
		},

		/**
		 * Returns the HTML for a choice row
		 *
		 * @param 		{object} 	data 		Message data
		 * @returns 	{void}
		 */
		_getChoiceHTML: function (cid, qid, name) {
			return ips.templates.render('core.pollEditor.choice', {
				choiceID: cid,
				questionID: qid,
				pollName: this._name,
				choiceTitle: name
			});
		},

		/**
		 * Enables or disables the Add Question button depending on current number of questions
		 *
		 * @returns 	{void}
		 */
		_checkQuestionButton: function () {
			var questions = this.scope.find('[data-questionID]');
			this.scope.find('[data-action="addQuestion"]').toggleClass( 'ipsButton--disabled', ( questions.length >= this._maxQuestions ) );
		},

		/**
		 * Enables or disables the Add Choice button depending on current number of choices in the given question
		 *
		 * @param 		{element} 	questionScope 		The question being worked with
		 * @returns 	{void}
		 */
		_checkChoiceButton: function (questionScope) {
			var choices = questionScope.find('[data-choiceID]');

			questionScope.find('[data-action="addChoice"]').toggleClass( 'ipsButton--disabled', ( choices.length >= this._maxChoices ) );
			questionScope.find('[data-choiceID] [data-action="removeChoice"]').toggleClass( 'ipsButton--disabled', ( choices.length === 2 ) );
		}
	});
}(jQuery));