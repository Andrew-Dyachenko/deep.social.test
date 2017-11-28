'use strict';

jQuery(document).ready(function () {
    jQuery('.attr__select').select2({
        minimumResultsForSearch: Infinity
    });
    jQuery('.attr__select--example').select2('open');
});