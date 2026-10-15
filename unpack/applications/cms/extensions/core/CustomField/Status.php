<?php
/**
 * @brief		Custom Field Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @subpackage	Pages
 * @since		10 Dec 2025
 */

namespace IPS\cms\extensions\core\CustomField;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\cms\Fields;
use IPS\CustomField;
use IPS\Dispatcher;
use IPS\Extensions\CustomFieldAbstract;
use IPS\Helpers\Form;
use IPS\Helpers\Form\Select as FormSelect;
use IPS\Helpers\Form\Stack;
use IPS\Theme;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * CustomField Extension
 */
class Status extends CustomFieldAbstract
{
	/**
	 * The value that will be used for the "field type"
	 * This must be unique
	 *
	 * @return string
	 */
	public static function fieldType() : string
	{
	    return 'Status';
	}

	/**
	 * Language string for the title of the field type.
	 * Will be displayed in the "Field Type" dropdown list when
	 * creating a custom field
	 *
	 * @return string
	 */
	public static function fieldTypeTitle() : string
	{
	    return 'pf_type_Status';
	}

	/**
	 * The class that should be called to render the field
	 * in a form. This class should extend FormAbstract (or an existing field)
	 * @see CustomField::buildHelper()
	 *
	 * @return string
	 */
	public static function formClass() : string
	{
	    return FormSelect::class;
	}

	/**
	 * Can be overridden by individual extension implementations
	 * to allow for a field to be available only in certain connditions
	 *
	 * @return bool
	 */
	public static function isEnabled() : bool
	{
		/* We only want this available in Pages */
		if( Dispatcher::checkLocation( 'admin' ) and !Dispatcher::checkLocation( 'admin', 'cms' ) and !Dispatcher::checkLocation( 'admin', 'cloud', 'workflow' ) )
		{
			return false;
		}

		return true;
	}

	/**
	 * Determines whether this field can be used in search/filter forms
	 *
	 * @return bool
	 */
	public static function isSearchable() : bool
	{
		return true;
	}

	/**
	 * A list of form elements that will be toggled on when this field
	 * type is selected
	 * @see CustomField::$additionalFieldToggles
	 *
	 * @return array
	 */
	public static function fieldTypeToggles() : array
	{
		return [
			'field_status_options', 'field_is_multiple', 'field_display_listing', 'field_display_display', 'field_status_listing_layout', 'field_status_display_layout'
		];
	}

	/**
	 * Add fields to the field creation form
	 *
	 * @param Form $form
	 * @param CustomField	$field	The field currently being modified
	 * @return void
	 */
	public static function form( Form $form, CustomField $field ) : void
	{
		/* Reformat so we can preserve the value */
		if( $extra = $field->extra and $field->type != 'Status' )
		{
			$options = [];
			foreach( $extra as $k => $v )
			{
				$options[] = [ 'key' => $k, 'value' => $v, 'color' => null ];
			}
		}

		$formField = new Stack( 'field_status_options', $options ?? $field->extra, true, [
			'stackFieldType' => \IPS\cms\Fields\Status::class,
			'minItems' => 2
		], id: 'field_status_options' );
		$formField->rowClasses[] = 'ipsFieldRow--fullWidth';
		$form->add( $formField, 'field_extra', 'field_generaloptions' );

		$form->add( new Form\Radio( 'field_status_listing_layout', $field->display_json['listing']['method'] ?? 'none', true, [
			'options' => [
				'none' => 'field_status_layout_none',
				'simple' => 'field_status_layout_simple',
				'custom' => 'field_status_layout_custom'
			],
			'toggles' => [
				'custom' => array( 'field_display_listing_template_id', 'field_display_listing_template_use_how', 'field_display_listing_save_template', 'field_display_listing_json_custom' )
			]
		], id: 'field_status_listing_layout' ), 'field_display_listing', 'field_displayoptions' );

		$form->add( new Form\Radio( 'field_status_display_layout', $field->display_json['display']['method'] ?? 'none', true, [
			'options' => [
				'none' => 'field_status_layout_none',
				'simple' => 'field_status_layout_simple',
				'custom' => 'field_status_layout_custom'
			],
			'toggles' => [
				'custom' => array( 'field_display_display_template_id', 'field_display_display_template_use_how', 'field_display_display_save_template', 'field_display_display_json_custom' )
			]
		], id: 'field_status_display_layout' ), 'field_display_display', 'field_displayoptions' );
	}

	/**
	 * Process values from the ACP Custom Field form
	 *
	 * @param array $values
	 * @return array
	 */
	public static function formatFormValues( array $values ) : array
	{
		if( $values['field_type'] == static::fieldType() )
		{
			$values['field_extra'] = $values['field_status_options'];
			$values['field_display_display_json_badge'] = $values['field_status_display_layout'];
			$values['field_display_listing_json_badge'] = $values['field_status_listing_layout'];
		}

		if( array_key_exists( 'field_status_options', $values ) )
		{
			unset( $values['field_status_options'] );
			unset( $values['field_status_display_layout'] );
			unset( $values['field_status_listing_layout'] );
		}

		return $values;
	}

	/**
	 * Return any options that will be passed to the Form Element
	 *
	 * @param CustomField $field
	 * @param int $flags
	 * @return array
	 */
	public static function formHelperOptions( CustomField $field, int $flags=0 ) : array
	{
		$options = [
			'options' => []
		];
		foreach( $field->extra as $opt )
		{
			$options['options'][ $opt['key'] ] = $opt['value'];
		}

		if( $field->is_multiple )
		{
			$options['multiple'] = true;
		}

		if( $field instanceof Fields and $flags & $field::FIELD_DISPLAY_FILTERS )
		{
			$options['multiple'] = true;
			$options['noDefault'] = true;
		}

		return $options;
	}

	/**
	 * Display Value
	 * @see CustomField::displayValue()
	 *
	 * @param CustomField $field
	 * @param mixed|null $value The value
	 * @param bool $showSensitiveInformation If TRUE, potentially sensitive data (like passwords) will be displayed - otherwise will be blanked out
	 * @param string|null $separator Used to separate items when displaying a field with multiple values.
	 * @return string|null
	 */
	public static function displayValue( CustomField $field, mixed $value=NULL, bool $showSensitiveInformation=FALSE, string $separator=NULL ): ?string
	{
		$value = $field->is_multiple ? explode( $separator ?? ',', $value ) : [ $value ];
		$return = '';
		foreach( $field->extra as $opt )
		{
			if( in_array( $opt['key'], $value ) )
			{
				$return .= Theme::i()->getTemplate( 'records', 'cms', 'global' )->fieldStatus( $opt['value'], $opt['color'] );
			}
		}

	    return $return ?: implode( $separator ?? ',', $value );
	}
}