/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.support.multimod.js - Controller for moderation actions for the attachments list
 *
 * Author: Daniel Fatkic
 */
;( function($){
    "use strict";

    ips.controller.register('ips.admin.files.multimod', {

        initialize: function () {
            this.on( 'submit', '[data-role="moderationTools"]', this.moderationSubmit );
        },

        /**
         * Event handler called when the moderation bar submits
         *
         * @param	{event} 	e 		Event object
         * @returns {void}
         */
        moderationSubmit: function (e) {
            var action = this.scope.find('[data-role="moderationAction"]').val();

            switch (action) {
                case 'delete':
                    this._modActionDelete(e);
                    break;
                default:
                    $( document ).trigger('moderationSubmitted');
                    break;
            }
        },

        /**
         * Handles a delete action from the moderation bar
         *
         * @param	{event} 	e 		Event object
         * @returns {void}
         */
        _modActionDelete: function (e) {
            var self = this;

            if( self._bypassDeleteCheck ){
                return;
            }

            e.preventDefault();

            // How many are we deleting?
            var count = parseInt( this.scope.find('[data-role="moderation"]:checked').length );

            ips.ui.alert.show( {
                type: 'confirm',
                icon: 'warn',
                message: ( count > 1 ) ? ips.pluralize( ips.getString( 'delete_confirm_many' ), count ) : ips.getString('delete_confirm'),
                callbacks: {
                    ok: function () {
                        $( document ).trigger('moderationSubmitted');
                        self._bypassDeleteCheck = true;
                        self.scope.find('[data-role="moderationTools"]').trigger('submit');
                    }
                }
            });
        }
    });
}(jQuery));