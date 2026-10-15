/**
 * @brief        ips.core.tags
 * @author        <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright    (c) Invision Power Services, Inc.
 * @license        https://www.invisioncommunity.com/legal/standards/
 * @package        Invision Community
 * @subpackage
 * @since        3/4/2025
 */

;(function ($) {

    "use strict";

    ips.controller.register('core.admin.core.tags',
        {
            initialize: function () {
                this.on( 'submit', this.submitForm );
            },

            submitForm: function(e){
                if( $( e.currentTarget ).attr('data-bypassValidation') ){
                    return true;
                }

                e.preventDefault();
                e.stopPropagation();

                ips.ui.alert.show({
                    type: 'confirm',
                    subText: ips.getString( 'tag_delete_confirm_detail' ),
                    icon: 'fa-solid fa-triangle-exclamation',
                    callbacks: {
                        ok: function () {
                            $( e.currentTarget ).attr('data-bypassValidation', true);
                            $( e.currentTarget ).trigger('submit');
                        },
                        cancel: function () {
                            return false;
                        }
                    }
                });
            }
        });
}(jQuery));