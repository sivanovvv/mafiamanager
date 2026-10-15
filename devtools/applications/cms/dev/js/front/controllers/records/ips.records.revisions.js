/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.databases.revisions.js
 *
 * Author: Brandon Farber
 */
;( function($){
	"use strict";

	ips.controller.register('cms.front.records.revisions', {
		initialize: function () {
			var self = this;

			ips.loader.getStatic( ['applications/core/interface/static/codemirror/diff_match_patch.js','applications/core/interface/static/codemirror/codemirror.js'] ).then( function () {
				self._initCodeMirror();
			});
		},
		
		/**
		 * Initializes CodeMirror on a textarea with the provided key
		 *
		 * @returns {void}
		 */
		_initCodeMirror: function () {
			var self = this;
			var count = 0;

			for (const elem of self.scope.find("[data-key]").toArray()){
				if( $(elem).attr('data-method') == 'merge' )
				{
					CodeMirror.MergeView( document.getElementById( $(elem).identify().attr('id') ), {
						value: self.scope.find( '[data-current="' + $(elem).attr('data-key') + '"]' ).val(),
						origLeft: self.scope.find( '[data-original="' + $(elem).attr('data-key') + '"]' ).val(),
						lineWrapping: true,
						lineNumbers: false,
						mode: 'htmlmixed',
						revertButtons: false
					} );
				}
				else if( $(elem).attr('data-complete') === undefined )
				{
					var diff			= new diff_match_patch();
					var differences		= diff.diff_main( self.scope.find( '[data-original="' + $(elem).attr('data-key') + '"]' ).html(), self.scope.find( '[data-current="' + $(elem).attr('data-key') + '"]' ).html() );
					var currentDiff		= diff.diff_prettyHtml(differences);

					self.scope.find( '[data-current="' + $(elem).attr('data-key') + '"]' ).html( currentDiff );

					$(elem).attr( 'data-complete', 1 );
				}
			};
		}
	});
}(jQuery));