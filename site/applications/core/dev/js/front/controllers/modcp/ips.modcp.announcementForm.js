/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://invisioncommunity.com
 *
 * ips.modcp.announcementForm.js - Controller for the announcement add/edit form
 *
 * Author: Stuart Silvester
 */
;( function($){
    "use strict";

    ips.controller.register('core.front.modcp.announcementForm', {

        _lastValue: '',
        _textField: null,
        _timer: 0,

        initialize: function () {

            this._textField = $('#elInput_announce_url');
			this.on( 'blur', '#elInput_announce_url', this.fieldKeyUp );
        },

        fieldKeyUp: function() {
			// Reset timer
			clearTimeout( this._timer );
			this._timer = setTimeout( this._checkPermissions.bind(this), 700 );
        },

        _checkPermissions: function () {
            var value = this._textField.val().trim();

            // Must have more than 3 characters
            if( value.length < 3 )
            {
                return;
            }


            ips.getAjax()('?app=core&module=system&controller=announcement&do=permissionCheck', {
                dataType: 'json',
                data: {
                    url:  value
                }
            }).done( function (response) {

                // Remove any current warning if the latest response doesn't have one
                if( response.html === undefined && $('#elAnnouncementGroupWarning').length )
                {
					$('#elAnnouncementGroupWarning').remove();
                }

                // Replace existing, or create warning
                if( $('#elAnnouncementGroupWarning').length )
                {
                    $('#elAnnouncementGroupWarning').replaceWith( response.html );
                }
                else
                {
                    $( response.html ).insertAfter( '#elInput_announce_url' );
                }
            }).fail( function (err) {
				// fail gets called when it's aborted, so deliberately do nothing here
			});
        }

    });
}(jQuery));
