;( function(){
	"use strict";

	ips.createModule('ips.ui.readmore', function(){

		let respond = function(elem){
			let el = elem[0];
			let content = el.querySelector('.iReadMore__content--js');
			Debug.log(content);
		}

		ips.ui.registerWidget( 'readmore', ips.ui.readmore,
			['expandText']
		);

		return{
			respond: respond
		};

	});
}());