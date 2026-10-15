<?php

namespace IPS\cms\extensions\core\UIItem;

use IPS\Content\Item as BaseItem;
use IPS\Db;
use IPS\Helpers\Table\Content;
use IPS\Output\UI\Item as UIItem;
use UnderflowException;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * @brief	Content UI extension: TableHelper
 */
class TableHelper extends UIItem
{
	/**
	 * @brief	Class to extend
	 */
	 public static ?string $class = 'IPS\cms\Records';

	/**
	 * Return the sort direction for the selected sort option,
	 * or NULL to use the default parent method.
	 *
	 * @note $item will ALWAYS be null.
	 *
	 * @param BaseItem|null $item
	 * @param Content $table
	 * @param string $sortBy
	 * @return string|null
	 */
	public function contentTableSortDirection( ?BaseItem $item, Content $table, string $sortBy ) : string|null
	{
		$fieldId = null;
		if( array_key_exists( $sortBy, $table->sortOptions ) and str_starts_with( $sortBy, 'field_' ) )
		{
			$fieldId = mb_substr( $sortBy, 6 );
		}
		elseif( in_array( $sortBy, $table->sortOptions ) and $fieldName = array_search( $sortBy, $table->sortOptions ) )
		{
			if( str_starts_with( $fieldName, 'field_' ) )
			{
				$fieldId = mb_substr( $fieldName, 6 );
			}
		}

		if( $fieldId !== null )
		{
			/* We can't easily access the database ID from here, so just pull the row directly from the table */
			try
			{
				$fieldRow = Db::i()->select( '*', 'cms_database_fields', [ 'field_id=?', $fieldId ] )->first();
				if( in_array( $fieldRow['field_type'], [ 'Number', 'DateRange', 'Date' ] ) )
				{
					return 'asc';
				}
			}
			catch( UnderflowException ){}
		}

		return null;
	}
}