<?php

/**
 * @brief		WorkflowCriteria Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @subpackage	Pages
 * @since		28 Dec 2025
 */

namespace IPS\cms\extensions\cloud\WorkflowCriteria;


/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\cloud\Workflow\WorkflowCriteriaAbstract;
use IPS\cms\Categories;
use IPS\cms\Fields;
use IPS\Content\Item;
use IPS\Db;
use IPS\Helpers\Form;
use IPS\Helpers\Form\CheckboxSet;
use IPS\Helpers\Form\Radio;
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
 * WorkflowCriteria Extension
 */
class FieldValue extends WorkflowCriteriaAbstract
{
	/**
	 * @brief	Language string for the name of this criteria type
	 */
	public static string $title = 'criteria__FieldValue';

	/**
	 * @brief	Language string for description of this criteria type
	 */
	public static string $description = 'criteria__FieldValue_desc';

	/**
	 * Is this criteria type available for this node?
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

		/* Make sure we have at least one field available */
		$fieldCount = (int) Db::i()->select( 'count(*)', 'cms_database_fields', [
			[ 'field_database_id=?', $node::$customDatabaseId ],
			[ Db::i()->in( 'field_type', [ 'Select', 'CheckboxSet', 'YesNo', 'Status', 'Radio', 'Checkbox' ] ) ]
		] )->first();
		if( !$fieldCount )
		{
			return false;
		}

		return parent::isAvailableFor( $node );
	}

	/**
	 * Return a description to easily identify the configuration of this rule
	 *
	 * @return string
	 */
	public function blurb() : string
	{
		if( empty( $this->data['field'] ) )
		{
			return '';
		}

		try
		{
			$row = Db::i()->select( '*', 'cms_database_fields', [ 'field_id=?', $this->data['field'] ] )->first();

			/* @var Fields $fieldClass */
			$fieldClass = 'IPS\cms\Fields' . $row['field_database_id'];
			$field = $fieldClass::constructFromData( $row );

			if( empty( $this->data['field_' . $field->_id ] ) )
			{
				$selection[] = Member::loggedIn()->language()->get( 'criteria__FieldValue_empty' );
			}
			elseif( is_array( $this->data['field_' . $field->_id ] ) )
			{
				$selection = [];
				foreach( $field->extra as $k => $v )
				{
					if( $field->type == 'Status' )
					{
						if( in_array( $v['key'], $this->data['field_' . $field->_id ] ) )
						{
							$selection[] = $v['value'];
						}
					}
					else
					{
						if( in_array( $k, $this->data['field_' . $field->_id ] ) )
						{
							$selection[] = $v;
						}
					}
				}
			}
			else
			{
				$selection[] = Member::loggedIn()->language()->get( $this->data['field_' . $field->_id ] ? 'yes' : 'no' );
			}

			return Member::loggedIn()->language()->addToStack( 'criteria__FieldValue_blurb', true, [
				'sprintf' => [ $field->_title, implode( " " . Member::loggedIn()->language()->get( 'or' ) . " ", $selection ) ]
			]);
		}
		catch( UnderflowException ){}

		return '';
	}

	/**
	 * Build the form for adding/editing this criteria type to a workflow
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
				switch( $field->type )
				{
					case 'Select':
					case 'CheckboxSet':
					case 'Radio':
						$options[ $field->_id ] = $field->_title;
						$toggles[ $field->_id ] = ['content_field_' . $field->_id ];
						$toggleFields[] = new CheckboxSet( 'content_field_' . $field->_id, $this->data[ 'field_' . $field->_id ] ?? null, false,[
								'options' => $field->extra,
								'noDefault' => true
							], id: 'content_field_' . $field->_id );
						break;

					case 'Status':
						$options[ $field->_id ] = $field->_title;
						$toggles[ $field->_id ] = ['content_field_' . $field->_id ];
						$checkboxes = [];
						foreach( $field->extra as $_opt )
						{
							$checkboxes[ $_opt['key'] ] = $_opt['value'];
						}

						$toggleFields[] = new CheckboxSet( 'content_field_' . $field->_id, $this->data[ 'field_' . $field->_id ] ?? null, false,[
							'options' => $checkboxes,
							'noDefault' => true
						], id: 'content_field_' . $field->_id );
						break;

					case 'YesNo':
					case 'Checkbox':
						$options[ $field->_id ] = $field->_title;
						$toggles[ $field->_id ] = ['content_field_' . $field->_id ];
						$toggleFields[] = new Radio( 'content_field_' . $field->_id, $this->data[ 'field_' . $field->_id ] ?? null, null, [
							'options' => [
								-1 => 'any',
								0 => 'no',
								1 => 'yes'
							]
						], id: 'content_field_' . $field->_id );
						break;
				}
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
			$form->add( $formField );
		}
	}

	/**
	 * Format the values for storage when the form is saved
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
	 * Determines if the specified item matches the required criteria
	 *
	 * @param Item $item
	 * @return bool
	 */
	public function isMatch( Item $item ): bool
	{
		if( empty( $this->data['field'] ) )
		{
			return false;
		}

		try
		{
			$row = Db::i()->select( '*', 'cms_database_fields', [ 'field_id=?', $this->data['field'] ] )->first();

			/* @var Fields $fieldClass */
			$fieldClass = 'IPS\cms\Fields' . $row['field_database_id'];
			$field = $fieldClass::constructFromData( $row );
			$column = 'field_' . $field->_id;

			if( empty( $this->data['field_' . $field->_id ] ) )
			{
				return empty( $item->$column );
			}

			if( is_array( $this->data['field_' . $field->_id ] ) )
			{
				$recordValue = $item->$column ? explode( ",", $item->$column ) : [];
				return (bool) ( count( array_intersect( $this->data['field_' . $field->_id ], $recordValue ) ) );
			}

			if( $this->data['field_' . $field->_id ] )
			{
				return (bool) $item->$column;
			}
		}
		catch( UnderflowException ){}

		return false;
	}
}