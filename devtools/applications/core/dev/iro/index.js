import iro from "@jaames/iro";
import Color from "colorjs.io"

(function($) {
    window.ips.createModule('ips.utils.iro', function () {
        window.dispatchEvent(new CustomEvent('ips:iroLoaded'));
        return {
            ...iro,
            ColorPicker: iro.ColorPicker,
            colorPackage: Color
        };
    });
})(window.jQuery);