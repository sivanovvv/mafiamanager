ips.templates.set('templates.blocks.fieldTagList', "\
    <li>\
        <h4 class='i-color_hard i-font-weight_500 i-background_3 i-padding_2 i-flex i-align-items_center i-gap_2'><span>{{#lang}}content_block_template_fields_header{{/lang}}</span></h4>\
    </li>\
    {{{contents}}}\
");

ips.templates.set( 'templates.blocks.fieldTag', "\
    <li>\
        <button type='button' data-tagKey='{{key}}'>\
            <code class='language-ipsphtml'>{{key}}</code>\
            {{#title}}<div class='i-color_soft i-font-size_-2 i-margin-top_1'>{{title}}</div>{{/title}}\
        </button>\
    </li>\
");