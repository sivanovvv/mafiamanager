/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.blocks.navigation.js
 *
 * Author: Esther Eisner
 */

;(function ($) {

    "use strict";

    ips.controller.register('cms.front.blocks.navigation', {

        initialize: function () {
            this.on( 'click', 'details', this.loadNavigationItems );
            let self = this;
            $.each(self.scope.find('details[open]'), function(){
                self.loadNavigationItems(null,this);
            });
        },

        loadNavigationItems: function (e, details=null) {
            if( details === null ){
                details = $( e.target ).parents( 'details:first' );
            }
            var itemContainer = $( details ).find( '> [data-role="containerItems"]' );
            var self = this;
            if( !itemContainer.html().trim().length ){
                ips.getAjax()( ips.getSetting( 'baseURL' ) + '?app=cms&module=pages&controller=ajax&do=loadItems',{
                    data: {
                        navType: $( self.scope ).attr( 'data-navType' ),
                        navId: $( self.scope ).attr( 'data-navId' ),
                        container: $( details ).data( 'container' )
                    }
                }).done( function(response){
                    $( itemContainer ).html( response );
                    if(ips.getSetting('currentRecordId') !== undefined){
                        $( itemContainer ).find('a[data-id="' + ips.getSetting('currentRecordId') + '"]')
                            .attr('aria-current', 'page');
                    }
                });
            }
        }

    });
}(jQuery));