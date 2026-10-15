<?php

/**
 * @brief		WorkflowAction Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @subpackage	Pages
 * @since		28 Dec 2025
 */

namespace IPS\cms\extensions\cloud\WorkflowAction;


/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\cloud\Workflow\WorkflowActionAbstract;
use IPS\cms\Categories;
use IPS\cms\Fields;
use IPS\Content\Item;
use IPS\Db;
use IPS\Helpers\Form;
use IPS\Helpers\Form\Select;
use IPS\Member;
use IPS\Node\Model;
use UnderflowException;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * WorkflowAction Extension
 */
class FieldValue extends WorkflowActionAbstract
{
	/**
	 * @brief	Language string for the name of this action
	 */
	public static string $title = 'action__FieldValue';

	/**
	 * @brief	Language string for description of this action
	 */
	public static string $description = 'action__FieldValue_desc';

	/**
	 * Is this action available for this node?
	 *
	 * @param Model|string $node
	 * @return bool
	 */
	public static function isAvailableFor( Model|string $node ) : bool
	{
		if( !is_subclass_of( $node, Categories::class ) )
		{
			return false;
		}

		return parent::isAvailableFor( $node );
	}

	/**
	 * Return a description to easily identify the configuration of this action
	 *
	 * @return string
	 */
	public function blurb() : string
	{
		if( !isset( $this->data['field'] ) )
		{
			return '';
		}

		try
		{
			$row = Db::i()->select( '*', 'cms_database_fields', [ 'field_id=?', $this->data['field'] ] )->first();

			/* @var Fields $fieldClass */
			$fieldClass = 'IPS\cms\Fields' . $row['field_database_id'];
			$field = $fieldClass::constructFromData( $row );

			return Member::loggedIn()->language()->addToStack( 'action__FieldValue_blurb', true, [
				'htmlsprintf' => [ $field->_title, $field->displayValue( $this->data['field_' . $field->_id ] ) ]
			]);
		}
		catch( UnderflowException ){}

		return '';
	}

	/**
	 * Build the ACP form for adding this action to a workflow
	 *
	 * @param Form $form
	 * @return void
	 */
	public function form( Form $form ): void
	{
		$options = [];
		$toggles = [];
		$toggleFields = [];
		foreach( $this->workflow->nodeClasses() as $nodeClass )
		{
			/* @var Model $nodeClass */
			$databaseId = mb_substr( $nodeClass, mb_strlen( 'IPS\cms\Categories' ) );

			/* @var Fields $fieldClass */
			$fieldClass = 'IPS\cms\Fields' . $databaseId;
			foreach( $fieldClass::roots( null ) as $field )
			{
				$options[ $field->_id ] = $field->_title;
				$toggles[ $field->_id ] = ['content_field_' . $field->_id ];
				$toggleFields[] = $field->buildHelper( $this->data['field_' . $field->_id ] ?? null );
			}
		}

		if( count( $options ) )
		{
			$form->add( new Select( 'record_field', $this->data['field'] ?? null, true, [
				'options' => $options,
				'toggles' => $toggles
			] ) );
		}

		foreach( $toggleFields as $formField )
		{
			/* If the field toggles other fields, we want to remove that from this particular screen.
			We only want to work with one field at a time here. */
			if( $options = $formField->options )
			{
				foreach( [ 'toggles', 'togglesOn', 'togglesOff' ] as $opt )
				{
					if( isset( $options[ $opt ] ) )
					{
						$options[ $opt ] = null;
					}
				}
				$formField->options = $options;
			}

			$form->add( $formField );
		}
	}

	/**
	 * Format the values for storage when the ACP form is saved
	 *
	 * @param array $values
	 * @return array
	 */
	public function formatFormValues( array $values ): array
	{
		$return = [
			'field' => $values['record_field']
		];

		if( array_key_exists( 'content_field_' . $values['record_field'], $values ) )
		{
			$return['field_' . $values['record_field'] ] = $values['content_field_' . $values['record_field'] ];
		}

		return $return;
	}

	/**
	 * Run the action
	 *
	 * @param Item $item
	 * @param array $values The values submitted if there is a dialog displayed before execution
	 * @return void
	 */
	public function run( Item $item, array $values ): void
	{
		if( !isset( $this->data['field'] ) )
		{
			return;
		}

		$newFieldValue = $this->data['field_' . $this->data['field'] ];
		$column = 'field_' . $this->data['field'];
		$item->$column = is_array( $newFieldValue ) ? implode( ",", $newFieldValue ) : $newFieldValue;
		$item->save();
	}
}
